import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';

// Configure VAPID keys
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

// In-memory storage for scheduled notifications (in production, use a database)
const scheduledNotifications = new Map<string, {
  time: string;
  timezone: string;
  title: string;
  body: string;
  userId?: string;
  subscription: any;
}>();

export async function POST(request: NextRequest) {
  try {
    const { time, timezone, title, body, userId, subscription } = await request.json();

    if (!time || !title || !body) {
      return NextResponse.json(
        { error: 'Time, title, and body are required' },
        { status: 400 }
      );
    }

    // Validate time format (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
    if (!timeRegex.test(time)) {
      return NextResponse.json(
        { error: 'Invalid time format. Use HH:MM format.' },
        { status: 400 }
      );
    }

    // Store the scheduled notification
    const notificationId = `schedule_${Date.now()}_${Math.random()}`;
    scheduledNotifications.set(notificationId, {
      time,
      timezone: timezone || 'UTC',
      title,
      body,
      userId,
      subscription
    });

    console.log('Scheduled notification:', { notificationId, time, title });

    // For demo purposes, we'll simulate sending a notification immediately
    // In production, you would use a cron job or task queue to send at the scheduled time
    if (subscription) {
      try {
        await webpush.sendNotification(
          subscription,
          JSON.stringify({
            title: `⏰ ${title}`,
            body: `${body} (Scheduled for ${time} ${timezone})`,
            icon: '/icon-192x192.png',
            badge: '/icon-96x96.png',
            data: {
              url: '/dashboard?log=true',
              type: 'scheduled',
              scheduledTime: time,
              notificationId
            }
          })
        );

        console.log('Test notification sent for schedule:', notificationId);
      } catch (pushError) {
        console.error('Failed to send test notification:', pushError);
        // Don't fail the scheduling if test notification fails
      }
    }

    return NextResponse.json({
      success: true,
      message: `Notification scheduled for ${time} ${timezone}`,
      notificationId
    });

  } catch (error) {
    console.error('Schedule notification error:', error);
    return NextResponse.json(
      { error: 'Failed to schedule notification' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Return scheduled notifications for a user (if userId is provided)
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    let notifications = Array.from(scheduledNotifications.entries());

    if (userId) {
      notifications = notifications.filter(([_, notification]) =>
        notification.userId === userId
      );
    }

    return NextResponse.json({
      success: true,
      notifications: notifications.map(([id, notification]) => ({
        id,
        ...notification
      }))
    });

  } catch (error) {
    console.error('Get scheduled notifications error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve scheduled notifications' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get('id');

    if (!notificationId) {
      return NextResponse.json(
        { error: 'Notification ID is required' },
        { status: 400 }
      );
    }

    const deleted = scheduledNotifications.delete(notificationId);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Scheduled notification not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Scheduled notification cancelled'
    });

  } catch (error) {
    console.error('Cancel scheduled notification error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel scheduled notification' },
      { status: 500 }
    );
  }
}