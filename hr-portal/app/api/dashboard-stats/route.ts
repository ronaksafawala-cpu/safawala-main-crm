import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { supabaseServer } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  const user = getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const today = new Date().toISOString().slice(0, 10)
  const monthStart = `${today.slice(0, 7)}-01`

  const [employeesRes, presentTodayRes, pendingLeaveRes, payrollRes] = await Promise.all([
    supabaseServer.from("users").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabaseServer.from("attendance_records").select("id", { count: "exact", head: true }).eq("date", today).eq("status", "present"),
    supabaseServer.from("leave_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabaseServer.from("payroll_records").select("net_salary").gte("payroll_month", monthStart),
  ])

  const payrollTotal = (payrollRes.data ?? []).reduce((sum, r: { net_salary: number | null }) => sum + (Number(r.net_salary) || 0), 0)

  return NextResponse.json({
    totalEmployees: employeesRes.count ?? 0,
    presentToday: presentTodayRes.count ?? 0,
    pendingLeaveRequests: pendingLeaveRes.count ?? 0,
    payrollThisMonth: payrollTotal,
  })
}
