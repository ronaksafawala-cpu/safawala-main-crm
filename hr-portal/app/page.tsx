import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"

export default function RootPage() {
  redirect(getCurrentUser() ? "/dashboard" : "/login")
}
