"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Login failed")
      toast.success(`Welcome, ${data.user.name}`)
      router.push(searchParams.get("redirect") || "/dashboard")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8F7FA] px-4">
      <div className="w-full max-w-sm rounded-3xl border border-[#E5DFE8] bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#4A1F5E] text-2xl font-bold text-white">
            H
          </div>
          <h1 className="text-2xl font-semibold text-[#1F1B24]">HR Portal</h1>
          <p className="mt-1 text-sm text-[#6F6878]">SafaWala HR Management System</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{error}</div>
          )}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#8C8492]">
              Email address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@safawala.com"
              className="w-full rounded-xl border border-[#E5DFE8] px-4 py-2.5 text-sm outline-none focus:border-[#4A1F5E]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#8C8492]">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full rounded-xl border border-[#E5DFE8] px-4 py-2.5 text-sm outline-none focus:border-[#4A1F5E]"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#4A1F5E] py-3 text-sm font-semibold text-white transition hover:bg-[#5C2A72] disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
        <p className="mt-6 text-center text-xs text-[#8C8492]">
          Only HR staff accounts can access this portal.
        </p>
      </div>
    </div>
  )
}
