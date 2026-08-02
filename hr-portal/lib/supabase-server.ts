import { createClient } from "@supabase/supabase-js"

// Server-side client using the service role key. Points at the SAME Supabase
// project as the main CRM — there are no HR-portal-specific tables; this app
// reads/writes the CRM's existing employee_profiles, attendance_records,
// leave_requests, leave_types, and payroll_records tables directly.
export const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)
