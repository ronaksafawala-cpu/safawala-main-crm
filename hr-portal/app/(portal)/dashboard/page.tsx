"use client"

import { useEffect, useState } from "react"
import { Users, CalendarCheck, ClipboardList, Wallet } from "lucide-react"

interface Stats {
  totalEmployees: number
  presentToday: number
  pendingLeaveRequests: number
  payrollThisMonth: number
}

function fmtCurrency(n: number) {
  return `₹${n.toLocaleString("en-IN")}`
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/dashboard-stats")
      .then((r) => r.json())
      .then(setStats)
      .finally(() => setLoading(false))
  }, [])

  const cards = [
    { label: "Total Employees", value: stats?.totalEmployees, icon: Users, color: "#4A1F5E" },
    { label: "Present Today", value: stats?.presentToday, icon: CalendarCheck, color: "#22c55e" },
    { label: "Pending Leave Requests", value: stats?.pendingLeaveRequests, icon: ClipboardList, color: "#f59e0b" },
    { label: "Payroll This Month", value: stats ? fmtCurrency(stats.payrollThisMonth) : undefined, icon: Wallet, color: "#0891b2" },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#1F1B24]">Dashboard</h1>
        <p className="mt-1 text-sm text-[#6F6878]">Overview of your workforce, today.</p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-[#E5DFE8] bg-white p-5 shadow-sm">
            <div
              className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl"
              style={{ background: `${c.color}15` }}
            >
              <c.icon className="h-5 w-5" style={{ color: c.color }} />
            </div>
            <p className="text-sm text-[#6F6878]">{c.label}</p>
            <p className="mt-1 text-2xl font-semibold text-[#1F1B24]">
              {loading ? "…" : (c.value ?? 0)}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
