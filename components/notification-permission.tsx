'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Bell, BellOff, Check, X, Clock, Smartphone } from 'lucide-react';

interface NotificationPermissionProps {
  className?: string;
  showOnMount?: boolean;
}

export function NotificationPermission({ className, showOnMount = false }: NotificationPermissionProps) {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [showDialog, setShowDialog] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);

      // Show dialog automatically if permission is default and not dismissed
      if (Notification.permission === 'default' && !dismissed && showOnMount) {
        // Show after a short delay to not interrupt user flow
        const timer = setTimeout(() => {
          setShowDialog(true);
        }, 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [dismissed, showOnMount]);

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      console.error('This browser does not support notifications');
      return;
    }

    setIsRequesting(true);

    try {
      const permission = await Notification.requestPermission();
      setPermission(permission);

      if (permission === 'granted') {
        setShowSuccess(true);
        setShowDialog(false);

        // Show a test notification
        await showTestNotification();

        // Schedule daily notifications
        await scheduleDailyNotifications();

        // Clear dismissed state
        localStorage.removeItem('notification-permission-dismissed');
      } else {
        console.log('Notification permission denied');
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    } finally {
      setIsRequesting(false);
    }
  };

  const showTestNotification = async () => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('🎉 Vibe Check Notifications Enabled!', {
        body: 'You\'ll receive daily reminders at 9 AM to log your crypto sentiment.',
        icon: '/icon-192x192.png',
        badge: '/icon-96x96.png',
        tag: 'welcome-notification',
        requireInteraction: false,
        silent: false,
      });
    }
  };

  const scheduleDailyNotifications = async () => {
    try {
      const response = await fetch('/api/notifications/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          time: '09:00',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          title: '🌅 Daily Vibe Check Reminder',
          body: 'Time to log your crypto sentiment for today!',
        }),
      });

      if (response.ok) {
        console.log('Daily notifications scheduled successfully');
      }
    } catch (error) {
      console.error('Failed to schedule daily notifications:', error);
    }
  };

  const handleDismiss = (permanent = false) => {
    setShowDialog(false);
    if (permanent) {
      setDismissed(true);
      localStorage.setItem('notification-permission-dismissed', 'true');
    }
  };

  const handleLater = () => {
    setShowDialog(false);
    // Ask again in 24 hours
    const askAgainTime = Date.now() + (24 * 60 * 60 * 1000);
    localStorage.setItem('ask-notifications-again', askAgainTime.toString());
  };

  // Check if we should ask again
  useEffect(() => {
    const askAgainTime = localStorage.getItem('ask-notifications-again');
    if (askAgainTime && Date.now() > parseInt(askAgainTime)) {
      localStorage.removeItem('ask-notifications-again');
      localStorage.removeItem('notification-permission-dismissed');
      setDismissed(false);
    }
  }, []);

  // Don't render if notifications aren't supported
  if (!('Notification' in window)) {
    return null;
  }

  // Don't show if already granted or permanently dismissed
  if (permission === 'granted' || dismissed) {
    return null;
  }

  // Success notification
  if (showSuccess) {
    return (
      <Alert className="bg-green-900/50 border-green-800 text-green-100">
        <Check className="h-4 w-4" />
        <AlertDescription className="text-sm">
          <div className="flex items-center justify-between">
            <span>Notifications enabled! You'll get daily reminders at 9 AM.</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowSuccess(false)}
              className="ml-2 text-green-300 hover:bg-green-900/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Permission Dialog
  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogContent className="sm:max-w-md bg-gray-900 text-white border-gray-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Bell className="h-6 w-6" />
            </div>
            Enable Daily Reminders
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Never miss logging your crypto sentiment with daily notifications
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert className="bg-blue-900/50 border-blue-800 text-blue-100">
            <Clock className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Get reminded every day at 9 AM to log your crypto market sentiment
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="bg-green-600/20 p-2 rounded-lg">
                <Bell className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <h4 className="font-medium text-sm">Daily 9 AM Reminders</h4>
                <p className="text-xs text-gray-400">Never miss a day of tracking your vibe</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-purple-600/20 p-2 rounded-lg">
                <Smartphone className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <h4 className="font-medium text-sm">Works on All Devices</h4>
                <p className="text-xs text-gray-400">Desktop and mobile notifications</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-orange-600/20 p-2 rounded-lg">
                <Check className="h-5 w-5 text-orange-400" />
              </div>
              <div>
                <h4 className="font-medium text-sm">Maintain Your Streak</h4>
                <p className="text-xs text-gray-400">Build consistency with daily check-ins</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-xs text-gray-400">
              We'll only send you one reminder per day. You can disable notifications anytime in your browser settings.
            </p>
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button
            onClick={requestPermission}
            disabled={isRequesting}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isRequesting ? (
              <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <Bell className="h-4 w-4 mr-2" />
            )}
            Enable Notifications
          </Button>
          <Button
            variant="outline"
            onClick={handleLater}
            className="border-gray-700 text-gray-400 hover:bg-gray-800"
          >
            Later
          </Button>
        </div>

        <div className="flex justify-center pt-2">
          <Button
            variant="ghost"
            onClick={() => handleDismiss(true)}
            className="text-xs text-gray-500 hover:text-gray-400"
          >
            Don't ask again
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Quick permission request button
export function QuickNotificationButton({ className }: { className?: string }) {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!('Notification' in window)) return;

    setIsRequesting(true);
    try {
      const newPermission = await Notification.requestPermission();
      setPermission(newPermission);

      if (newPermission === 'granted') {
        new Notification('🎉 Notifications Enabled!', {
          body: 'Daily reminders scheduled for 9 AM',
          icon: '/icon-192x192.png',
        });
      }
    } catch (error) {
      console.error('Failed to request permission:', error);
    } finally {
      setIsRequesting(false);
    }
  };

  if (!('Notification' in window) || permission === 'granted') {
    return null;
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={requestPermission}
      disabled={isRequesting}
      className={`${className} border-blue-700 text-blue-300 hover:bg-blue-900/20`}
    >
      {isRequesting ? (
        <div className="animate-spin h-4 w-4 mr-2 border-2 border-blue-400 border-t-transparent rounded-full" />
      ) : permission === 'denied' ? (
        <BellOff className="h-4 w-4 mr-2" />
      ) : (
        <Bell className="h-4 w-4 mr-2" />
      )}
      {permission === 'denied' ? 'Enable in Browser' : 'Enable Reminders'}
    </Button>
  );
}