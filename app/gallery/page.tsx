"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  ArrowLeft,
  Image as ImageIcon,
  PlayCircle,
  Film,
  Sparkles,
  Upload,
  Camera,
  Video,
} from "lucide-react"

type MediaType = "image" | "video"

type GalleryItem = {
  id: string
  type: MediaType
  title: string
  category: string
  description: string
  accent: string
  duration?: string
}

const galleryItems: GalleryItem[] = [
  {
    id: "gal-1",
    type: "image",
    title: "Wedding styling showcase",
    category: "Brand Moments",
    description: "Elegant event setup preview for premium customers.",
    accent: "from-rose-100 via-white to-orange-100",
  },
  {
    id: "gal-2",
    type: "video",
    title: "Behind the scenes reel",
    category: "Video Highlights",
    description: "Short form reel placeholder for social and showroom display.",
    accent: "from-slate-950 via-slate-800 to-slate-700",
    duration: "00:45",
  },
  {
    id: "gal-3",
    type: "image",
    title: "Product detail shot",
    category: "Catalog",
    description: "Close-up capture for inventory and marketing use.",
    accent: "from-amber-100 via-white to-yellow-100",
  },
  {
    id: "gal-4",
    type: "video",
    title: "Delivery / setup walkthrough",
    category: "Operations",
    description: "Video placeholder for process walkthrough and team training.",
    accent: "from-rose-950 via-rose-900 to-rose-800",
    duration: "01:12",
  },
  {
    id: "gal-5",
    type: "image",
    title: "Client testimonial frame",
    category: "Social Proof",
    description: "Portrait-style image card for customer reviews and stories.",
    accent: "from-emerald-100 via-white to-lime-100",
  },
  {
    id: "gal-6",
    type: "video",
    title: "Launch event teaser",
    category: "Promotions",
    description: "Hero video placeholder for homepage and campaign banners.",
    accent: "from-indigo-950 via-indigo-900 to-violet-900",
    duration: "00:30",
  },
]

export default function GalleryPage() {
  const [filter, setFilter] = useState<"all" | MediaType>("all")

  const filteredItems = useMemo(() => {
    if (filter === "all") return galleryItems
    return galleryItems.filter((item) => item.type === filter)
  }, [filter])

  const imageCount = galleryItems.filter((item) => item.type === "image").length
  const videoCount = galleryItems.filter((item) => item.type === "video").length

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              Back to dashboard
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Gallery</h1>
              <p className="text-muted-foreground">
                Show your images and videos in one polished media wall with a soft red accent.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge className="rounded-full border border-rose-200 bg-rose-50 text-rose-700 px-3 py-1">
              {imageCount} Images
            </Badge>
            <Badge className="rounded-full border border-rose-200 bg-rose-50 text-rose-700 px-3 py-1">
              {videoCount} Videos
            </Badge>
          </div>
        </div>

        <Card className="border-rose-100 border-l-4 border-l-rose-500 bg-white shadow-sm">
          <CardHeader>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-rose-600" />
                  Brand Gallery Showcase
                </CardTitle>
                <CardDescription>
                  A clean, premium layout for images, reels, product shots, and training clips.
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                {(["all", "image", "video"] as const).map((item) => (
                  <Button
                    key={item}
                    variant={filter === item ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilter(item)}
                    className={
                      filter === item
                        ? "bg-rose-600 hover:bg-rose-700 text-white"
                        : "border-rose-200 text-rose-700 hover:bg-rose-50"
                    }
                  >
                    {item === "all" ? "All Media" : item === "image" ? "Images" : "Videos"}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredItems.map((item) => {
                const Icon = item.type === "image" ? ImageIcon : PlayCircle
                return (
                  <div
                    key={item.id}
                    className="group overflow-hidden rounded-2xl border border-rose-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className={`relative h-56 bg-gradient-to-br ${item.accent} flex items-center justify-center`}>
                      <div className="absolute inset-0 bg-black/10" />
                      <div className="relative text-center text-white">
                        {item.type === "video" ? (
                          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-white/30 bg-white/15 backdrop-blur-sm">
                            <PlayCircle className="h-9 w-9" />
                          </div>
                        ) : (
                          <Camera className="mx-auto h-14 w-14" />
                        )}
                        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.3em]">
                          {item.type === "video" ? "Video Placeholder" : "Image Placeholder"}
                        </p>
                      </div>

                      <div className="absolute left-3 top-3 flex gap-2">
                        <Badge className="rounded-full bg-white/90 text-slate-800 shadow-sm">
                          <Icon className="mr-1 h-3.5 w-3.5" />
                          {item.type}
                        </Badge>
                        <Badge className="rounded-full bg-rose-600 text-white shadow-sm">
                          {item.category}
                        </Badge>
                      </div>

                      {item.duration && (
                        <div className="absolute bottom-3 right-3 rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-semibold text-white">
                          {item.duration}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 p-4">
                      <div>
                        <h3 className="font-semibold text-slate-900">{item.title}</h3>
                        <p className="text-sm text-slate-500">{item.description}</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-rose-600">Ready for upload</span>
                        <Button variant="ghost" size="sm" className="text-rose-700 hover:bg-rose-50">
                          <Upload className="mr-1 h-3.5 w-3.5" />
                          Add media
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="border-rose-100 border-l-4 border-l-rose-500 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Film className="h-5 w-5 text-rose-600" />
                Video Placeholder Slot
              </CardTitle>
              <CardDescription>
                Reserve this space for social reels, walkthroughs, and hero brand clips.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-dashed border-rose-200 bg-gradient-to-br from-rose-50 to-white p-6 text-center">
                <div>
                  <Video className="mx-auto h-12 w-12 text-rose-500" />
                  <p className="mt-3 text-sm font-semibold text-slate-900">Video placeholder ready</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Add a short clip here for product demos, event teasers, or backstage moments.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-100 bg-white shadow-sm">
            <CardHeader>
              <CardTitle>Gallery Tips</CardTitle>
              <CardDescription>Simple rules that keep the page looking premium.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                Use consistent image ratios so the grid stays neat.
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                Keep video thumbnails short, clear, and branded.
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                Keep the red accent light — just enough to guide attention.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
