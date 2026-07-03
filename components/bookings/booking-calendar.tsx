"use client"

import * as React from "react"
import { Calendar } from "@/components/ui/calendar"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { format, isBefore, startOfDay } from "date-fns"
import { Search, CalendarIcon, Package, Eye, Wrench, Lock, Trash2, User, MapPin, Loader2, Scissors } from "lucide-react"
import { ItemsDisplayDialog, ItemsSelectionDialog, CompactItemsDisplayDialog } from "@/components/shared"
import type { SelectedItem } from "@/components/shared/types/items"
import { PincodeService } from "@/lib/pincode-service"
import { useToast } from "@/hooks/use-toast"

interface BookingData {
  id: string
  booking_number: string
  customer_name: string
  customer_phone: string
  event_date: string
  delivery_date: string
  return_date: string
  modification_date?: string
  modification_time?: string
  modifications_details?: string
  has_modifications?: boolean
  event_type: string
  venue_name: string
  venue_address: string
  area_name?: string
  total_amount: number
  paid_amount?: number
  status: string
  assigned_staff_name?: string
  total_safas?: number
  booking_items: {
    product_name: string
    quantity: number
  }[]
  customer: {
    name: string
    city: string
    address: string
  }
}

interface BookingCalendarProps {
  franchiseId?: string
  compact?: boolean
  mini?: boolean // ultra-compact size
  onViewDetails?: (booking: any) => void
}

export function BookingCalendar({ franchiseId, compact = false, mini = false, onViewDetails }: BookingCalendarProps) {
  const { toast } = useToast()
  const [selectedDate, setSelectedDate] = React.useState<Date>()
  const [showDateDetails, setShowDateDetails] = React.useState(false)
  const [bookings, setBookings] = React.useState<BookingData[]>([])
  const [dateBookings, setDateBookings] = React.useState<BookingData[]>([])
  const [lockedDates, setLockedDates] = React.useState<string[]>([])
  const [lockedDateObjects, setLockedDateObjects] = React.useState<any[]>([])
  const [deletingLockId, setDeletingLockId] = React.useState<string | null>(null)
  const [userRole, setUserRole] = React.useState<string>("")
  const [modificationBookings, setModificationBookings] = React.useState<BookingData[]>([])
  const [activeTab, setActiveTab] = React.useState<'events' | 'modifications' | 'locked'>('events')
  const [loading, setLoading] = React.useState(true)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [currentMonth, setCurrentMonth] = React.useState<Date>(new Date())
  const [selectedCalendarBooking, setSelectedCalendarBooking] = React.useState<BookingData | null>(null)
  
  // Items display dialog states - matching bookings page architecture
  const [showProductDialog, setShowProductDialog] = React.useState(false)
  const [productDialogBooking, setProductDialogBooking] = React.useState<BookingData | null>(null)
  const [productDialogType, setProductDialogType] = React.useState<'items' | 'pending'>('items')
  const [bookingItems, setBookingItems] = React.useState<Record<string, any[]>>({})
  const [itemsLoading, setItemsLoading] = React.useState<Record<string, boolean>>({})
  const [itemsError, setItemsError] = React.useState<Record<string, string>>({})
  
  // Product selection states
  const [showItemsSelection, setShowItemsSelection] = React.useState(false)
  const [currentBookingForItems, setCurrentBookingForItems] = React.useState<BookingData | null>(null)
  const [selectedItems, setSelectedItems] = React.useState<SelectedItem[]>([])
  
  // Product data states
  const [products, setProducts] = React.useState<any[]>([])
  const [packages, setPackages] = React.useState<any[]>([])
  const [categories, setCategories] = React.useState<any[]>([])
  const [subcategories, setSubcategories] = React.useState<any[]>([])

  React.useEffect(() => {
    const raw = localStorage.getItem("safawala_user")
    if (raw) { try { const u = JSON.parse(raw); setUserRole(u.role || "") } catch {} }
    fetchBookings()
    fetchProductsAndCategories()
    fetchLockedDates()
  }, [franchiseId])

  const fetchLockedDates = () => {
    fetch("/api/locked-dates")
      .then(r => r.json())
      .then(d => {
        if (d.data) {
          setLockedDates(d.data.map((ld: any) => ld.locked_date as string))
          setLockedDateObjects(d.data)
        }
      })
      .catch(() => {})
  }

  const handleUnlockDate = async (id: string) => {
    setDeletingLockId(id)
    try {
      const res = await fetch(`/api/locked-dates?id=${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed")
      setLockedDateObjects(prev => prev.filter(ld => ld.id !== id))
      setLockedDates(prev => {
        const removed = lockedDateObjects.find(ld => ld.id === id)
        return removed ? prev.filter(d => d !== removed.locked_date) : prev
      })
    } catch {} finally {
      setDeletingLockId(null)
    }
  }

  // Fetch products and categories for items selection
  const fetchProductsAndCategories = async () => {
    try {
      // Fetch products
      const productsRes = await fetch('/api/products', { cache: 'no-store' })
      if (productsRes.ok) {
        const data = await productsRes.json()
        setProducts(data.data || [])
      }

      // Fetch categories
      const categoriesRes = await fetch('/api/categories', { cache: 'no-store' })
      if (categoriesRes.ok) {
        const data = await categoriesRes.json()
        setCategories(data.data || [])
      }

      // Fetch subcategories
      const subcategoriesRes = await fetch('/api/subcategories', { cache: 'no-store' })
      if (subcategoriesRes.ok) {
        const data = await subcategoriesRes.json()
        setSubcategories(data.data || [])
      }

      // Fetch packages
      const packagesRes = await fetch('/api/packages', { cache: 'no-store' })
      if (packagesRes.ok) {
        const data = await packagesRes.json()
        setPackages(data.data || [])
      }
    } catch (error) {
      console.error('[Calendar] Error fetching products/categories:', error)
    }
  }

  // Helper to get payment status details
  const getPaymentStatus = (booking: BookingData) => {
    const totalAmount = booking.total_amount || 0
    const paidAmount = booking.paid_amount || 0
    const pendingAmount = Math.max(0, totalAmount - paidAmount)

    const isFullyPaid = paidAmount >= totalAmount
    const isUnpaid = paidAmount === 0
    const isPartiallyPaid = paidAmount > 0 && paidAmount < totalAmount
    const paymentPercentage = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0

    return {
      isFullyPaid,
      isUnpaid,
      isPartiallyPaid,
      paidAmount,
      pendingAmount,
      paymentPercentage,
    }
  }

  const fetchBookings = async () => {
    try {
      setLoading(true)
      // Always use server API which applies franchise isolation via session.
      const res = await fetch('/api/bookings', { cache: 'no-store' })
      if (!res.ok) {
        console.error('[v0] Error fetching bookings via /api/bookings:', res.status, await res.text().catch(()=>''))
        return
      }
      const json = await res.json()
      const rows: any[] = json?.bookings || json?.data || []

      const toDateOnly = (v: any) => (v ? format(new Date(v), 'yyyy-MM-dd') : '')
      
      // Process bookings with area and venue extraction
      const formattedBookings: BookingData[] = await Promise.all(rows.map(async (r: any) => {
        let area_name = 'Not Specified'
        let venue_name = 'Not Specified'

        // 1. Get area from pincode using pincode API (silent - no toast)
        if (r.customer?.pincode) {
          try {
            const pincodeData = await PincodeService.lookup(r.customer.pincode, false)
            if (pincodeData) {
              area_name = pincodeData.area
            }
          } catch (error) {
            console.error(`Error looking up pincode ${r.customer.pincode}:`, error)
            area_name = 'Not Specified'
          }
        }

        // 2. Extract venue name from venue_address using venue extraction API
        if (r.venue_address) {
          try {
            const extractRes = await fetch('/api/venue-area-extractor', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ address: r.venue_address }),
            })
            if (extractRes.ok) {
              const extractData = await extractRes.json()
              if (extractData.success && extractData.data) {
                venue_name = extractData.data.venue_name
              }
            }
          } catch (error) {
            console.error(`Error extracting venue from address "${r.venue_address}":`, error)
            venue_name = r.venue_address?.split(/[,\n]/)[0]?.trim() || 'Not Specified'
          }
        }

        return {
          id: r.id,
          booking_number: r.booking_number,
          customer_name: r.customer?.name || 'Unknown Customer',
          customer_phone: r.customer?.phone || '',
          event_date: toDateOnly(r.event_date),
          delivery_date: toDateOnly(r.delivery_date),
          return_date: toDateOnly(r.pickup_date), // API field name
          modification_date: r.modification_date ? toDateOnly(r.modification_date) : undefined,
          modification_time: r.modification_date ? format(new Date(r.modification_date), 'hh:mm a') : undefined,
          modifications_details: r.modifications_details || undefined,
          has_modifications: r.has_modifications || false,
          event_type: r.event_type,
          venue_name,
          venue_address: r.venue_address || '',
          area_name,
          total_amount: Number(r.total_amount) || 0,
          paid_amount: Number(r.paid_amount) || 0,
          status: r.status,
          total_safas: Number(r.total_safas) || 0,
          assigned_staff_name: undefined,
          booking_items: [],
          customer: {
            name: r.customer?.name || 'Unknown Customer',
            city: r.customer?.city || 'Not Specified',
            address: r.customer?.address || 'Not Specified',
          },
          has_items: r.has_items || false,
          source: r.source || 'product_orders',
          type: r.type || 'rental',
          package_details: r.package_details || null,
          variant_name: r.variant_name || null,
          extra_safas: r.extra_safas || 0,
        } as any
      }))

      setBookings(formattedBookings)
    } catch (error) {
      console.error("[v0] Error in fetchBookings:", error)
    } finally {
      setLoading(false)
    }
  }

  const getBookingsForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd")
    return bookings.filter(
      (booking) =>
        booking.event_date === dateStr,
    )
  }

  const getModificationsForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd")
    return bookings.filter(
      (booking) =>
        booking.has_modifications && booking.modification_date === dateStr,
    )
  }

  // Save selected items
  const saveSelectedItems = async (bookingId: string, items: SelectedItem[]) => {
    try {
      console.log(`[Calendar] Saving ${items.length} items for booking ${bookingId}`)
      
      const payload = {
        bookingId,
        items: items.map((item: any) => ({
          product_id: item.product_id || null,
          package_id: item.package_id || null,
          variant_id: item.variant_id || null,
          quantity: item.quantity || 1,
          unit_price: item.unit_price || 0,
          total_price: item.total_price || 0,
          security_deposit: item.security_deposit || 0,
        })),
        source: 'product_orders',
      }
      
      const response = await fetch('/api/bookings-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      
      if (!response.ok) {
        throw new Error('Failed to save items')
      }
      
      // Refresh bookings to get updated data
      await fetchBookings()
      
      return true
    } catch (error: any) {
      console.error('[Calendar] Save failed:', error)
      return false
    }
  }
  // Fetch items for a specific booking when dialog opens - matching bookings page
  React.useEffect(() => {
    if (showProductDialog && productDialogBooking && productDialogType === 'items') {
      (async () => {
        const bookingId = productDialogBooking.id
        const bookingNumber = productDialogBooking.booking_number
        
        try {
          setItemsLoading(prev => ({ ...prev, [bookingId]: true }))
          console.log(`[Calendar] Fetching items for ${bookingNumber}...`)
          
          // Use the source field from booking to determine the API parameter
          const source = (productDialogBooking as any).source || 'product_order'
          const normalizedSource = source.endsWith('s') ? source.slice(0, -1) : source
          
          const url = `/api/bookings-items?id=${bookingId}&source=${normalizedSource}`
          console.log(`[Calendar] GET ${url}`)
          
          const res = await fetch(url)
          
          if (!res.ok) {
            const errorText = await res.text()
            console.error(`[Calendar] HTTP ${res.status}:`, errorText)
            setItemsError(prev => ({ ...prev, [bookingId]: `HTTP ${res.status}` }))
            setItemsLoading(prev => ({ ...prev, [bookingId]: false }))
            return
          }
          
          const data = await res.json()
          
          if (Array.isArray(data.items)) {
            setBookingItems(prev => ({ ...prev, [bookingId]: data.items }))
            console.log(`[Calendar] ✓ Loaded ${data.items.length} items for ${bookingNumber}`)
            setItemsError(prev => ({ ...prev, [bookingId]: '' }))
          } else {
            const errorDetail = data.details || data.error || 'Unknown error'
            console.warn(`[Calendar] API returned error:`, errorDetail)
            setItemsError(prev => ({ ...prev, [bookingId]: errorDetail }))
          }
        } catch (e: any) {
          console.error(`[Calendar] Fetch error for ${bookingNumber}:`, e)
          setItemsError(prev => ({ ...prev, [bookingId]: e.message || 'Network error' }))
        } finally {
          setItemsLoading(prev => ({ ...prev, [bookingId]: false }))
        }
      })()
    }
  }, [showProductDialog, productDialogBooking?.id, productDialogType])

  const getDateStatus = (date: Date) => {
    const today = startOfDay(new Date())
    const currentDate = startOfDay(date)

    // Past dates - grey
    if (isBefore(currentDate, today)) {
      return "past"
    }

    const dayBookings = getBookingsForDate(date)
    const bookingCount = dayBookings.length

    // Count-based coloring
    // bookingCount === 0 => zero
    // 1 <= bookingCount < 20 => low
    // bookingCount >= 20 => high
    if (bookingCount === 0) {
      const dayModifications = getModificationsForDate(date)
      if (dayModifications.length > 0) {
        return "modification"
      }
      return "zero" // 0 bookings
    }

    if (bookingCount > 10) {
      return "high" // 11+ bookings = red
    }

    return "low" // 1-10 bookings
  }

  const handleDateClick = (date: Date) => {
    console.log("[v0] Date clicked:", format(date, "yyyy-MM-dd"))
    const dayBookings = getBookingsForDate(date)
    const dayModifications = getModificationsForDate(date)
    console.log("[v0] Bookings found for date:", dayBookings.length)
    console.log("[v0] Modifications found for date:", dayModifications.length)
    const dateStr = format(date, "yyyy-MM-dd")
    const isLocked = lockedDates.includes(dateStr)
    setDateBookings(dayBookings)
    setModificationBookings(dayModifications)
    setSelectedCalendarBooking(dayBookings.length > 0 ? dayBookings[0] : null)
    setActiveTab(dayBookings.length > 0 ? 'events' : isLocked ? 'locked' : (dayModifications.length > 0 ? 'modifications' : 'events'))
    setShowDateDetails(true)
    console.log("[v0] Popup should open, showDateDetails:", true)
    // Clear selection immediately to prevent black selected state
    setTimeout(() => setSelectedDate(undefined), 0)
  }

  const filteredDateBookings = dateBookings.filter(
    (booking) =>
      booking.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.booking_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.venue_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.customer.city?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const prevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  const getCalendarDays = () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const startOfWeek = firstDay.getDay()
    const totalDays = new Date(year, month + 1, 0).getDate()
    
    const days: (Date | null)[] = []
    
    // Previous month padding
    for (let i = 0; i < startOfWeek; i++) {
      days.push(null)
    }
    
    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      days.push(new Date(year, month, i))
    }
    
    // Next month padding to make complete rows of 7
    const remaining = 7 - (days.length % 7)
    if (remaining < 7) {
      for (let i = 0; i < remaining; i++) {
        days.push(null)
      }
    }
    
    return days
  }

  const parseLockNote = (noteStr: string) => {
    try {
      const parsed = JSON.parse(noteStr)
      return {
        personName: parsed.personName || "Date Locked",
        reason: parsed.reason || ""
      }
    } catch {
      return {
        personName: noteStr || "Date Locked",
        reason: ""
      }
    }
  }

  const getApiType = (source: string) => {
    if (source === "product_orders" || source === "product_order") return "product_order"
    if (source === "package_bookings" || source === "package_booking") return "package_booking"
    return "unified"
  }

  const dayModifiers = React.useMemo(() => {
    const modifiers: Record<string, Date[]> = {
      past: [],    // Past dates (grey)
      zero: [],    // 0 bookings (green)
      low: [],     // 1-19 bookings (blue)
      high: [],    // 20+ bookings (red)
      modification: [], // Has modifications (amber)
    }

    // Generate dates for the current month and next few months
    const today = new Date()
    const endDate = new Date(today.getFullYear(), today.getMonth() + 3, 0) // 3 months ahead

    for (let d = new Date(today.getFullYear(), today.getMonth() - 1, 1); d <= endDate; d.setDate(d.getDate() + 1)) {
      const currentDate = new Date(d)
      const status = getDateStatus(currentDate)
      if (modifiers[status]) modifiers[status].push(new Date(currentDate))
    }

    return modifiers
  }, [bookings])

  const dayClassNames = {
    // Past dates → grey
    past: "!bg-gray-300 !text-gray-600 !opacity-60 !cursor-not-allowed hover:!bg-gray-300 dark:!bg-gray-700 dark:!text-gray-400",
  // 0 bookings → green
  zero: "!bg-green-500/90 !text-white hover:!bg-green-600 !cursor-pointer !border !border-green-600/30 shadow-sm font-semibold",
  // 1-10 bookings → blue
  low: "!bg-blue-500/90 !text-white hover:!bg-blue-600 !cursor-pointer !border !border-blue-600/30 shadow-sm font-semibold",
    // 11+ bookings → red
    high: "!bg-red-500/90 !text-white hover:!bg-red-600 !cursor-pointer !border !border-red-600/30 shadow-sm font-semibold",
    // Has modifications → amber
    modification: "!bg-orange-400 !text-white hover:!bg-orange-500 !cursor-pointer !border !border-orange-500/30 shadow-sm font-semibold",
  }

  return (
    <Card className="shadow-md border-border/40 w-full">
      <CardHeader className="pb-4 px-6 border-b bg-gradient-to-br from-background to-muted/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle className="text-xl font-extrabold flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-indigo-600" />
            Booking Schedule
          </CardTitle>
          
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={prevMonth} className="h-8 w-8 p-0 font-bold">
              &lt;
            </Button>
            <span className="text-sm font-bold text-slate-800 dark:text-slate-100 min-w-[120px] text-center capitalize">
              {format(currentMonth, "MMMM yyyy")}
            </span>
            <Button variant="outline" size="sm" onClick={nextMonth} className="h-8 w-8 p-0 font-bold">
              &gt;
            </Button>
          </div>

          <div className="flex items-center gap-4 text-[11px] flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-white border border-slate-300 dark:border-slate-700 shadow-sm" />
              <span className="text-slate-600 dark:text-slate-400 font-medium">0 Bookings</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 shadow-sm" />
              <span className="text-slate-600 dark:text-slate-400 font-medium">1-10 Bookings</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-orange-100 dark:bg-orange-950 border border-orange-300 shadow-sm" />
              <span className="text-slate-600 dark:text-slate-400 font-medium">10+ Bookings</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 shadow-sm" />
              <span className="text-slate-600 dark:text-slate-400 font-medium">Past Date</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Scissors className="h-3 w-3 text-amber-500" />
              <span className="text-slate-600 dark:text-slate-400 font-medium">Modifications</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Lock className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
              <span className="text-slate-600 dark:text-slate-400 font-medium">Locked Date</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="w-full p-6">
        <div className="grid grid-cols-7 gap-px bg-slate-200 dark:bg-slate-800 border dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
            <div key={day} className="bg-slate-50 dark:bg-slate-900/60 p-2.5 text-center text-xs font-bold text-slate-500 uppercase tracking-wider border-b dark:border-slate-800">
              {day}
            </div>
          ))}
          {getCalendarDays().map((day, idx) => {
            if (!day) {
              return (
                <div key={`empty-${idx}`} className="bg-slate-50/40 dark:bg-slate-950/20 min-h-[110px]" />
              )
            }
            
            const dateStr = format(day, "yyyy-MM-dd")
            const isToday = format(new Date(), "yyyy-MM-dd") === dateStr
            const dayBookings = getBookingsForDate(day)
            const dayModifications = getModificationsForDate(day)
            const isLocked = lockedDates.includes(dateStr)
            const lockedDetails = lockedDateObjects.find(ld => ld.locked_date === dateStr)
            
            const isPastDate = isBefore(startOfDay(day), startOfDay(new Date()))
            let cellBgClass = "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
            if (isPastDate) {
              cellBgClass = "bg-slate-100 dark:bg-slate-900/65 text-slate-400 dark:text-slate-500 opacity-80 cursor-not-allowed"
            } else if (dayBookings.length > 0 && dayBookings.length <= 10) {
              cellBgClass = "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-300 border-emerald-100 dark:border-emerald-900/10"
            } else if (dayBookings.length > 10) {
              cellBgClass = "bg-orange-50 dark:bg-orange-950/20 text-orange-900 dark:text-orange-300 border-orange-100 dark:border-orange-900/10"
            }
            
            return (
              <div 
                key={dateStr} 
                onClick={() => handleDateClick(day)}
                className={`${cellBgClass} min-h-[110px] p-2 flex flex-col justify-between border-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all cursor-pointer group ${
                  isToday ? "ring-1 ring-inset ring-indigo-500 bg-indigo-50/5" : ""
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className={`text-xs font-bold flex items-center justify-center h-5 w-5 rounded-full ${
                    isToday ? "bg-indigo-600 text-white font-extrabold" : isPastDate ? "text-slate-400 dark:text-slate-500" : "text-slate-700 dark:text-slate-300"
                  }`}>
                    {day.getDate()}
                  </span>
                  
                  {dayModifications.length > 0 && (
                    <span className="animate-pulse" title="Modifications Pending">
                      <Scissors className="h-3 w-3 text-amber-500" />
                    </span>
                  )}
                </div>
                
                <div className="flex-1 flex flex-col gap-1 overflow-y-auto max-h-[80px] scrollbar-none">
                  {dayBookings.slice(0, 3).map(b => {
                    const isRental = (b as any).type === "rental"
                    const isPackage = (b as any).booking_kind === "package" || (b as any).type === "package"
                    return (
                      <div 
                        key={b.id} 
                        onClick={(e) => {
                           e.stopPropagation()
                           setSelectedCalendarBooking(b)
                           setSelectedDate(day)
                           setDateBookings(dayBookings)
                           setModificationBookings(dayModifications)
                           setShowDateDetails(true)
                        }}
                        className={`text-[9px] px-1.5 py-0.5 rounded font-semibold truncate transition-colors ${
                          isRental 
                            ? "bg-blue-50 text-blue-700 border border-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/30"
                            : isPackage
                              ? "bg-purple-50 text-purple-700 border border-purple-100 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900/30"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/30"
                        }`}
                      >
                        {isRental ? "👗" : isPackage ? "📦" : "🛍️"} {b.booking_number} ({b.customer_name})
                      </div>
                    )
                  })}
                  {dayBookings.length > 3 && (
                    <div className="text-[8px] text-slate-400 font-bold pl-1">
                      +{dayBookings.length - 3} more...
                    </div>
                  )}
                  {isLocked && (
                    <div className="text-[9px] bg-emerald-50 text-emerald-800 border border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/30 px-1.5 py-0.5 rounded font-semibold truncate flex items-center gap-1">
                      <Lock className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>Locked ({lockedDetails?.notes ? parseLockNote(lockedDetails.notes).personName : "Date Locked"})</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>

      <Dialog
        open={showDateDetails}
        onOpenChange={(open) => {
          console.log("[v0] Dialog onOpenChange:", open)
          setShowDateDetails(open)
        }}
      >
        <DialogContent className={`${compact ? 'max-w-md' : 'max-w-7xl'} max-h-[90vh] overflow-y-auto`}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              <CalendarIcon className="w-5 h-5" />
              Bookings & Modifications - {selectedDate && format(selectedDate, "MMMM dd, yyyy")}
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'events' | 'modifications' | 'locked')} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="events" className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" />
                Events ({dateBookings.length})
              </TabsTrigger>
              <TabsTrigger value="modifications" className="flex items-center gap-2">
                <Wrench className="w-4 h-4" />
                Mod. ({modificationBookings.length})
              </TabsTrigger>
              <TabsTrigger value="locked" className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Locked ({lockedDateObjects.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="events" className="space-y-4">
              {dateBookings.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-slate-900 border rounded-xl shadow-sm">
                  <CalendarIcon className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-700" />
                  <div className="text-slate-500 font-medium">No events scheduled for this date</div>
                  <div className="mt-4">
                    <Button size="sm" asChild>
                      <a href="/create-invoice">+ Create Booking</a>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 min-h-[480px]">
                  {/* Left Pane: Bookings list on this date */}
                  <div className="md:col-span-1 border-r pr-4 border-slate-100 dark:border-slate-800 max-h-[500px] overflow-y-auto flex flex-col gap-2">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Bookings ({filteredDateBookings.length})</div>
                    <div className="mb-2 relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                      <Input
                        placeholder="Search name, venue..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 h-8 text-xs bg-slate-50 dark:bg-slate-900/50"
                      />
                    </div>
                    {filteredDateBookings.map((b) => {
                      const isSelected = selectedCalendarBooking?.id === b.id
                      const isRental = (b as any).type === "rental"
                      const isPackage = (b as any).booking_kind === "package" || (b as any).type === "package"
                      
                      return (
                        <div
                          key={b.id}
                          onClick={() => setSelectedCalendarBooking(b)}
                          className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                            isSelected 
                              ? "border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20 shadow-sm"
                              : "border-slate-150 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                          }`}
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400">{b.booking_number}</span>
                            <Badge variant={isRental ? "info" : isPackage ? "secondary" : "success"} className="text-[9px] px-1 py-0.5">
                              {isRental ? "Rental" : isPackage ? "Package" : "Sale"}
                            </Badge>
                          </div>
                          <div className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{b.customer_name}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{b.event_type}</div>
                        </div>
                      )
                    })}
                  </div>
                  
                  {/* Right Pane: Selected Booking Details & Premium Action Bar */}
                  <div className="md:col-span-2 flex flex-col justify-between">
                    {selectedCalendarBooking ? (
                      <div className="flex-1 flex flex-col justify-between gap-4 h-full">
                        <div>
                          {/* Top Action Buttons Group */}
                          <div className="flex flex-wrap items-center gap-1.5 border-b pb-3.5 mb-4 border-slate-100 dark:border-slate-800">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                window.open(`/create-invoice?mode=edit&id=${selectedCalendarBooking.id}`, '_blank')
                              }}
                              className="h-8 text-xs font-semibold gap-1.5"
                            >
                              ✏️ Edit Order
                            </Button>
                            
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                if (confirm("Are you sure you want to archive this booking?")) {
                                  try {
                                    const apiType = getApiType(selectedCalendarBooking.source)
                                    const res = await fetch(`/api/bookings/${selectedCalendarBooking.id}?type=${apiType}`, {
                                      method: "PATCH",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ is_archived: true }),
                                    })
                                    if (res.ok) {
                                      toast({ title: "Archived", description: "Booking archived successfully" })
                                      setShowDateDetails(false)
                                      fetchBookings()
                                    }
                                  } catch (e) {
                                    toast({ title: "Error", description: "Failed to archive", variant: "destructive" })
                                  }
                                }
                              }}
                              className="h-8 text-xs font-semibold gap-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                            >
                              📦 Archive
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                if (onViewDetails) {
                                  setShowDateDetails(false)
                                  onViewDetails(selectedCalendarBooking)
                                }
                              }}
                              className="h-8 text-xs font-semibold gap-1.5"
                            >
                              👁️ View Details
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                window.open(`/create-invoice?mode=edit&id=${selectedCalendarBooking.id}&print=true`, '_blank')
                              }}
                              className="h-8 text-xs font-semibold gap-1.5"
                            >
                              🖨️ Print Invoice
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const printWindow = window.open("", "_blank")
                                if (printWindow) {
                                  const itemsHtml = selectedCalendarBooking.booking_items?.map((item: any) => `
                                    <tr>
                                      <td style="border: 1px solid #ddd; padding: 8px;">${item.product_name || 'Item'}</td>
                                      <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${item.quantity || 1}</td>
                                    </tr>
                                  `).join('') || `<tr><td colspan="2" style="border: 1px solid #ddd; padding: 8px; text-align: center;">No items listed.</td></tr>`
                                  
                                  printWindow.document.write(`
                                    <html>
                                      <head>
                                        <title>Delivery Challan - #${selectedCalendarBooking.booking_number}</title>
                                        <style>
                                          body { font-family: sans-serif; padding: 20px; line-height: 1.6; }
                                          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                                          th { background-color: #f2f2f2; font-weight: bold; padding: 8px; }
                                        </style>
                                      </head>
                                      <body>
                                        <h2>DELIVERY CHALLAN / PACKING LIST</h2>
                                        <hr />
                                        <p><strong>Booking #:</strong> ${selectedCalendarBooking.booking_number}</p>
                                        <p><strong>Customer Name:</strong> ${selectedCalendarBooking.customer_name}</p>
                                        <p><strong>Phone:</strong> ${selectedCalendarBooking.customer_phone}</p>
                                        <p><strong>Event Date:</strong> ${selectedCalendarBooking.event_date}</p>
                                        <p><strong>Venue:</strong> ${selectedCalendarBooking.venue_name} - ${selectedCalendarBooking.venue_address}</p>
                                        
                                        <h3>Items List</h3>
                                        <table>
                                          <thead>
                                            <tr>
                                              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Product Details</th>
                                              <th style="border: 1px solid #ddd; padding: 8px; text-align: center; width: 100px;">Qty</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            ${itemsHtml}
                                          </tbody>
                                        </table>
                                        <div style="margin-top: 50px; display: flex; justify-content: space-between;">
                                          <div>_________________<br/>Receiver Signature</div>
                                          <div>_________________<br/>Authorized Signatory</div>
                                        </div>
                                        <script>window.onload = function() { window.print(); window.close(); }</script>
                                      </body>
                                    </html>
                                  `)
                                  printWindow.document.close()
                                }
                              }}
                              className="h-8 text-xs font-semibold gap-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900/30"
                            >
                              🚚 Print Delivery Sheet
                            </Button>
                          </div>
                          
                          {/* Full Booking Summary Details */}
                          <div className="space-y-4 text-sm bg-slate-50/50 dark:bg-slate-900/20 p-4 border border-slate-100 dark:border-slate-800 rounded-xl">
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Customer Details</span>
                              <div className="font-bold text-slate-800 dark:text-slate-100 text-base">{selectedCalendarBooking.customer_name}</div>
                              <div className="text-slate-500 text-xs font-medium mt-0.5">{selectedCalendarBooking.customer_phone}</div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Event Info</span>
                                <div className="font-semibold text-slate-700 dark:text-slate-200 text-xs">{selectedCalendarBooking.event_type}</div>
                                <div className="text-[11px] text-slate-500 mt-0.5">{selectedCalendarBooking.event_date}</div>
                              </div>
                              <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Venue</span>
                                <div className="font-semibold text-slate-700 dark:text-slate-200 text-xs truncate" title={selectedCalendarBooking.venue_address}>
                                  {selectedCalendarBooking.venue_name}
                                </div>
                                <div className="text-[11px] text-slate-500 mt-0.5 truncate">{selectedCalendarBooking.venue_address}</div>
                              </div>
                            </div>
                            
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Payment Summary</span>
                              {(() => {
                                const payment = getPaymentStatus(selectedCalendarBooking)
                                return (
                                  <div className="flex items-center gap-3 mt-1">
                                    <Badge variant={payment.isFullyPaid ? "success" : "warning"} className="font-bold">
                                      {payment.isFullyPaid ? "Paid" : `Due: ₹${payment.pendingAmount.toLocaleString()}`}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground font-medium">
                                      Paid: ₹{payment.paidAmount.toLocaleString()} / Total: ₹{selectedCalendarBooking.total_amount.toLocaleString()}
                                    </span>
                                  </div>
                                )
                              })()}
                            </div>

                            {selectedCalendarBooking.has_modifications && (
                              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-lg text-xs">
                                <div className="font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider mb-1">Alterations Instructions</div>
                                <p className="text-slate-700 dark:text-slate-300 font-medium whitespace-pre-wrap">{selectedCalendarBooking.modifications_details || "No details provided"}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground text-sm">
                        Select a booking from the left to view details and action controls.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="modifications" className="space-y-4">
              {modificationBookings.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  <Badge className="bg-orange-500">{modificationBookings.length} modifications pending</Badge>
                </div>
              )}

              {modificationBookings.length === 0 ? (
                <div className="text-center py-8">
                  <Wrench className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                  <div className="text-muted-foreground">No modifications for this date</div>
                </div>
              ) : (
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full border-collapse bg-white">
                    <thead>
                      <tr className="bg-muted/40 border-b">
                        <th className="border-r border-muted px-4 py-3 text-left text-sm font-semibold text-foreground min-w-[150px]">
                          Customer Name
                        </th>
                        <th className="border-r border-muted px-4 py-3 text-left text-sm font-semibold text-foreground min-w-[120px]">
                          Phone Number
                        </th>
                        <th className="border-r border-muted px-4 py-3 text-left text-sm font-semibold text-foreground min-w-[180px]">
                          Modification Date & Time
                        </th>
                        <th className="border-muted px-4 py-3 text-left text-sm font-semibold text-foreground">
                          Modification Details
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {modificationBookings.map((booking, index) => (
                        <tr
                          key={booking.id}
                          className={`border-b hover:bg-muted/40 ${index % 2 === 0 ? "bg-background" : "bg-muted/20"}`}
                        >
                          <td className="border-r border-muted px-4 py-3 text-sm font-medium text-foreground">
                            {booking.customer_name}
                          </td>
                          <td className="border-r border-muted px-4 py-3 text-sm text-foreground">
                            {booking.customer_phone || "N/A"}
                          </td>
                          <td className="border-r border-muted px-4 py-3 text-sm text-foreground">
                            <div>
                              <div className="font-medium">
                                {booking.modification_date ? format(new Date(booking.modification_date), "dd-MMM-yyyy") : "N/A"}
                              </div>
                              {booking.modification_time && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  {booking.modification_time}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="border-muted px-4 py-3 text-sm text-foreground max-w-sm">
                            <div className="text-xs bg-orange-50 p-2 rounded border border-orange-200 text-orange-900">
                              {booking.modifications_details || "No details provided"}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            {/* 3rd Tab: Locked Dates */}
            <TabsContent value="locked" className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-red-500" />
                  <span className="font-semibold text-sm text-red-700">All Locked Dates</span>
                  <Badge variant="destructive" className="text-xs">{lockedDateObjects.length}</Badge>
                </div>
                <Button size="sm" variant="outline" asChild className="text-xs h-7">
                  <a href="/lock-dates">Manage All →</a>
                </Button>
              </div>

              {lockedDateObjects.length === 0 ? (
                <div className="text-center py-8">
                  <Lock className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
                  <div className="text-muted-foreground text-sm">No dates are locked</div>
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {lockedDateObjects
                    .sort((a, b) => a.locked_date.localeCompare(b.locked_date))
                    .map((ld) => {
                      const rawNotes = ld.notes || ""
                      const personMatch = rawNotes.match(/^PERSON:\s*([^|]+)\|/)
                      const cityMatch = rawNotes.match(/\|CITY:\s*([^|]+)(\||$)/)
                      const noteMatch = rawNotes.match(/\|NOTE:\s*([\s\S]*)$/)
                      const personName = personMatch ? personMatch[1].trim() : ""
                      const city = cityMatch ? cityMatch[1].trim() : ""
                      const note = noteMatch ? noteMatch[1].trim() : (!personMatch ? rawNotes : "")
                      const isToday = ld.locked_date === format(new Date(), "yyyy-MM-dd")
                      const isPast = ld.locked_date < format(new Date(), "yyyy-MM-dd")
                      return (
                        <div key={ld.id} className={`flex items-start justify-between rounded-lg px-3 py-2.5 border ${isToday ? "bg-red-100 border-red-300" : isPast ? "bg-gray-50 border-gray-200 opacity-60" : "bg-red-50 border-red-200"}`}>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Lock className={`h-3.5 w-3.5 shrink-0 ${isToday ? "text-red-600" : "text-red-400"}`} />
                              <span className={`text-sm font-bold ${isToday ? "text-red-700" : "text-red-600"}`}>
                                {format(new Date(ld.locked_date + "T00:00:00"), "EEE, dd MMM yyyy")}
                              </span>
                              {isToday && <Badge className="text-[9px] bg-red-600 text-white px-1 py-0">TODAY</Badge>}
                              {isPast && <Badge variant="secondary" className="text-[9px] px-1 py-0">Past</Badge>}
                            </div>
                            {personName && (
                              <div className="flex items-center gap-3 mt-1 pl-5">
                                <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                                  <User className="h-3 w-3" /> {personName}
                                </span>
                                {city && city !== "—" && (
                                  <span className="text-xs text-slate-500 flex items-center gap-1">
                                    <MapPin className="h-3 w-3" /> {city}
                                  </span>
                                )}
                              </div>
                            )}
                            {ld.whatsapp_number && (
                              <p className="text-[11px] text-slate-500 mt-0.5 pl-5">📞 {ld.whatsapp_number}</p>
                            )}
                            {note && <p className="text-[11px] text-slate-600 mt-0.5 pl-5 truncate max-w-xs">{note}</p>}
                          </div>
                          {(userRole === "franchise_admin" || userRole === "franchise_owner" || userRole === "super_admin") && (
                            <button
                              onClick={() => handleUnlockDate(ld.id)}
                              disabled={deletingLockId === ld.id}
                              className="text-red-400 hover:text-red-600 ml-2 mt-0.5 shrink-0"
                              title="Unlock this date"
                            >
                              {deletingLockId === ld.id
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                : <Trash2 className="h-3.5 w-3.5" />}
                            </button>
                          )}
                        </div>
                      )
                    })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
      
      {/* Compact Items Display Dialog - Matching Bookings Page */}
      {productDialogBooking && productDialogType === 'items' && !itemsLoading[productDialogBooking.id] && !itemsError[productDialogBooking.id] && bookingItems[productDialogBooking.id] && (
        <CompactItemsDisplayDialog
          open={showProductDialog}
          onOpenChange={async (open) => {
            if (!open && productDialogBooking) {
              // When closing, save any changes
              const bookingType = (productDialogBooking as any).type || 'rental'
              const source = bookingType === 'package' ? 'package_bookings' : 'product_orders'
              await saveSelectedItems(productDialogBooking.id, selectedItems)
            }
            setShowProductDialog(open)
          }}
          items={(() => {
            const items = bookingItems[productDialogBooking.id] || []
            return items.map((item: any) => {
              if (item.package_name) {
                return {
                  id: item.id || `item-${Math.random()}`,
                  package_id: item.package_id || item.id,
                  variant_id: item.variant_id,
                  package: {
                    id: item.package_id || item.id,
                    name: item.package_name,
                    description: item.package_description,
                  },
                  variant: item.variant_name ? {
                    id: item.variant_id,
                    name: item.variant_name,
                    price: item.unit_price || item.price || 0,
                  } : undefined,
                  quantity: item.quantity || 1,
                  extra_safas: item.extra_safas || 0,
                  variant_inclusions: item.variant_inclusions || [],
                  unit_price: item.unit_price || item.price || 0,
                  total_price: item.price || item.total_price || 0,
                } as any
              } else {
                return {
                  id: item.product_id || item.id || `item-${Math.random()}`,
                  product_id: item.product_id || item.id,
                  product: {
                    id: item.product_id || item.id,
                    name: item.product?.name || item.product_name || 'Item',
                    barcode: item.product?.barcode || item.barcode || item.product_code,
                    product_code: item.product?.product_code || item.product_code,
                    category: item.product?.category || item.category_name,
                    image_url: item.product?.image_url,
                  },
                  quantity: item.quantity || 1,
                  unit_price: item.unit_price || item.price || 0,
                  total_price: (item.unit_price || item.price || 0) * (item.quantity || 1),
                  variant_name: item.variant_name,
                } as any
              }
            })
          })()}
          title={`📦 ${productDialogBooking.booking_number}`}
          onEditProducts={() => {
            setShowProductDialog(false)
            setCurrentBookingForItems(productDialogBooking)
            const items = bookingItems[productDialogBooking.id] || []
            setSelectedItems(items.map((item: any) => {
              if (item.package_name) {
                return {
                  id: item.id || `item-${Math.random()}`,
                  package_id: item.package_id || item.id,
                  variant_id: item.variant_id,
                  package: {
                    id: item.package_id || item.id,
                    name: item.package_name,
                  },
                  variant: item.variant_name ? {
                    id: item.variant_id,
                    name: item.variant_name,
                  } : undefined,
                  quantity: item.quantity || 1,
                  extra_safas: item.extra_safas || 0,
                } as any
              } else {
                return {
                  id: item.product_id || item.id || `item-${Math.random()}`,
                  product_id: item.product_id || item.id,
                  product: {
                    id: item.product_id || item.id,
                    name: item.product?.name || item.product_name || 'Item',
                  },
                  quantity: item.quantity || 1,
                } as any
              }
            }))
            setShowItemsSelection(true)
          }}
          onRemoveItem={(itemId) => {
            setSelectedItems(prev => prev.filter(item => item.id !== itemId))
          }}
          showPricing={true}
        />
      )}

      {/* Product Selection Dialog - Matching Bookings Page */}
      {currentBookingForItems && (
        <ItemsSelectionDialog
          open={showItemsSelection}
          onOpenChange={async (open) => {
            if (!open && currentBookingForItems) {
              // When modal closes, save the selected items
              const bookingType = (currentBookingForItems as any).type || 'rental'
              const source = bookingType === 'package' ? 'package_bookings' : 'product_orders'
              await saveSelectedItems(currentBookingForItems.id, selectedItems)
            }
            setShowItemsSelection(open)
          }}
          mode="select"
          type="product"
          items={products}
          categories={categories}
          subcategories={subcategories}
          context={{
            bookingType: (currentBookingForItems as any).type === 'package' ? 'sale' : 'rental',
            eventDate: currentBookingForItems.event_date,
            deliveryDate: currentBookingForItems.delivery_date,
            returnDate: currentBookingForItems.return_date,
            onItemSelect: (item) => {
              // Check if item already exists in selectedItems
              const existingItem = selectedItems.find(si => {
                if ('variants' in item || 'package_variants' in item) {
                  return 'package_id' in si && si.package_id === item.id
                } else {
                  return 'product_id' in si && si.product_id === item.id
                }
              })

              if (existingItem) {
                // Item already selected, remove it
                setSelectedItems(prev => prev.filter(si => si.id !== existingItem.id))
              } else {
                // Add new item
                if ('variants' in item || 'package_variants' in item) {
                  // Package item
                  const newItem: SelectedItem = {
                    id: `pkg-${item.id}-${Date.now()}`,
                    package_id: item.id,
                    variant_id: undefined,
                    package: item as any,
                    variant: undefined,
                    quantity: (item as any).requestedQuantity || 1,
                    extra_safas: 0,
                    variant_inclusions: [],
                    unit_price: 0,
                    total_price: 0,
                  } as any
                  setSelectedItems(prev => [...prev, newItem])
                } else {
                  // Product item
                  const prod = item as any
                  const newItem: SelectedItem = {
                    id: `prod-${item.id}-${Date.now()}`,
                    product_id: item.id,
                    product: prod,
                    quantity: (item as any).requestedQuantity || 1,
                    unit_price: prod.rental_price || 0,
                    total_price: (prod.rental_price || 0) * ((item as any).requestedQuantity || 1),
                  } as any
                  setSelectedItems(prev => [...prev, newItem])
                }
              }
            },
            onQuantityChange: (itemId: string, qty: number) => {
              setSelectedItems(prev => prev.map(si => {
                const id = 'product_id' in si ? si.product_id : si.package_id
                if (id === itemId) {
                  return { ...si, quantity: qty, total_price: (si.unit_price || 0) * qty }
                }
                return si
              }))
            },
          }}
          selectedItems={selectedItems}
        />
      )}
    </Card>
  )
}
