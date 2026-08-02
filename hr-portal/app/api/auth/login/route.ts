import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { supabaseServer } from "@/lib/supabase-server"
import { isHrAuthorized, sessionCookieName, type HrSessionUser } from "@/lib/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 })
    }

    // Same Supabase Auth users as the Main CRM — this app never creates its own
    // account store, it only decides who is allowed through the door.
    const authClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data: signInData, error: signInError } = await authClient.auth.signInWithPassword({ email, password })
    if (signInError || !signInData?.user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabaseServer
      .from("users")
      .select("id, email, name, role, hr_role, franchise_id, is_active")
      .ilike("email", email)
      .eq("is_active", true)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: "Account is inactive or missing profile" }, { status: 401 })
    }

    if (!isHrAuthorized(profile)) {
      return NextResponse.json(
        { error: "Unauthorized Access — this account does not have HR Portal access." },
        { status: 403 }
      )
    }

    const sessionUser: HrSessionUser = {
      id: profile.id,
      email: profile.email,
      name: profile.name || profile.email,
      hr_role: profile.hr_role,
      is_super_admin: profile.role === "super_admin",
      franchise_id: profile.franchise_id,
    }

    const res = NextResponse.json({ success: true, user: sessionUser })
    res.cookies.set(sessionCookieName(), JSON.stringify(sessionUser), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    })
    return res
  } catch (error) {
    console.error("[HR Portal] Login error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
