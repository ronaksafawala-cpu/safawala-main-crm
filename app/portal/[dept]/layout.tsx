import { redirect, notFound } from "next/navigation"
import { getPortalConfig } from "@/lib/portal-config"
import { authenticateRequest } from "@/lib/auth-middleware"
import { PortalMobileLayout } from "@/components/portal/portal-mobile-layout"

const DEPT_ALIASES: Record<string, string> = { bookings: "booking" }

/**
 * Server-side portal boundary. Client-side localStorage checks remain useful for
 * rendering, but this guard is the authoritative URL protection layer.
 */
export default async function PortalLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { dept: string }
}) {
  const rawDept = params.dept
  const dept = DEPT_ALIASES[rawDept] || rawDept
  if (rawDept !== dept) redirect(`/portal/${dept}`)

  const config = getPortalConfig(dept)
  if (!config) notFound()

  const request = new Request("http://localhost/portal/" + dept) as any
  // authenticateRequest reads the real Next cookies through next/headers.
  const auth = await authenticateRequest(request)
  if (!auth.authorized || !auth.user) redirect(`/auth/login?redirect=/portal/${dept}`)

  const user = auth.user
  const isWarehouseByDepartment = dept === "warehouse" && user.department === "warehouse" && user.role === "staff"
  const isQcByDepartment = dept === "qc" && user.department === "qc" && (user.role === "staff" || user.role === "qc_staff")
  const isDeliveryByDepartment = dept === "delivery" && user.department === "delivery" && (user.role === "staff" || user.role === "delivery_staff")
  const roleAllowed = user.is_super_admin || config.allowedRoles.includes(user.role) || isWarehouseByDepartment || isQcByDepartment || isDeliveryByDepartment
  if (!roleAllowed) {
    if (user.role === "franchise_admin") {
      redirect("/dashboard")
    }
    const target = user.department ? (DEPT_ALIASES[user.department] || user.department) : "dashboard"
    redirect(target === "dashboard" ? "/dashboard" : `/portal/${target}`)
  }

  return <PortalMobileLayout config={config}>{children}</PortalMobileLayout>
}
