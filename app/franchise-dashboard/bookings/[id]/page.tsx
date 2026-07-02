'use client'
import { use } from 'react'
import Link from 'next/link'
import { useSafeData } from '@/lib/franchise/hooks'
import { PageHeader } from '@/components/franchise/shared/page-header'
import { ErrorCard } from '@/components/franchise/shared/error-card'
import { StatusBadge } from '@/components/franchise/shared/status-badge'
import { PageSkeleton } from '@/components/franchise/shared/skeleton'
import {
  Calendar, User, Phone, MapPin, Package, DollarSign,
  Truck, RotateCcw, FileText, ArrowLeft
} from 'lucide-react'

function formatINR(n: number) { return '₹' + (n||0).toLocaleString('en-IN') }
function formatDate(d: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'long', year:'numeric' })
}

function InfoRow({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-4 py-2.5 border-b border-[#f1f3f7] last:border-0">
      <span className="text-xs font-medium text-[#9ca3af] uppercase tracking-wide sm:w-36 shrink-0">{label}</span>
      <span className={`text-sm text-[#0f1117] ${className || ''}`}>{value}</span>
    </div>
  )
}

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-[#e4e7ef] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#e4e7ef] bg-[#f8f9fc]">
        <Icon className="h-4 w-4 text-[#9ca3af]" />
        <h3 className="text-sm font-semibold text-[#0f1117]">{title}</h3>
      </div>
      <div className="px-4 py-1">{children}</div>
    </div>
  )
}

export default function FranchiseBookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: booking, loading, error, refetch } = useSafeData<any>(`/api/bookings/${id}`)

  if (loading) return <PageSkeleton />

  if (error) {
    return (
      <div className="p-5 lg:p-7 max-w-4xl mx-auto">
        <Link href="/franchise-dashboard/bookings" className="flex items-center gap-1.5 text-sm text-[#9ca3af] hover:text-[#0f1117] mb-4 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Bookings
        </Link>
        <ErrorCard message={error} onRetry={refetch} />
      </div>
    )
  }

  if (!booking) return null

  const b = booking
  const customer = b.customers || {}
  const items = b.booking_items || b.items || []
  const payments = b.payments || []
  const totalPaid = payments.reduce((s: number, p: any) => s + (p.amount || 0), 0) // any: payments API shape
  const balance = (b.total_amount || 0) - totalPaid

  return (
    <div className="p-5 lg:p-7 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/franchise-dashboard/bookings"
          className="flex items-center gap-1.5 text-sm text-[#9ca3af] hover:text-[#0f1117] transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <PageHeader
          title={b.booking_number || 'Booking Detail'}
          subtitle={`Created ${formatDate(b.created_at)}`}
          icon={Calendar}
          action={<StatusBadge status={b.status} className="text-sm px-3 py-1" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2/3 */}
        <div className="lg:col-span-2 space-y-5">
          {/* Customer */}
          <Section title="Customer Information" icon={User}>
            <InfoRow label="Name" value={<span className="font-semibold">{customer.name || '—'}</span>} />
            <InfoRow label="Phone" value={
              customer.phone ? (
                <a href={`tel:${customer.phone}`} className="text-blue-600 hover:underline">{customer.phone}</a>
              ) : '—'
            } />
            <InfoRow label="Email" value={customer.email || '—'} />
            <InfoRow label="City" value={customer.city || '—'} />
          </Section>

          {/* Booking */}
          <Section title="Booking Details" icon={Calendar}>
            <InfoRow label="Event Date" value={<span className="font-semibold text-[#d4a017]">{formatDate(b.event_date)}</span>} />
            <InfoRow label="Event Type" value={b.event_type || b.occasion || '—'} />
            <InfoRow label="Delivery Date" value={formatDate(b.delivery_date)} />
            <InfoRow label="Return Date" value={formatDate(b.return_date)} />
            {b.notes && <InfoRow label="Notes" value={b.notes} />}
          </Section>

          {/* Items */}
          {items.length > 0 && (
            <Section title={`Items (${items.length})`} icon={Package}>
              <div className="divide-y divide-[#f1f3f7]">
                {items.map((item: any, i: number) => ( // any: booking_items API shape
                  <div key={item.id || i} className="flex items-center gap-3 py-3">
                    <div className="w-9 h-9 rounded-lg bg-[#f1f3f7] flex items-center justify-center shrink-0">
                      <Package className="h-4 w-4 text-[#9ca3af]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#0f1117] truncate">
                        {item.products?.name || item.product_name || item.name || 'Item'}
                      </p>
                      {item.barcode && <p className="text-[10px] text-[#9ca3af] font-mono">{item.barcode}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-[#0f1117]">{formatINR(item.price || item.rate || 0)}</p>
                      <p className="text-xs text-[#9ca3af]">Qty: {item.quantity || 1}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>

        {/* Right 1/3 */}
        <div className="space-y-5">
          {/* Payment summary */}
          <div className="bg-white rounded-xl border border-[#e4e7ef] p-5">
            <h3 className="text-sm font-semibold text-[#0f1117] mb-4 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-[#9ca3af]" /> Payment Summary
            </h3>
            <div className="space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-[#9ca3af]">Subtotal</span>
                <span className="font-medium">{formatINR(b.subtotal || b.total_amount)}</span>
              </div>
              {(b.discount || b.discount_amount) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-[#9ca3af]">Discount</span>
                  <span className="text-green-600">-{formatINR(b.discount || b.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm border-t border-[#e4e7ef] pt-2 font-semibold">
                <span>Total</span>
                <span>{formatINR(b.total_amount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#9ca3af]">Paid</span>
                <span className="text-green-600 font-medium">{formatINR(totalPaid || b.advance_paid || 0)}</span>
              </div>
              {balance > 0 && (
                <div className="flex justify-between text-sm bg-red-50 rounded-lg px-3 py-2 mt-2">
                  <span className="text-red-700 font-semibold">Balance Due</span>
                  <span className="text-red-700 font-bold">{formatINR(balance)}</span>
                </div>
              )}
              {balance <= 0 && (
                <div className="flex justify-between text-sm bg-green-50 rounded-lg px-3 py-2 mt-2">
                  <span className="text-green-700 font-semibold">Fully Paid ✓</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick actions */}
          <div className="bg-white rounded-xl border border-[#e4e7ef] p-4">
            <h3 className="text-xs font-semibold text-[#9ca3af] uppercase tracking-wide mb-3">Actions</h3>
            <div className="space-y-2">
              <Link href={`/bookings/${id}`}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#f8f9fc] hover:bg-[#f1f3f7] text-sm text-[#0f1117] transition-colors">
                <FileText className="h-4 w-4 text-[#9ca3af]" />
                Open Full Details
              </Link>
              {customer.phone && (
                <a href={`https://wa.me/${customer.whatsapp || customer.phone}`.replace(/[^0-9+]/g,'')}
                  target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 hover:bg-green-100 text-sm text-green-700 transition-colors">
                  <Phone className="h-4 w-4" /> WhatsApp Customer
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
