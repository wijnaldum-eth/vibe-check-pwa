import { ChartAreaInteractive } from "@//components/chart-area-interactive"
import { DataTable } from "@//components/data-table"
import { SectionCards } from "@//components/section-cards"
import { PWAInstallPrompt } from "@/components/pwa-install-prompt"
import { ShareButton } from "@/components/share-button"
import { NotificationPermission } from "@/components/notification-permission"
import { NetworkSentiment } from "@/components/network-sentiment"
import { Leaderboard } from "@/components/leaderboard"
import { ReferralSystem } from "@/components/referral-system"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Metadata } from "next"
import data from "@/app/dashboard/data.json"
import { BarChart3, Trophy, Users } from "lucide-react"

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

// Mock user ID for demo - in real app this would come from authentication
const DEMO_USER_ID = "demo-user-123";
const DEMO_USER_FID = 12345;

export default function DashboardPage() {
  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <PWAInstallPrompt />
      <NotificationPermission showOnMount />
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        {/* Header with Share Button */}
        <div className="flex items-center justify-between px-4 lg:px-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <p className="text-gray-400">Track your crypto sentiment streak and network insights</p>
          </div>
          <ShareButton
            username="Crypto Trader"
            currentMood="bullish"
            streak={23}
          />
        </div>

        <SectionCards />

        {/* Main Content Tabs */}
        <div className="px-4 lg:px-6">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="network" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Network
              </TabsTrigger>
              <TabsTrigger value="leaderboard" className="flex items-center gap-2">
                <Trophy className="h-4 w-4" />
                Leaderboard
              </TabsTrigger>
              <TabsTrigger value="referrals" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Referrals
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6 mt-6">
              <ChartAreaInteractive />
              <NetworkSentiment
                userId={DEMO_USER_ID}
                fid={DEMO_USER_FID}
                className="mt-6"
              />
            </TabsContent>

            <TabsContent value="network" className="space-y-6 mt-6">
              <NetworkSentiment />
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Social Graph Stats</CardTitle>
                    <CardDescription>Your Farcaster network overview</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold">127</div>
                        <div className="text-sm text-muted-foreground">Following</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">89</div>
                        <div className="text-sm text-muted-foreground">Followers</div>
                      </div>
                    </div>
                    <Button className="w-full mt-4" variant="outline">
                      Sync Social Graph
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Network Reach</CardTitle>
                    <CardDescription>Estimated network size including connections</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <div className="text-3xl font-bold">2,847</div>
                      <div className="text-sm text-muted-foreground">Total reachable users</div>
                    </div>
                    <div className="mt-4 text-sm text-muted-foreground">
                      Based on your Farcaster connections and their networks
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="leaderboard" className="mt-6">
              <Leaderboard />
            </TabsContent>

            <TabsContent value="referrals" className="mt-6">
              <ReferralSystem
                userId={DEMO_USER_ID}
                userName="Crypto Trader"
              />
            </TabsContent>
          </Tabs>
        </div>

        <DataTable data={data} />
      </div>
    </div>
  )
}