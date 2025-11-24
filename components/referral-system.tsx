"use client";

import { useState } from "react";
import { Copy, Share2, Users, Gift, Lock, Unlock, Trophy, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ReferralSystemProps {
  userId: string;
  userName?: string;
}

export function ReferralSystem({ userId, userName }: ReferralSystemProps) {
  const [referralCode, setReferralCode] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [maxUses, setMaxUses] = useState(10);

  const { data: referralStatus, isLoading, refetch } = trpc.getUserReferralStatus.useQuery(
    { userId },
    { enabled: !!userId }
  );

  const { mutate: createReferralCode, isPending: isCreating } = trpc.createReferralCode.useMutation({
    onSuccess: (data) => {
      setReferralCode(data.code);
      setIsCreateDialogOpen(false);
      toast.success("Referral code created successfully!");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const { mutate: useReferralCode, isPending: isUsingCode } = trpc.useReferralCode.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard!");
    } catch (error) {
      toast.error("Failed to copy to clipboard");
    }
  };

  const shareReferralLink = async (code: string) => {
    const referralUrl = `${window.location.origin}?ref=${code}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join Vibe Check - Track Crypto Sentiment",
          text: `Join me on Vibe Check to track crypto sentiment and unlock network features! Use my referral code: ${code}`,
          url: referralUrl,
        });
      } catch (error) {
        // Fallback to copying if sharing is cancelled
        copyToClipboard(referralUrl);
      }
    } else {
      copyToClipboard(referralUrl);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading referral status...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-20 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasAccess = referralStatus?.hasFullAccess || false;
  const referralCount = referralStatus?.referralCount || 0;
  const progressPercentage = Math.min((referralCount / 3) * 100, 100);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5" />
          Referral System
        </CardTitle>
        <CardDescription>
          Invite friends to unlock full network sentiment access
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="status" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="status">Status</TabsTrigger>
            <TabsTrigger value="invite">Invite</TabsTrigger>
            <TabsTrigger value="referrals">History</TabsTrigger>
          </TabsList>

          <TabsContent value="status" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {hasAccess ? (
                    <Unlock className="h-5 w-5 text-green-500" />
                  ) : (
                    <Lock className="h-5 w-5 text-yellow-500" />
                  )}
                  <span className="font-medium">
                    Network Access: {hasAccess ? "Unlocked" : "Locked"}
                  </span>
                </div>
                <Badge variant={hasAccess ? "default" : "secondary"}>
                  {referralCount}/3 referrals
                </Badge>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress to unlock</span>
                  <span>{progressPercentage.toFixed(0)}%</span>
                </div>
                <Progress value={progressPercentage} className="w-full" />
              </div>

              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-semibold mb-2">Benefits of Full Access</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Complete network sentiment analysis</li>
                  <li>• Real-time sentiment trends</li>
                  <li>• Advanced filtering options</li>
                  <li>• Export sentiment data</li>
                </ul>
              </div>

              {hasAccess && referralStatus?.unlockedAt && (
                <Alert>
                  <Trophy className="h-4 w-4" />
                  <AlertDescription>
                    You unlocked full network access on {new Date(referralStatus.unlockedAt).toLocaleDateString()}!
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </TabsContent>

          <TabsContent value="invite" className="space-y-4">
            <div className="space-y-4">
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full">
                    <Gift className="h-4 w-4 mr-2" />
                    Create New Referral Code
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Referral Code</DialogTitle>
                    <DialogDescription>
                      Generate a new referral code to share with your friends
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="maxUses">Maximum Uses</Label>
                      <Input
                        id="maxUses"
                        type="number"
                        min="1"
                        max="100"
                        value={maxUses}
                        onChange={(e) => setMaxUses(parseInt(e.target.value) || 10)}
                        placeholder="Maximum number of uses"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => createReferralCode({ userId, maxUses })}
                        disabled={isCreating}
                        className="flex-1"
                      >
                        {isCreating ? "Creating..." : "Create Code"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setIsCreateDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {referralStatus?.referralCodes && referralStatus.referralCodes.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium">Your Referral Codes</h4>
                  {referralStatus.referralCodes.map((code) => (
                    <Card key={code.id} className="bg-muted/30">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="outline" className="font-mono text-sm">
                            {code.code}
                          </Badge>
                          <Badge variant={code.isActive ? "default" : "secondary"}>
                            {code.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground mb-3">
                          {code.currentUses}/{code.maxUses} uses
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(code.code)}
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copy Code
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => shareReferralLink(code.code)}
                          >
                            <Share2 className="h-3 w-3 mr-1" />
                            Share Link
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">How it works</h4>
                <ol className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                  <li>1. Create a referral code above</li>
                  <li>2. Share it with your friends</li>
                  <li>3. When they sign up with your code, you get credit</li>
                  <li>4. Get 3 referrals to unlock full network sentiment access</li>
                </ol>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="referrals" className="space-y-4">
            {referralStatus?.referrals && referralStatus.referrals.length > 0 ? (
              <div className="space-y-3">
                <h4 className="font-medium">Your Referrals</h4>
                {referralStatus.referrals.map((referral) => (
                  <Card key={referral.id} className="bg-muted/30">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">
                            {referral.referredUser?.name || "Anonymous User"}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {referral.referredUser?.email || "No email"}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Referred {new Date(referral.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant={referral.status === "completed" ? "default" : "secondary"}>
                            {referral.status === "completed" ? "Completed" : "Pending"}
                          </Badge>
                          {referral.completedAt && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {new Date(referral.completedAt).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No referrals yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Start inviting friends to see them here
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}