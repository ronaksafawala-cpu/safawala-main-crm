# HR Portal

Standalone HR management system for SafaWala staff — a separate Next.js app
from the Main CRM, deployed independently, sharing the same Supabase
database (no duplicate tables; both apps read/write `users`,
`employee_profiles`, `attendance_records`, `leave_requests`, `leave_types`,
and `payroll_records` directly).

## Access

Only accounts with `users.hr_role` set (`hr_manager`, `hr_executive`,
`recruiter`, `payroll_staff`) or `role = 'super_admin'` can log in. Everyone
else gets "Unauthorized Access."

## Modules

Built: Dashboard, Employee Management, Attendance.
Planned next: Leave Management, Payroll, Recruitment, Candidates,
Performance, Documents, HR Reports, Holidays, Announcements, Settings.

## Local development

```bash
cp .env.local.example .env.local   # fill in Supabase URL/anon key/service role key
pnpm install
pnpm dev -- --port 3001
```

## Environment variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only, used by API routes)
