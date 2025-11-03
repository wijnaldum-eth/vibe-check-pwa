'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Share2, Copy, Check, Twitter, MessageCircle, Frame, Bell } from 'lucide-react';

interface ShareButtonProps {
  username?: string;
  currentMood?: string;
  streak?: number;
  className?: string;
}

export function ShareButton({ username = 'Anonymous', currentMood = 'neutral', streak = 0, className }: ShareButtonProps) {
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string>('');
  const [isGeneratingFrame, setIsGeneratingFrame] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;

  const generateShareUrls = () => {
    const params = new URLSearchParams({
      username,
      mood: currentMood,
      streak: streak.toString(),
    });

    const ogImageUrl = `${baseUrl}/api/og/enhanced?${params.toString()}`;
    const frameUrl = `${baseUrl}/api/frame?${params.toString()}`;
    const dashboardUrl = `${baseUrl}/dashboard?${params.toString()}`;

    return {
      ogImageUrl,
      frameUrl,
      dashboardUrl,
      directImageUrl: `${baseUrl}/api/og/enhanced?${params.toString()}&frame=true`,
    };
  };

  const urls = generateShareUrls();

  const handleShare = async (platform: string) => {
    const shareText = generateShareText();
    const { frameUrl, dashboardUrl } = urls;

    switch (platform) {
      case 'twitter':
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(dashboardUrl)}`;
        window.open(twitterUrl, '_blank', 'width=550,height=420');
        break;

      case 'farcaster':
        // For Farcaster, we copy the frame URL to clipboard
        await copyToClipboard(frameUrl);
        break;

      case 'link':
        await copyToClipboard(dashboardUrl);
        break;

      case 'frame':
        await generateAndShareFrame();
        break;
    }
  };

  const generateShareText = () => {
    const moodEmojis = {
      bullish: '🚀',
      bearish: '🐻',
      neutral: '😐',
      confused: '🤔',
    };

    const emoji = moodEmojis[currentMood as keyof typeof moodEmojis] || '😐';
    let text = `${emoji} I'm feeling ${currentMood} about crypto today!`;

    if (streak > 0) {
      if (streak >= 100) text += ` 🔥 ${streak} day streak! I'm legendary!`;
      else if (streak >= 30) text += ` 💎 ${streak} day streak! Expert level!`;
      else if (streak >= 7) text += ` ⭐ ${streak} day streak! Building consistency!`;
      else if (streak >= 3) text += ` 🌱 ${streak} day streak and growing!`;
      else text += ` Day ${streak} of tracking my crypto sentiment!`;
    }

    text += ' Track your vibe with me on Vibe Check 📊';
    return text;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedLink(text);
      setTimeout(() => setCopiedLink(''), 3000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const generateAndShareFrame = async () => {
    setIsGeneratingFrame(true);
    try {
      const { frameUrl } = urls;

      // In a real implementation, you might:
      // 1. Generate a unique frame URL
      // 2. Save it to your database
      // 3. Return a shareable link

      await copyToClipboard(frameUrl);

      // Show success notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Frame Generated!', {
          body: 'Frame link copied to clipboard. Share it on Farcaster!',
          icon: '/icon-192x192.png',
        });
      }
    } catch (error) {
      console.error('Failed to generate frame:', error);
    } finally {
      setIsGeneratingFrame(false);
    }
  };

  const enableNotifications = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        new Notification('Vibe Check Notifications Enabled!', {
          body: 'You\'ll receive daily reminders to log your crypto sentiment.',
          icon: '/icon-192x192.png',
        });
      }
    }
  };

  return (
    <div className={className}>
      <Button
        onClick={() => setShowShareDialog(true)}
        className="bg-blue-600 hover:bg-blue-700 text-white"
      >
        <Share2 className="h-4 w-4 mr-2" />
        Share Vibe
      </Button>

      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="sm:max-w-md bg-gray-900 text-white border-gray-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Share2 className="h-6 w-6" />
              Share Your Vibe
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Share your crypto sentiment streak with your network
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Current Status Preview */}
            <Alert className="bg-blue-900/50 border-blue-800 text-blue-100">
              <div className="flex items-center gap-2">
                <span className="text-2xl">
                  {currentMood === 'bullish' ? '🚀' :
                   currentMood === 'bearish' ? '🐻' :
                   currentMood === 'confused' ? '🤔' : '😐'}
                </span>
                <div>
                  <div className="font-medium capitalize">{currentMood}</div>
                  {streak > 0 && (
                    <div className="text-sm opacity-80">{streak} day streak</div>
                  )}
                </div>
              </div>
            </Alert>

            {/* Share Options */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={() => handleShare('twitter')}
                className="border-gray-700 text-gray-300 hover:bg-gray-800 justify-start"
              >
                <Twitter className="h-4 w-4 mr-2" />
                Twitter
              </Button>

              <Button
                variant="outline"
                onClick={() => handleShare('farcaster')}
                className="border-purple-700 text-purple-300 hover:bg-purple-900/20 justify-start"
              >
                <Frame className="h-4 w-4 mr-2" />
                Farcaster
              </Button>

              <Button
                variant="outline"
                onClick={() => handleShare('frame')}
                disabled={isGeneratingFrame}
                className="border-green-700 text-green-300 hover:bg-green-900/20 justify-start"
              >
                {isGeneratingFrame ? (
                  <div className="animate-spin h-4 w-4 mr-2 border-2 border-green-400 border-t-transparent rounded-full" />
                ) : (
                  <MessageCircle className="h-4 w-4 mr-2" />
                )}
                {isGeneratingFrame ? 'Generating...' : 'Frame Link'}
              </Button>

              <Button
                variant="outline"
                onClick={() => handleShare('link')}
                className="border-gray-700 text-gray-300 hover:bg-gray-800 justify-start"
              >
                {copiedLink === urls.dashboardUrl ? (
                  <Check className="h-4 w-4 mr-2 text-green-400" />
                ) : (
                  <Copy className="h-4 w-4 mr-2" />
                )}
                {copiedLink === urls.dashboardUrl ? 'Copied!' : 'Copy Link'}
              </Button>
            </div>

            {/* Notifications */}
            {('Notification' in window && Notification.permission === 'default') && (
              <Alert className="bg-orange-900/50 border-orange-800 text-orange-100">
                <Bell className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <div className="flex items-center justify-between">
                    <span>Enable daily reminders?</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={enableNotifications}
                      className="ml-2 border-orange-700 text-orange-300 hover:bg-orange-900/20"
                    >
                      Enable
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Preview Image */}
            <div className="mt-4">
              <div className="text-sm text-gray-400 mb-2">Preview:</div>
              <img
                src={urls.ogImageUrl}
                alt="Share preview"
                className="w-full rounded-lg border border-gray-700"
              />
            </div>

            {/* Share Text */}
            <div className="text-sm text-gray-400 bg-gray-800 p-3 rounded-lg">
              <div className="font-medium text-gray-300 mb-1">Share text:</div>
              <div>{generateShareText()}</div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowShareDialog(false)}
              className="flex-1 border-gray-700 text-gray-400 hover:bg-gray-800"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Hook for sharing functionality
export function useShare() {
  const [isSharing, setIsSharing] = useState(false);
  const [shareResult, setShareResult] = useState<{ success: boolean; message: string } | null>(null);

  const shareToFarcaster = async (data: {
    username: string;
    mood: string;
    streak: number;
  }) => {
    setIsSharing(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
      const params = new URLSearchParams({
        username: data.username,
        mood: data.mood,
        streak: data.streak.toString(),
      });

      const frameUrl = `${baseUrl}/frame?${params.toString()}`;

      // Copy to clipboard
      await navigator.clipboard.writeText(frameUrl);

      setShareResult({
        success: true,
        message: 'Frame link copied to clipboard! Paste it in Farcaster to share.',
      });

      // Show notification if enabled
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Frame Ready to Share!', {
          body: 'Frame link copied. Share it on Farcaster!',
          icon: '/icon-192x192.png',
        });
      }

      return frameUrl;
    } catch (error) {
      setShareResult({
        success: false,
        message: 'Failed to generate frame link. Please try again.',
      });
      console.error('Farcaster share error:', error);
      return null;
    } finally {
      setIsSharing(false);
    }
  };

  return {
    isSharing,
    shareResult,
    shareToFarcaster,
    clearResult: () => setShareResult(null),
  };
}