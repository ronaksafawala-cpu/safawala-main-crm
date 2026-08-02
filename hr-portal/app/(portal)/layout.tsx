import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { Sidebar } from "@/components/sidebar"

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = getCurrentUser()
  if (!user) redirect("/login")

  return (
    <div className="flex min-h-screen bg-[#F8F7FA]">
      <Sidebar user={user} />
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  )
}
