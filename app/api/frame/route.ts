import { NextRequest, NextResponse } from 'next/server';
import { getUserMoodData } from '@/lib/og-utils';
import { frame } from 'frames.js/core';
import { Button } from 'frames.js/core';

// Base URL for the app
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Define frame schema using frames.js
export const GET = frame({
  image: async (ctx) => {
    // Get user ID from frame state or query params
    const userId = ctx.searchParams.userId || ctx.state?.userId || 'demo';
    const mood = ctx.searchParams.mood || ctx.state?.mood || 'neutral';
    const streak = parseInt(ctx.searchParams.streak || ctx.state?.streak || '0');
    const username = ctx.searchParams.username || ctx.state?.username || 'Crypto Trader';

    // Try to get real user data if userId is provided
    let userData = null;
    if (userId && userId !== 'demo') {
      userData = await getUserMoodData(userId);
    }

    // Use real data if available, otherwise use query params
    const finalUsername = userData?.username || username;
    const finalMood = userData?.currentMood || mood;
    const finalStreak = userData?.streak || streak;
    const finalNetworkSentiment = userData?.networkSentiment;

    // Generate OG image URL
    const imageUrl = `${BASE_URL}/api/og/enhanced?userId=${userId}&username=${encodeURIComponent(finalUsername)}&mood=${finalMood}&streak=${finalStreak}&networkSentiment=${encodeURIComponent(finalNetworkSentiment || '')}&frame=true`;

    return {
      url: imageUrl,
      aspectRatio: '1.91:1', // Standard for frames
    };
  },
  buttons: [
    {
      label: '📊 View Streak',
      action: 'post',
      target: `${BASE_URL}/api/frame?action=streak`,
    },
    {
      label: '🔄 Log Today',
      action: 'post',
      target: `${BASE_URL}/api/frame?action=log`,
    },
    {
      label: '🌐 Network',
      action: 'post',
      target: `${BASE_URL}/api/frame?action=network`,
    },
    {
      label: '🚀 Share',
      action: 'link',
      target: `${BASE_URL}/dashboard?ref=frame`,
    },
  ],
  textInput: 'Share your crypto mood...',
  title: 'Vibe Check - Crypto Sentiment Tracker',
  description: 'Track your daily crypto sentiment and see what your network thinks about the market.',
  handler: async (ctx) => {
    // Handle frame interactions
    const action = ctx.searchParams.action || 'home';
    const userId = ctx.state?.userId || ctx.searchParams.userId || 'demo';
    const textInput = ctx.input?.text || '';

    // Parse the action and update state accordingly
    let newState = {
      ...ctx.state,
      userId,
      lastAction: action,
      lastInteraction: new Date().toISOString(),
    };

    switch (action) {
      case 'streak':
        // Show streak details
        newState.view = 'streak';
        break;
      case 'log':
        // Log mood from text input
        if (textInput) {
          const mood = parseMoodFromText(textInput);
          newState.mood = mood;
          newState.justLogged = true;

          // Here you would save to database
          // await saveMoodEntry(userId, mood, textInput);
        }
        break;
      case 'network':
        // Show network sentiment
        newState.view = 'network';
        break;
      default:
        newState.view = 'home';
    }

    return {
      state: newState,
      // Return the same frame with updated state
      image: await generateFrameImage(newState),
    };
  },
});

// Handle POST requests for frame interactions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { untrustedData } = body;

    if (!untrustedData) {
      return NextResponse.json(
        { error: 'Invalid frame request' },
        { status: 400 }
      );
    }

    const { buttonIndex, inputText, state } = untrustedData;
    const parsedState = state ? JSON.parse(state) : {};

    let newState = { ...parsedState };
    let imageUrl = `${BASE_URL}/api/og/enhanced?frame=true`;

    // Handle button interactions
    switch (buttonIndex) {
      case 1: // View Streak
        newState.view = 'streak';
        break;
      case 2: // Log Today
        if (inputText) {
          const mood = parseMoodFromText(inputText);
          newState.mood = mood;
          newState.justLogged = true;
          newState.lastMoodInput = inputText;
        }
        break;
      case 3: // Network
        newState.view = 'network';
        break;
      case 4: // Share (link button - doesn't come to POST)
        break;
    }

    // Update image URL with current state
    if (newState.userId) {
      imageUrl += `&userId=${newState.userId}`;
    }
    if (newState.mood) {
      imageUrl += `&mood=${newState.mood}`;
    }
    if (newState.streak) {
      imageUrl += `&streak=${newState.streak}`;
    }
    if (newState.view && newState.view !== 'home') {
      imageUrl += `&type=${newState.view}`;
    }

    // Generate frame HTML response
    const frameHtml = generateFrameHTML({
      imageUrl,
      buttons: getFrameButtons(newState.view),
      textInput: newState.view === 'home' ? 'Share your crypto mood...' : undefined,
      state: JSON.stringify(newState),
      postUrl: `${BASE_URL}/api/frame`,
    });

    return new NextResponse(frameHtml, {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Frame POST error:', error);
    return NextResponse.json(
      { error: 'Frame processing failed' },
      { status: 500 }
    );
  }
}

// Helper function to parse mood from text input
function parseMoodFromText(text: string): string {
  const lowerText = text.toLowerCase();

  if (lowerText.includes('bullish') || lowerText.includes('🚀') || lowerText.includes('up') || lowerText.includes('moon')) {
    return 'bullish';
  } else if (lowerText.includes('bearish') || lowerText.includes('🐻') || lowerText.includes('down') || lowerText.includes('dump')) {
    return 'bearish';
  } else if (lowerText.includes('confused') || lowerText.includes('🤔') || lowerText.includes('uncertain') || lowerText.includes('not sure')) {
    return 'confused';
  } else {
    return 'neutral';
  }
}

// Helper function to generate frame HTML
function generateFrameHTML({
  imageUrl,
  buttons,
  textInput,
  state,
  postUrl,
}: {
  imageUrl: string;
  buttons: Array<{ label: string; action: string; target?: string }>;
  textInput?: string;
  state?: string;
  postUrl?: string;
}) {
  const frameTags = [
    `<meta property="fc:frame" content="vNext" />`,
    `<meta property="fc:frame:image" content="${imageUrl}" />`,
    `<meta property="fc:frame:post_url" content="${postUrl || `${BASE_URL}/api/frame`}" />`,
    ...(textInput ? [`<meta property="fc:frame:text_input" content="${textInput}" />`] : []),
    ...buttons.map((button, index) =>
      `<meta property="fc:frame:button:${index + 1}" content="${button.label}" />` +
      (button.target ? `<meta property="fc:frame:button:${index + 1}:action" content="${button.action}" />` : '') +
      (button.target ? `<meta property="fc:frame:button:${index + 1}:target" content="${button.target}" />` : '')
    ),
    ...(state ? [`<meta property="fc:frame:state" content="${state}" />`] : []),
  ];

  return `<!DOCTYPE html>
<html>
<head>
  <title>Vibe Check Frame</title>
  ${frameTags.join('\n  ')}
  <meta property="og:title" content="Vibe Check - Crypto Sentiment Tracker" />
  <meta property="og:description" content="Track your daily crypto sentiment and see what your network thinks about the market." />
  <meta property="og:image" content="${imageUrl}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Vibe Check - Crypto Sentiment Tracker" />
  <meta name="twitter:description" content="Track your daily crypto sentiment and see what your network thinks about the market." />
  <meta name="twitter:image" content="${imageUrl}" />
</head>
<body>
  <h1>Vibe Check - Crypto Sentiment Tracker</h1>
  <p>Track your daily crypto sentiment and see what your network thinks about the market.</p>
</body>
</html>`;
}

// Helper function to get frame buttons based on current view
function getFrameButtons(view?: string) {
  const baseUrl = `${BASE_URL}/api/frame`;

  switch (view) {
    case 'streak':
      return [
        { label: '📊 Details', action: 'post', target: `${baseUrl}?action=streak_details` },
        { label: '🔄 Log Today', action: 'post', target: `${baseUrl}?action=log` },
        { label: '🏆 Leaderboard', action: 'post', target: `${baseUrl}?action=leaderboard` },
        { label: '🔙 Back', action: 'post', target: `${baseUrl}?action=home` },
      ];
    case 'network':
      return [
        { label: '📈 Stats', action: 'post', target: `${baseUrl}?action=network_stats` },
        { label: '👥 Top Moods', action: 'post', target: `${baseUrl}?action=top_moods` },
        { label: '🔄 Refresh', action: 'post', target: `${baseUrl}?action=network` },
        { label: '🔙 Back', action: 'post', target: `${baseUrl}?action=home` },
      ];
    default:
      return [
        { label: '📊 View Streak', action: 'post', target: `${baseUrl}?action=streak` },
        { label: '🔄 Log Today', action: 'post', target: `${baseUrl}?action=log` },
        { label: '🌐 Network', action: 'post', target: `${baseUrl}?action=network` },
        { label: '🚀 Open App', action: 'link', target: `${BASE_URL}/dashboard?ref=frame` },
      ];
  }
}

// Helper function to generate frame image URL based on state
async function generateFrameImage(state: any) {
  const params = new URLSearchParams();
  params.set('frame', 'true');

  if (state.userId) params.set('userId', state.userId);
  if (state.username) params.set('username', state.username);
  if (state.mood) params.set('mood', state.mood);
  if (state.streak) params.set('streak', state.streak.toString());
  if (state.view && state.view !== 'home') params.set('type', state.view);

  return `${BASE_URL}/api/og/enhanced?${params.toString()}`;
}