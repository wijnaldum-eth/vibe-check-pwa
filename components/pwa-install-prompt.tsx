'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { X, Download, Bell, Zap, Shield } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWAInstallPromptProps {
  className?: string;
}

export function PWAInstallPrompt({ className }: PWAInstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallDialog, setShowInstallDialog] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [dismissedCount, setDismissedCount] = useState(0);

  useEffect(() => {
    // Check if user has previously dismissed the prompt
    const hasDismissed = localStorage.getItem('pwa-install-dismissed');
    const dismissalCount = parseInt(localStorage.getItem('pwa-install-dismissal-count') || '0');
    const lastDismissal = localStorage.getItem('pwa-install-last-dismissal');

    setDismissedCount(dismissalCount);

    // Don't show if dismissed more than 3 times
    if (dismissalCount >= 3) {
      return;
    }

    // Don't show if dismissed in the last 7 days
    if (lastDismissal) {
      const daysSinceLastDismissal = Math.floor(
        (Date.now() - parseInt(lastDismissal)) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceLastDismissal < 7) {
        return;
      }
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      setIsInstallable(true);

      // Show banner after a delay or user interaction
      const showBannerDelay = setTimeout(() => {
        setShowInstallBanner(true);
      }, 5000); // Show after 5 seconds

      return () => clearTimeout(showBannerDelay);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstallable(false);
      setDeferredPrompt(null);
      setShowInstallBanner(false);
      setShowInstallDialog(false);
      localStorage.setItem('pwa-install-dismissed', 'true');
      console.log('PWA was installed');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [dismissedCount]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return;
    }

    setShowInstallBanner(false);
    setShowInstallDialog(true);
  };

  const handleInstallConfirm = async () => {
    if (!deferredPrompt) {
      return;
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      console.log(`User response to install prompt: ${outcome}`);

      if (outcome === 'accepted') {
        // Clear dismissed state when user accepts
        localStorage.removeItem('pwa-install-dismissed');
        localStorage.removeItem('pwa-install-dismissal-count');
        localStorage.removeItem('pwa-install-last-dismissal');
      }

      setDeferredPrompt(null);
      setIsInstallable(false);
      setShowInstallDialog(false);
    } catch (error) {
      console.error('Error during PWA installation:', error);
    }
  };

  const handleDismiss = (permanent = false) => {
    setShowInstallBanner(false);
    setShowInstallDialog(false);

    if (permanent) {
      const newDismissalCount = dismissedCount + 1;
      setDismissedCount(newDismissalCount);

      localStorage.setItem('pwa-install-dismissed', 'true');
      localStorage.setItem('pwa-install-dismissal-count', newDismissalCount.toString());
      localStorage.setItem('pwa-install-last-dismissal', Date.now().toString());

      // If dismissed 3+ times, don't show again
      if (newDismissalCount >= 3) {
        setDeferredPrompt(null);
        setIsInstallable(false);
      }
    }
  };

  if (!isInstallable || (!showInstallBanner && !showInstallDialog)) {
    return null;
  }

  // Install Banner (bottom sheet style)
  if (showInstallBanner) {
    return (
      <div className={`fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 shadow-2xl border-t border-blue-500 animate-in slide-in-from-bottom duration-300 ${className}`}>
        <div className="max-w-md mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <Download className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Install Vibe Check</h3>
              <p className="text-xs text-blue-100">Get daily reminders & offline access</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={handleInstallClick}
              className="bg-white text-blue-600 hover:bg-blue-50 text-xs px-3 py-1 h-auto"
            >
              Install
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleDismiss(false)}
              className="text-white/80 hover:text-white hover:bg-white/10 p-1 h-auto"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Install Dialog
  return (
    <Dialog open={showInstallDialog} onOpenChange={setShowInstallDialog}>
      <DialogContent className="sm:max-w-md bg-gray-900 text-white border-gray-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Download className="h-6 w-6" />
            </div>
            Install Vibe Check
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Get the full crypto sentiment tracking experience on your device
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert className="bg-blue-900/50 border-blue-800 text-blue-100">
            <Zap className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Install Vibe Check to unlock powerful features
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="bg-green-600/20 p-2 rounded-lg">
                <Bell className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <h4 className="font-medium text-sm">Daily 9AM Reminders</h4>
                <p className="text-xs text-gray-400">Never miss logging your crypto sentiment</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-purple-600/20 p-2 rounded-lg">
                <Shield className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <h4 className="font-medium text-sm">Offline Access</h4>
                <p className="text-xs text-gray-400">Track your vibe even without internet</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-orange-600/20 p-2 rounded-lg">
                <Zap className="h-5 w-5 text-orange-400" />
              </div>
              <div>
                <h4 className="font-medium text-sm">Lightning Fast</h4>
                <p className="text-xs text-gray-400">Instant launch and smooth animations</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-xs text-gray-400 mb-2">You'll get:</p>
            <ul className="text-xs text-gray-300 space-y-1">
              <li>• Icon on your home screen</li>
              <li>• Full-screen experience</li>
              <li>• Daily push notifications</li>
              <li>• Offline mood tracking</li>
            </ul>
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button
            onClick={handleInstallConfirm}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
          >
            Install Now
          </Button>
          <Button
            variant="outline"
            onClick={() => handleDismiss(true)}
            className="border-gray-700 text-gray-400 hover:bg-gray-800"
          >
            Not Now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook for components to check PWA installability
export function usePWAInstall() {
  const [canInstall, setCanInstall] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      setCanInstall(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      setDeferredPrompt(null);
      setCanInstall(false);

      return outcome === 'accepted';
    } catch (error) {
      console.error('PWA install error:', error);
      return false;
    }
  };

  return {
    canInstall,
    install,
  };
}