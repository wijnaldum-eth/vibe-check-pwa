import { ChartAreaInteractive } from "@//components/chart-area-interactive"
import { DataTable } from "@//components/data-table"
import { SectionCards } from "@//components/section-cards"
import { PWAInstallPrompt } from "@/components/pwa-install-prompt"
import { ShareButton } from "@/components/share-button"
import { NotificationPermission } from "@/components/notification-permission"
import { Metadata } from "next"
import data from "@/app/dashboard/data.json"

export const metadata: Metadata = {
  title: "Vibe Check Dashboard",
  description: "Track your crypto sentiment streak and see network insights",
  openGraph: {
    title: "Vibe Check Dashboard",
    description: "Track your crypto sentiment streak and see network insights",
    images: [{
      url: `${process.env.NEXT_PUBLIC_APP_URL}/api/og/enhanced?type=dashboard`,
      width: 1200,
      height: 630,
    }],
  },
  other: {
    "fc:frame": "vNext",
    "fc:frame:image": `${process.env.NEXT_PUBLIC_APP_URL}/api/og/enhanced?type=dashboard&frame=true`,
    "fc:frame:button:1": "📊 View Streak",
    "fc:frame:button:2": "🔄 Log Today",
    "fc:frame:button:3": "🌐 Network",
    "fc:frame:button:4": "🚀 Open App",
    "fc:frame:post_url": `${process.env.NEXT_PUBLIC_APP_URL}/api/frame`,
  },
}

export default function Page() {
  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <PWAInstallPrompt />
      <NotificationPermission showOnMount />
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        {/* Header with Share Button */}
        <div className="flex items-center justify-between px-4 lg:px-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <p className="text-gray-400">Track your crypto sentiment streak</p>
          </div>
          <ShareButton
            username="Crypto Trader"
            currentMood="bullish"
            streak={23}
          />
        </div>

        <SectionCards />
        <div className="px-4 lg:px-6">
          <ChartAreaInteractive />
        </div>
        <DataTable data={data} />
      </div>
    </div>
  )
}