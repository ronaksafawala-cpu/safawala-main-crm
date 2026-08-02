"use client"

import { useEffect, useState, useCallback } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

interface Row {
  user_id: string
  name: string
  email: string
  department: string | null
  record: { status: string } | null
}

const STATUS_OPTIONS = [
  { value: "present", label: "Present", color: "#22c55e" },
  { value: "absent", label: "Absent", color: "#ef4444" },
  { value: "half_day", label: "Half Day", color: "#f59e0b" },
  { value: "leave", label: "Leave", color: "#6366f1" },
]

export default function AttendancePage() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    fetch(`/api/attendance?date=${date}`)
      .then((r) => r.json())
      .then((d) => setRows(d.data ?? []))
      .finally(() => setLoading(false))
  }, [date])

  useEffect(() => { load() }, [load])

  async function markStatus(user_id: string, status: string) {
    setSavingId(user_id)
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id, date, status }),
      })
      if (!res.ok) throw new Error((await res.json()).error || "Failed to save")
      toast.success("Attendance updated")
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save")
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#1F1B24]">Attendance</h1>
          <p className="mt-1 text-sm text-[#6F6878]">Mark and review daily attendance.</p>
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-xl border border-[#E5DFE8] bg-white px-4 py-2 text-sm outline-none focus:border-[#4A1F5E]"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#E5DFE8] bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[#E5DFE8] bg-[#F8F7FA] text-xs uppercase tracking-wide text-[#8C8492]">
            <tr>
              <th className="px-5 py-3 font-medium">Employee</th>
              <th className="px-5 py-3 font-medium">Department</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1EAF5]">
            {loading ? (
              <tr>
                <td colSpan={3} className="px-5 py-10 text-center text-[#8C8492]">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-5 py-10 text-center text-[#8C8492]">No employees found</td>
              </tr>
            ) : (
              rows.map((row) => {
                const current = row.record?.status
                return (
                  <tr key={row.user_id} className="hover:bg-[#F8F7FA]">
                    <td className="px-5 py-3">
                      <p className="font-medium text-[#1F1B24]">{row.name}</p>
                      <p className="text-xs text-[#8C8492]">{row.email}</p>
                    </td>
                    <td className="px-5 py-3 capitalize text-[#1F1B24]">{row.department || "—"}</td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {STATUS_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            disabled={savingId === row.user_id}
                            onClick={() => markStatus(row.user_id, opt.value)}
                            className="rounded-full px-3 py-1 text-xs font-semibold transition disabled:opacity-50"
                            style={{
                              background: current === opt.value ? opt.color : `${opt.color}15`,
                              color: current === opt.value ? "white" : opt.color,
                            }}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
