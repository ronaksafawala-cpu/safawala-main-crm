"use client"

import { useEffect, useState } from "react"
import { Search, Loader2 } from "lucide-react"

interface Employee {
  id: string
  name: string
  email: string
  phone: string | null
  role: string
  department: string | null
  is_active: boolean
  employee_profiles: { employee_id: string | null; designation: string | null; employment_type: string | null }[] | null
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true)
      fetch(`/api/employees?search=${encodeURIComponent(search)}`)
        .then((r) => r.json())
        .then((d) => setEmployees(d.data ?? []))
        .finally(() => setLoading(false))
    }, 250)
    return () => clearTimeout(t)
  }, [search])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#1F1B24]">Employees</h1>
          <p className="mt-1 text-sm text-[#6F6878]">{employees.length} staff on record</p>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8C8492]" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="w-full rounded-xl border border-[#E5DFE8] bg-white py-2.5 pl-9 pr-4 text-sm outline-none focus:border-[#4A1F5E]"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#E5DFE8] bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[#E5DFE8] bg-[#F8F7FA] text-xs uppercase tracking-wide text-[#8C8492]">
            <tr>
              <th className="px-5 py-3 font-medium">Name</th>
              <th className="px-5 py-3 font-medium">Department</th>
              <th className="px-5 py-3 font-medium">Designation</th>
              <th className="px-5 py-3 font-medium">Contact</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1EAF5]">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-[#8C8492]">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                </td>
              </tr>
            ) : employees.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-[#8C8492]">
                  No employees found
                </td>
              </tr>
            ) : (
              employees.map((e) => (
                <tr key={e.id} className="hover:bg-[#F8F7FA]">
                  <td className="px-5 py-3">
                    <p className="font-medium text-[#1F1B24]">{e.name}</p>
                    <p className="text-xs text-[#8C8492]">{e.email}</p>
                  </td>
                  <td className="px-5 py-3 capitalize text-[#1F1B24]">{e.department || "—"}</td>
                  <td className="px-5 py-3 text-[#1F1B24]">{e.employee_profiles?.[0]?.designation || "—"}</td>
                  <td className="px-5 py-3 text-[#1F1B24]">{e.phone || "—"}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        e.is_active ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                      }`}
                    >
                      {e.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
