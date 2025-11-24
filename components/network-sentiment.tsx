"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  HelpCircle,
  Users,
  Lock,
  Unlock,
  RefreshCw,
  BarChart3
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

interface SentimentData {
  date: string;
  totalMoods: number;
  bullishCount: number;
  bearishCount: number;
  neutralCount: number;
  confusedCount: number;
  bullishPercentage: string;
  bearishPercentage: string;
  neutralPercentage: string;
  confusedPercentage: string;
}

interface NetworkSentimentProps {
  userId?: string;
  fid?: number;
  className?: string;
}

export function NetworkSentiment({ userId, fid, className }: NetworkSentimentProps) {
  const [activeTab, setActiveTab] = useState("overview");

  const { data: networkData, isLoading, error, refetch } = trpc.getNetworkSentiment.useQuery({
    userId,
    fid,
  });

  const { data: referralStatus } = trpc.getUserReferralStatus.useQuery(
    { userId: userId! },
    { enabled: !!userId }
  );

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Network Sentiment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !networkData?.hasAccess) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Network Sentiment Locked
          </CardTitle>
          <CardDescription>
            {networkData?.message || "Full network sentiment access requires 3 referrals"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            {referralStatus && (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  You have {referralStatus.referralCount}/3 referrals
                </div>
                <Progress value={(referralStatus.referralCount / 3) * 100} className="w-full" />
                <Button asChild>
                  <a href="/referrals">Get Referrals</a>
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const data = networkData.data as SentimentData;

  const sentimentItems = [
    {
      label: "Bullish 🚀",
      value: data.bullishCount,
      percentage: parseFloat(data.bullishPercentage),
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      icon: TrendingUp,
    },
    {
      label: "Bearish 🐻",
      value: data.bearishCount,
      percentage: parseFloat(data.bearishPercentage),
      color: "text-red-500",
      bgColor: "bg-red-500/10",
      icon: TrendingDown,
    },
    {
      label: "Neutral 😐",
      value: data.neutralCount,
      percentage: parseFloat(data.neutralPercentage),
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
      icon: Minus,
    },
    {
      label: "Confused 🤔",
      value: data.confusedCount,
      percentage: parseFloat(data.confusedPercentage),
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
      icon: HelpCircle,
    },
  ];

  const dominantSentiment = sentimentItems.reduce((prev, current) =>
    prev.value > current.value ? prev : current
  );

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            {fid ? "Your Network's" : "Network"} Sentiment
            <Badge variant="outline" className="ml-2">
              {fid ? "Social Graph" : "Global"}
            </Badge>
          </CardTitle>
          <CardDescription>
            {fid ? "Based on your Farcaster connections" : "Across all users"} • {data.date}
          </CardDescription>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          disabled={isLoading}
        >
          <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
        </Button>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-2xl font-bold">{data.totalMoods}</div>
                <div className="text-sm text-muted-foreground flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  Total Responses
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <dominantSentiment.icon className={cn("h-5 w-5", dominantSentiment.color)} />
                  <span className="text-2xl font-bold">{dominantSentiment.percentage.toFixed(1)}%</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {dominantSentiment.label}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {sentimentItems.map((item) => (
                <div key={item.label} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <item.icon className={cn("h-4 w-4", item.color)} />
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{item.value}</span>
                      <span className="text-sm font-bold">{item.percentage.toFixed(1)}%</span>
                    </div>
                  </div>
                  <Progress
                    value={item.percentage}
                    className="h-2"
                  />
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="breakdown" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {sentimentItems.map((item) => (
                <Card key={item.label} className={cn(item.bgColor)}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <item.icon className={cn("h-4 w-4", item.color)} />
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>
                    <div className="text-2xl font-bold mb-1">{item.percentage.toFixed(1)}%</div>
                    <div className="text-sm text-muted-foreground">{item.value} responses</div>
                    <Separator className="my-2" />
                    <div className="text-xs text-muted-foreground">
                      {item.percentage > 50
                        ? "Dominant sentiment"
                        : item.percentage > 25
                        ? "Significant minority"
                        : "Minority view"
                      }
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-semibold mb-2">Market Insights</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  {data.bullishCount > data.bearishCount
                    ? "📈 Market sentiment is leaning bullish"
                    : data.bearishCount > data.bullishCount
                    ? "📉 Market sentiment is leaning bearish"
                    : "📊 Market sentiment is evenly balanced"
                  }
                </p>
                <p>
                  {data.totalMoods > 100
                    ? "High engagement - strong community participation"
                    : data.totalMoods > 50
                    ? "Moderate engagement - growing community"
                    : "Building engagement - early stage community"
                  }
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}