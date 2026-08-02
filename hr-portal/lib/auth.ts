import { cookies } from "next/headers"

export const HR_ROLES = ["hr_manager", "hr_executive", "recruiter", "payroll_staff"] as const
export type HrRole = (typeof HR_ROLES)[number]

export interface HrSessionUser {
  id: string
  email: string
  name: string
  hr_role: HrRole | null
  is_super_admin: boolean
  franchise_id: string | null
}

const COOKIE_NAME = "hr_portal_session"

export function sessionCookieName() {
  return COOKIE_NAME
}

/** Server-side only: read the current HR Portal session from the request cookie. */
export function getCurrentUser(): HrSessionUser | null {
  try {
    const raw = cookies().get(COOKIE_NAME)?.value
    if (!raw) return null
    return JSON.parse(raw) as HrSessionUser
  } catch {
    return null
  }
}

/** True only for accounts allowed into the HR Portal: an hr_role, or super_admin for oversight. */
export function isHrAuthorized(user: { hr_role?: string | null; role?: string | null }): boolean {
  if (user.role === "super_admin") return true
  return !!user.hr_role && (HR_ROLES as readonly string[]).includes(user.hr_role)
}
