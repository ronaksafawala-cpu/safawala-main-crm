'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useSafeData, useDebounce } from '@/lib/franchise/hooks'
import { PageHeader } from '@/components/franchise/shared/page-header'
import { ErrorCard } from '@/components/franchise/shared/error-card'
import { EmptyState } from '@/components/franchise/shared/empty-state'
import { RowSkeleton } from '@/components/franchise/shared/skeleton'
import { StatusBadge } from '@/components/franchise/shared/status-badge'
import { Calendar, Search, Plus, ChevronRight, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'

const STATUS_FILTERS = ['all', 'quote', 'confirmed', 'delivered', 'returned', 'overdue', 'completed', 'cancelled']

function formatINR(n: number) {
  return '₹' + (n || 0).toLocaleString('en-IN')
}

function formatDate(d: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function FranchiseBookingsPage() {
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchRaw, setSearchRaw] = useState('')
  const search = useDebounce(searchRaw, 350)

  const url = search.trim()
    ? `/api/bookings?search=${encodeURIComponent(search)}`
    : '/api/bookings'

  const { data, loading, error, refetch } = useSafeData<any[]>(url)

  const filtered = useMemo(() => {
    const list = data || []
    if (statusFilter === 'all') return list
    return list.filter((b: any) => b.status?.toLowerCase() === statusFilter)
  }, [data, statusFilter])

  return (
    <div className="p-5 lg:p-7 max-w-7xl mx-auto">
      <PageHeader
        title="Bookings"
        subtitle="Manage all customer bookings"
        icon={Calendar}
        breadcrumbs={[{ label: 'Dashboard', href: '/franchise-dashboard' }, { label: 'Bookings' }]}
        action={
          <Link
            href="/create-invoice"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#d4a017] hover:bg-[#b8891a] text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <Plus className="h-4 w-4" /> New Booking
          </Link>
        }
      />

      {/* Filters row */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        {/* Search */}
        <div className="flex items-center gap-2 bg-white border border-[#e4e7ef] rounded-xl px-3 py-2 flex-1 max-w-sm">
          <Search className="h-4 w-4 text-[#9ca3af] shrink-0" />
          <input
            type="text"
            placeholder="Search by name, booking #, phone…"
            value={searchRaw}
            onChange={e => setSearchRaw(e.target.value)}
            className="flex-1 bg-transparent text-sm text-[#0f1117] placeholder:text-[#9ca3af] outline-none"
          />
        </div>

        {/* Status pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {STATUS_FILTERS.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors',
                statusFilter === s
                  ? 'bg-[#0f1117] text-white'
                  : 'bg-white border border-[#e4e7ef] text-[#4b5563] hover:bg-[#f1f3f7]'
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl border border-[#e4e7ef] overflow-hidden">
        {/* Table header */}
        <div className="hidden sm:grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_40px] gap-4 px-4 py-2.5 bg-[#f8f9fc] border-b border-[#e4e7ef] text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider">
          <span>Customer</span>
          <span>Event Date</span>
          <span>Booking #</span>
          <span>Amount</span>
          <span>Status</span>
          <span />
        </div>

        {loading && <RowSkeleton count={8} />}

        {!loading && error && (
          <div className="p-6">
            <ErrorCard message={error} onRetry={refetch} />
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <EmptyState
            icon={Calendar}
            title="No bookings found"
            description={statusFilter !== 'all' ? `No ${statusFilter} bookings` : 'Create your first booking to get started'}
            action={{ label: '+ New Booking', onClick: () => window.location.href = '/create-invoice' }}
          />
        )}

        {!loading && !error && filtered.map((b: any) => (
          <Link
            key={b.id}
            href={`/franchise-dashboard/bookings/${b.id}`}
            className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_40px] gap-4 items-center px-4 py-3.5 border-b border-[#f1f3f7] last:border-0 hover:bg-[#f8f9fc] transition-colors group"
          >
            {/* Customer */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#fef9ee] border border-[#f5e0a0] flex items-center justify-center text-[#d4a017] text-xs font-bold shrink-0">
                {(b.customers?.name || b.customer_name || 'C').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#0f1117] truncate">
                  {b.customers?.name || b.customer_name || '—'}
                </p>
                <p className="text-xs text-[#9ca3af] truncate">
                  {b.customers?.phone || b.customer_phone || ''}
                </p>
              </div>
            </div>
            {/* Event date */}
            <p className="text-sm text-[#4b5563]">{formatDate(b.event_date)}</p>
            {/* Booking # */}
            <p className="text-xs font-mono text-[#9ca3af]">{b.booking_number || '—'}</p>
            {/* Amount */}
            <div>
              <p className="text-sm font-semibold text-[#0f1117]">{formatINR(b.total_amount)}</p>
              {(b.advance_paid > 0) && (
                <p className="text-[10px] text-[#9ca3af]">Paid: {formatINR(b.advance_paid)}</p>
              )}
            </div>
            {/* Status */}
            <StatusBadge status={b.status} />
            {/* Arrow */}
            <ChevronRight className="h-4 w-4 text-[#d1d5e0] group-hover:text-[#9ca3af] justify-self-end" />
          </Link>
        ))}
      </div>

      {!loading && filtered.length > 0 && (
        <p className="text-xs text-[#9ca3af] mt-3 text-right">
          Showing {filtered.length} booking{filtered.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}
