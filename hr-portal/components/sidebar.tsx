"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LayoutDashboard, Users, CalendarCheck, LogOut } from "lucide-react"
import { toast } from "sonner"
import type { HrSessionUser } from "@/lib/auth"

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/employees", label: "Employees", icon: Users },
  { href: "/attendance", label: "Attendance", icon: CalendarCheck },
]

export function Sidebar({ user }: { user: HrSessionUser }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" })
    toast.success("Logged out")
    router.push("/login")
    router.refresh()
  }

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-[#E5DFE8] bg-white">
      <div className="flex items-center gap-3 border-b border-[#E5DFE8] px-6 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#4A1F5E] text-lg font-bold text-white">H</div>
        <div>
          <p className="text-sm font-semibold text-[#1F1B24]">HR Portal</p>
          <p className="text-xs text-[#8C8492]">SafaWala</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                active ? "bg-[#F1EAF5] text-[#4A1F5E]" : "text-[#6F6878] hover:bg-[#F8F7FA]"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-[#E5DFE8] px-4 py-4">
        <div className="mb-3 flex items-center gap-3 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F1EAF5] text-sm font-semibold text-[#4A1F5E]">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[#1F1B24]">{user.name}</p>
            <p className="truncate text-xs text-[#8C8492]">{user.hr_role?.replace("_", " ") || "Super Admin"}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-[#6F6878] hover:bg-[#F8F7FA]"
        >
          <LogOut className="h-4 w-4" /> Log out
        </button>
      </div>
    </aside>
  )
}
