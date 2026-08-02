import type { AuthenticatedUser } from "@/lib/auth-middleware"

/**
 * HR staff (role='staff', department='hr') need to manage employees,
 * attendance, and leave for their franchise — but the CRM's generic role
 * hierarchy only grants that to franchise_admin/super_admin. Widening
 * minRole to franchise_admin for those endpoints would let ANY HR staff
 * account act like a franchise admin everywhere; changing their `role`
 * column to franchise_admin would break the department-portal boundary
 * (franchise_admin is allowed into every department portal). This check is
 * scoped to exactly the HR actions that need it, without either tradeoff.
 */
export function isHrOrFranchiseAdmin(user: AuthenticatedUser): boolean {
  if (user.is_super_admin || user.role === "franchise_admin") return true
  return user.role === "staff" && user.department === "hr"
}
