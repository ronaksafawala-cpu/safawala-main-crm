'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useSafeData, useDebounce } from '@/lib/franchise/hooks'
import { PageHeader } from '@/components/franchise/shared/page-header'
import { ErrorCard } from '@/components/franchise/shared/error-card'
import { EmptyState } from '@/components/franchise/shared/empty-state'
import { RowSkeleton } from '@/components/franchise/shared/skeleton'
import { Users, Search, Plus, ChevronRight, Phone, MessageSquare } from 'lucide-react'

function getInitials(name: string) {
  const parts = (name || 'U').trim().split(' ')
  return parts.length >= 2 ? (parts[0][0] + parts[parts.length-1][0]).toUpperCase() : parts[0].substring(0,2).toUpperCase()
}

const AVATAR_COLORS = ['bg-blue-500','bg-purple-500','bg-green-500','bg-orange-500','bg-pink-500','bg-teal-500','bg-indigo-500']
function avatarColor(id: string) {
  let hash = 0
  for (const c of (id || '')) hash = (hash << 5) - hash + c.charCodeAt(0)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export default function FranchiseCustomersPage() {
  const [searchRaw, setSearchRaw] = useState('')
  const search = useDebounce(searchRaw, 350)
  const [newDialog, setNewDialog] = useState(false)

  const url = search.trim()
    ? `/api/customers?search=${encodeURIComponent(search)}`
    : '/api/customers'

  const { data, loading, error, refetch } = useSafeData<any[]>(url)
  const customers = data || []

  return (
    <div className="p-5 lg:p-7 max-w-7xl mx-auto">
      <PageHeader
        title="Customers"
        subtitle={`${customers.length} customer${customers.length !== 1 ? 's' : ''} in your franchise`}
        icon={Users}
        breadcrumbs={[{ label: 'Dashboard', href: '/franchise-dashboard' }, { label: 'Customers' }]}
        action={
          <Link
            href="/customers/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#d4a017] hover:bg-[#b8891a] text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <Plus className="h-4 w-4" /> Add Customer
          </Link>
        }
      />

      {/* Search */}
      <div className="flex items-center gap-2 bg-white border border-[#e4e7ef] rounded-xl px-3 py-2.5 max-w-md mb-5">
        <Search className="h-4 w-4 text-[#9ca3af] shrink-0" />
        <input
          type="text"
          placeholder="Search by name, phone, city…"
          value={searchRaw}
          onChange={e => setSearchRaw(e.target.value)}
          className="flex-1 bg-transparent text-sm text-[#0f1117] placeholder:text-[#9ca3af] outline-none"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#e4e7ef] overflow-hidden">
        {/* Header */}
        <div className="hidden sm:grid grid-cols-[2.5fr_1.5fr_1fr_1fr_40px] gap-4 px-4 py-2.5 bg-[#f8f9fc] border-b border-[#e4e7ef] text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider">
          <span>Customer</span>
          <span>Phone</span>
          <span>City</span>
          <span>KYC</span>
          <span />
        </div>

        {loading && <RowSkeleton count={8} />}

        {!loading && error && (
          <div className="p-6"><ErrorCard message={error} onRetry={refetch} /></div>
        )}

        {!loading && !error && customers.length === 0 && (
          <EmptyState
            icon={Users}
            title={searchRaw ? 'No customers found' : 'No customers yet'}
            description={searchRaw ? `Try a different search term` : 'Add your first customer to get started'}
            action={!searchRaw ? { label: '+ Add Customer', onClick: () => window.location.href = '/customers/new' } : undefined}
          />
        )}

        {!loading && !error && customers.map((c: any) => (
          <div
            key={c.id}
            className="grid grid-cols-[2.5fr_1.5fr_1fr_1fr_40px] gap-4 items-center px-4 py-3.5 border-b border-[#f1f3f7] last:border-0 hover:bg-[#f8f9fc] transition-colors group"
          >
            {/* Name + avatar */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`w-8 h-8 rounded-full ${avatarColor(c.id)} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                {getInitials(c.name)}
              </div>
              <div className="min-w-0">
                <Link
                  href={`/franchise-dashboard/customers/${c.id}`}
                  className="text-sm font-medium text-[#0f1117] hover:text-[#d4a017] truncate block transition-colors"
                >
                  {c.name}
                </Link>
                {c.email && <p className="text-xs text-[#9ca3af] truncate">{c.email}</p>}
              </div>
            </div>

            {/* Phone with quick action */}
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm text-[#4b5563] truncate">{c.phone || '—'}</span>
              {c.phone && (
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a href={`tel:${c.phone}`} className="p-1 rounded-md bg-green-50 text-green-600 hover:bg-green-100">
                    <Phone className="h-3 w-3" />
                  </a>
                  <a href={`https://wa.me/${c.whatsapp || c.phone}`.replace(/[^0-9+]/g, '')} target="_blank" rel="noreferrer"
                    className="p-1 rounded-md bg-green-50 text-green-600 hover:bg-green-100">
                    <MessageSquare className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>

            {/* City */}
            <p className="text-sm text-[#4b5563] truncate">{c.city || '—'}</p>

            {/* KYC */}
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border
              ${c.kyc_status === 'verified' ? 'bg-green-50 text-green-700 border-green-200'
              : c.kyc_status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
              : 'bg-gray-50 text-gray-500 border-gray-200'}`}
            >
              {c.kyc_status || 'None'}
            </span>

            {/* Arrow */}
            <Link href={`/franchise-dashboard/customers/${c.id}`}>
              <ChevronRight className="h-4 w-4 text-[#d1d5e0] group-hover:text-[#9ca3af]" />
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}
