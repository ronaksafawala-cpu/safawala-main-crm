import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { supabaseServer } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  const user = getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const date = request.nextUrl.searchParams.get("date") || new Date().toISOString().slice(0, 10)

  const [{ data: records, error: recError }, { data: employees, error: empError }] = await Promise.all([
    supabaseServer.from("attendance_records").select("*").eq("date", date),
    supabaseServer.from("users").select("id, name, email, department").eq("is_active", true).order("name"),
  ])

  if (recError) return NextResponse.json({ error: recError.message }, { status: 500 })
  if (empError) return NextResponse.json({ error: empError.message }, { status: 500 })

  const byUser = new Map((records ?? []).map((r: { user_id: string }) => [r.user_id, r]))
  const merged = (employees ?? []).map((e: { id: string; name: string; email: string; department: string | null }) => ({
    user_id: e.id,
    name: e.name,
    email: e.email,
    department: e.department,
    record: byUser.get(e.id) ?? null,
  }))

  return NextResponse.json({ date, data: merged })
}

export async function POST(request: NextRequest) {
  const user = getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await request.json()
    const { user_id, date, status = "present", notes } = body
    if (!user_id || !date) {
      return NextResponse.json({ error: "user_id and date are required" }, { status: 400 })
    }

    const { data: existing } = await supabaseServer
      .from("attendance_records")
      .select("id")
      .eq("user_id", user_id)
      .eq("date", date)
      .maybeSingle()

    if (existing) {
      const { data, error } = await supabaseServer
        .from("attendance_records")
        .update({ status, notes, approved_by: user.id, updated_at: new Date().toISOString() })
        .eq("id", existing.id)
        .select()
        .single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ data })
    }

    // attendance_records.franchise_id is NOT NULL — must be the target employee's own
    // franchise, not the HR staff member marking the attendance.
    const { data: employee, error: employeeError } = await supabaseServer
      .from("users")
      .select("franchise_id")
      .eq("id", user_id)
      .single()
    if (employeeError || !employee?.franchise_id) {
      return NextResponse.json({ error: "Could not resolve the employee's franchise" }, { status: 400 })
    }

    const { data, error } = await supabaseServer
      .from("attendance_records")
      .insert({ user_id, franchise_id: employee.franchise_id, date, status, notes, approved_by: user.id })
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to record attendance" }, { status: 500 })
  }
}
