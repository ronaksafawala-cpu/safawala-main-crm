import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { supabaseServer } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  const user = getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const search = request.nextUrl.searchParams.get("search") || ""

  let query = supabaseServer
    .from("users")
    .select(`
      id, name, email, phone, role, department, is_active, joining_date, salary,
      employee_profiles ( employee_id, designation, employment_type )
    `)
    .order("name", { ascending: true })
    .limit(300)

  if (search) query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data })
}
