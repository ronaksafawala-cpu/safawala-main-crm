'use client'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { signOut } from '@/lib/auth'
import {
  LayoutDashboard, Calendar, Users, Package, Truck, FileText,
  Receipt, Shirt, ClipboardCheck, UserPlus, BarChart3,
  UserCheck, Settings, LogOut, ChevronLeft, ChevronRight,
  Sparkles, Bell
} from 'lucide-react'

const NAV_GROUPS = [
  {
    label: 'Core',
    items: [
      { label: 'Dashboard',       href: '/franchise-dashboard',              icon: LayoutDashboard },
      { label: 'Bookings',        href: '/franchise-dashboard/bookings',     icon: Calendar },
      { label: 'Customers',       href: '/franchise-dashboard/customers',    icon: Users },
      { label: 'Deliveries',      href: '/franchise-dashboard/deliveries',   icon: Truck },
    ],
  },
  {
    label: 'Business',
    items: [
      { label: 'Inventory',       href: '/franchise-dashboard/inventory',    icon: Package },
      { label: 'Quotes',          href: '/franchise-dashboard/quotes',       icon: FileText },
      { label: 'Expenses',        href: '/franchise-dashboard/expenses',     icon: Receipt },
      { label: 'Laundry',         href: '/franchise-dashboard/laundry',      icon: Shirt },
    ],
  },
  {
    label: 'Growth',
    items: [
      { label: 'Leads',           href: '/franchise-dashboard/leads',        icon: UserPlus },
      { label: 'Tasks',           href: '/franchise-dashboard/tasks',        icon: ClipboardCheck },
      { label: 'Reports',         href: '/franchise-dashboard/reports',      icon: BarChart3 },
    ],
  },
  {
    label: 'Admin',
    items: [
      { label: 'Staff',           href: '/franchise-dashboard/staff',        icon: UserCheck },
      { label: 'Settings',        href: '/franchise-dashboard/settings',     icon: Settings },
    ],
  },
]

function getInitials(name: string) {
  const parts = (name || 'U').trim().split(' ')
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : parts[0].substring(0, 2).toUpperCase()
}

export function FranchiseSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('safawala_user')
      if (raw) setUser(JSON.parse(raw))
    } catch {
      // ignore
    }
  }, [])

  const isActive = (href: string) =>
    href === '/franchise-dashboard'
      ? pathname === href
      : pathname === href || pathname.startsWith(href + '/')

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  return (
    <aside
      className={cn(
        'flex flex-col h-screen bg-white border-r border-[#e4e7ef] transition-all duration-200 shrink-0',
        collapsed ? 'w-[60px]' : 'w-[220px]'
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-[#e4e7ef] h-14 shrink-0">
        {!collapsed && (
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-[#d4a017] flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#0f1117] truncate">Safawala</p>
              <p className="text-[10px] text-[#9ca3af] truncate">Franchise Portal</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-7 h-7 rounded-lg bg-[#d4a017] flex items-center justify-center mx-auto">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
        )}
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="p-1 rounded-md text-[#9ca3af] hover:text-[#0f1117] hover:bg-[#f1f3f7] transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Collapsed expand button */}
      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="flex items-center justify-center py-2 text-[#9ca3af] hover:text-[#0f1117] hover:bg-[#f1f3f7] transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-0.5 px-2">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-3">
            {!collapsed && (
              <p className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider px-2 mb-1">
                {group.label}
              </p>
            )}
            {group.items.map((item) => {
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    'flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm font-medium transition-colors',
                    active
                      ? 'bg-[#fef9ee] text-[#d4a017] border border-[#f5e0a0]'
                      : 'text-[#4b5563] hover:bg-[#f8f9fc] hover:text-[#0f1117]'
                  )}
                >
                  <item.icon className={cn('h-4 w-4 shrink-0', active ? 'text-[#d4a017]' : 'text-[#9ca3af]')} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t border-[#e4e7ef] p-3 shrink-0">
        {!collapsed ? (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#d4a017] flex items-center justify-center text-white text-xs font-bold shrink-0">
              {getInitials(user?.name || 'U')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[#0f1117] truncate">{user?.name || 'User'}</p>
              <p className="text-[10px] text-[#9ca3af] truncate capitalize">
                {(user?.role || 'franchise_admin').replace(/_/g, ' ')}
              </p>
            </div>
            <button
              onClick={handleSignOut}
              title="Sign out"
              className="p-1 text-[#9ca3af] hover:text-red-500 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#d4a017] flex items-center justify-center text-white text-[10px] font-bold">
              {getInitials(user?.name || 'U')}
            </div>
            <button onClick={handleSignOut} className="text-[#9ca3af] hover:text-red-500 transition-colors">
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
