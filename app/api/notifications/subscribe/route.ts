import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';

// Configure VAPID keys (these should be environment variables)
const vapidKeys = {
  publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
  privateKey: process.env.VAPID_PRIVATE_KEY || '',
  subject: process.env.VAPID_SUBJECT || 'mailto:contact@vibecheck.app',
};

// Initialize web-push with VAPID keys
webpush.setVapidDetails(
  vapidKeys.subject,
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

export async function POST(request: NextRequest) {
  try {
    const { subscription } = await request.json();

    if (!subscription) {
      return NextResponse.json(
        { error: 'Subscription object is required' },
        { status: 400 }
      );
    }

    // Validate subscription object
    if (!subscription.endpoint || !subscription.keys) {
      return NextResponse.json(
        { error: 'Invalid subscription object' },
        { status: 400 }
      );
    }

    // In a real app, you would store this subscription in your database
    // For now, we'll just validate and acknowledge
    console.log('Received subscription:', subscription.endpoint);

    // Test the subscription by sending a welcome notification
    try {
      await webpush.sendNotification(
        subscription,
        JSON.stringify({
          title: '🎉 Welcome to Vibe Check!',
          body: 'You\'ll receive daily reminders at 9 AM to log your crypto sentiment.',
          icon: '/icon-192x192.png',
          badge: '/icon-96x96.png',
          data: {
            url: '/dashboard',
            type: 'welcome'
          }
        })
      );
    } catch (pushError) {
      console.error('Failed to send welcome notification:', pushError);
      // Don't fail the subscription if welcome notification fails
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully subscribed to push notifications'
    });

  } catch (error) {
    console.error('Subscription error:', error);
    return NextResponse.json(
      { error: 'Failed to process subscription' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { subscription } = await request.json();

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json(
        { error: 'Subscription endpoint is required' },
        { status: 400 }
      );
    }

    // In a real app, you would remove this subscription from your database
    console.log('Unsubscribed:', subscription.endpoint);

    return NextResponse.json({
      success: true,
      message: 'Successfully unsubscribed from push notifications'
    });

  } catch (error) {
    console.error('Unsubscription error:', error);
    return NextResponse.json(
      { error: 'Failed to process unsubscription' },
      { status: 500 }
    );
  }
}