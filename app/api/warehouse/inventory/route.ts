import { NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server-simple"
import { requireRbacPermission, writeAuditLog } from "@/lib/rbac"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  const permission = await requireRbacPermission(request, "warehouse.view")
  if ("response" in permission) return permission.response
  const context = permission.context
  let query = supabaseServer.from("products").select("id, name, product_code, barcode, category, stock_available, stock_total, is_active, franchise_id").order("name").limit(500)
  if (!context.user.is_super_admin && context.user.franchise_id) query = query.eq("franchise_id", context.user.franchise_id)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data: data || [] })
}

export async function PATCH(request: NextRequest) {
  const permission = await requireRbacPermission(request, "warehouse.update")
  if ("response" in permission) return permission.response
  const context = permission.context
  const body = await request.json().catch(() => ({}))
  const productId = typeof body.product_id === "string" ? body.product_id : ""
  const stock = Number(body.stock_available)
  if (!productId || !Number.isInteger(stock) || stock < 0) return NextResponse.json({ error: "product_id and a non-negative integer stock_available are required" }, { status: 400 })

  let lookup = supabaseServer.from("products").select("id, franchise_id, stock_available").eq("id", productId).single()
  const { data: product, error: lookupError } = await lookup
  if (lookupError || !product) return NextResponse.json({ error: "Product not found" }, { status: 404 })
  if (!context.user.is_super_admin && product.franchise_id !== context.user.franchise_id) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const { data, error } = await supabaseServer.from("products").update({ stock_available: stock, updated_at: new Date().toISOString() }).eq("id", productId).select("id, name, stock_available, stock_total").single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await writeAuditLog(request, context, { module: "warehouse", action: "edit", resourceType: "product", resourceId: productId, metadata: { previous_stock: product.stock_available, stock_available: stock } })
  return NextResponse.json({ success: true, data })
}
