'use client'
import { PageHeader } from '@/components/franchise/shared/page-header'
import { RowSkeleton } from '@/components/franchise/shared/skeleton'
import { ErrorCard } from '@/components/franchise/shared/error-card'
import { EmptyState } from '@/components/franchise/shared/empty-state'
import { useSafeData } from '@/lib/franchise/hooks'

// TODO: Replace stub with full  implementation
export default function FranchisePage() {
  const { data, loading, error, refetch } = useSafeData<any[]>('/api/quotes')
  const items = data || []
  return (
    <div className="p-5 lg:p-7 max-w-7xl mx-auto">
      <PageHeader
        title=""
        breadcrumbs={[{ label: 'Dashboard', href: '/franchise-dashboard' }, { label: '' }]}
      />
      <div className="bg-white rounded-xl border border-[#e4e7ef] overflow-hidden mt-5">
        {loading && <RowSkeleton count={6} />}
        {!loading && error && <div className="p-6"><ErrorCard message={error} onRetry={refetch} /></div>}
        {!loading && !error && items.length === 0 && (
          <EmptyState title="No quotes data yet" description="Data will appear here once available." />
        )}
        {!loading && !error && items.length > 0 && (
          <div className="p-4 text-sm text-[#9ca3af]">
            {items.length} record(s) — full UI coming soon
          </div>
        )}
      </div>
    </div>
  )
}
