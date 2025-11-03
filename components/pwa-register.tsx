'use client';

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function PWARegister() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('SW registered: ', registration);
          setSwRegistration(registration);

          // Check for existing subscription
          return registration.pushManager.getSubscription();
        })
        .then((subscription) => {
          if (subscription) {
            console.log('User is subscribed to push notifications');
          }
        })
        .catch((error) => {
          console.error('SW registration failed: ', error);
        });
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check current notification permission
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);

        if (permission === 'granted') {
          console.log('Notification permission granted');

          // Subscribe to push notifications if service worker is registered
          if (swRegistration) {
            try {
              const subscription = await subscribeUserToPush(swRegistration);
              console.log('User subscribed to push notifications');

              // Send subscription to server
              await sendSubscriptionToServer(subscription);
            } catch (error) {
              console.error('Failed to subscribe user to push:', error);
            }
          }
        } else {
          console.log('Notification permission denied');
        }
      } catch (error) {
        console.error('Error requesting notification permission:', error);
      }
    }
  };

  const subscribeUserToPush = async (registration: ServiceWorkerRegistration) => {
    if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
      throw new Error('VAPID public key not configured');
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY)
    });

    return subscription;
  };

  const sendSubscriptionToServer = async (subscription: PushSubscription) => {
    try {
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send subscription to server');
      }

      return await response.json();
    } catch (error) {
      console.error('Error sending subscription to server:', error);
      throw error;
    }
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return;
    }

    deferredPrompt.prompt();

    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to install prompt: ${outcome}`);

    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  const scheduleDailyNotification = async () => {
    if (notificationPermission !== 'granted') {
      await requestNotificationPermission();
    }

    if (swRegistration && notificationPermission === 'granted') {
      try {
        // Schedule daily 9 AM notification
        const response = await fetch('/api/notifications/schedule', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            time: '09:00',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            title: '🚀 Daily Vibe Check Reminder',
            body: 'Time to log your crypto sentiment for today!',
          }),
        });

        if (response.ok) {
          console.log('Daily notification scheduled successfully');
        }
      } catch (error) {
        console.error('Failed to schedule daily notification:', error);
      }
    }
  };

  return null; // This component only handles PWA registration logic
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Export hook for notification permission and installation
export function usePWA() {
  const [canInstall, setCanInstall] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setCanInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      return permission;
    }
    return 'denied';
  };

  return {
    canInstall,
    notificationPermission,
    requestNotificationPermission,
  };
}