import { NextRequest } from 'next/server';
import crypto from 'crypto';

// Frame validation utilities
export interface FrameMessage {
  untrustedData: {
    fid?: number;
    url?: string;
    messageHash?: string;
    nonce?: string;
    timestamp?: number;
    network?: number;
    buttonIndex?: number;
    inputText?: string;
    state?: string;
  };
  trustedData?: {
    messageBytes?: string;
  };
}

// Farcaster network IDs
export const FARCASTER_NETWORKS = {
  MAINNET: 1,
  TESTNET: 2,
  DEVNET: 3,
} as const;

// Validate frame message (basic validation)
export function validateFrameMessage(request: NextRequest): FrameMessage | null {
  try {
    // For development, we'll accept untrusted data
    // In production, you should validate the trustedData.messageBytes
    // using Farcaster's Ed25519 signature verification

    const body = request.body;
    if (!body) return null;

    return body as FrameMessage;
  } catch (error) {
    console.error('Frame validation error:', error);
    return null;
  }
}

// Generate frame state
export function generateFrameState(data: Record<string, any>): string {
  return Buffer.from(JSON.stringify(data)).toString('base64');
}

// Parse frame state
export function parseFrameState(state: string): Record<string, any> {
  try {
    return JSON.parse(Buffer.from(state, 'base64').toString());
  } catch (error) {
    console.error('Frame state parsing error:', error);
    return {};
  }
}

// Generate frame URL with parameters
export function generateFrameUrl(
  baseUrl: string,
  params: Record<string, string | number | boolean>
): string {
  const url = new URL(baseUrl);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, String(value));
  });
  return url.toString();
}

// Frame button configurations
export const FRAME_BUTTONS = {
  HOME: [
    { label: '📊 View Streak', action: 'post' },
    { label: '🔄 Log Today', action: 'post' },
    { label: '🌐 Network', action: 'post' },
    { label: '🚀 Open App', action: 'link' },
  ],
  STREAK: [
    { label: '📈 Details', action: 'post' },
    { label: '🏆 Leaderboard', action: 'post' },
    { label: '🔄 Log Mood', action: 'post' },
    { label: '🔙 Back', action: 'post' },
  ],
  NETWORK: [
    { label: '📊 Stats', action: 'post' },
    { label: '👥 Top Moods', action: 'post' },
    { label: '🔄 Refresh', action: 'post' },
    { label: '🔙 Back', action: 'post' },
  ],
} as const;

// Frame response HTML template
export function createFrameHtml(options: {
  imageUrl: string;
  buttons: Array<{ label: string; action: string; target?: string }>;
  textInput?: string;
  state?: string;
  postUrl?: string;
  title?: string;
  description?: string;
}): string {
  const {
    imageUrl,
    buttons,
    textInput,
    state,
    postUrl,
    title = 'Vibe Check - Crypto Sentiment Tracker',
    description = 'Track your daily crypto sentiment and see what your network thinks about the market.',
  } = options;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const frameMetaTags = [
    `<meta property="fc:frame" content="vNext" />`,
    `<meta property="fc:frame:image" content="${imageUrl}" />`,
    `<meta property="fc:frame:post_url" content="${postUrl || `${baseUrl}/api/frame`}" />`,
    ...(textInput ? [`<meta property="fc:frame:text_input" content="${textInput}" />`] : []),
    ...buttons.flatMap((button, index) => {
      const tags = [
        `<meta property="fc:frame:button:${index + 1}" content="${button.label}" />`,
      ];

      if (button.action && button.action !== 'post') {
        tags.push(`<meta property="fc:frame:button:${index + 1}:action" content="${button.action}" />`);
      }

      if (button.target) {
        tags.push(`<meta property="fc:frame:button:${index + 1}:target" content="${button.target}" />`);
      }

      return tags;
    }),
    ...(state ? [`<meta property="fc:frame:state" content="${state}" />`] : []),
  ];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>

  <!-- Frame metadata -->
  ${frameMetaTags.join('\n  ')}

  <!-- Open Graph metadata -->
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:image" content="${imageUrl}" />
  <meta property="og:type" content="website" />

  <!-- Twitter Card metadata -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${imageUrl}" />

  <!-- Basic styling -->
  <style>
    body {
      margin: 0;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #000;
      color: #fff;
      text-align: center;
    }
    h1 {
      margin: 0 0 10px 0;
      font-size: 24px;
    }
    p {
      margin: 0;
      opacity: 0.8;
      font-size: 16px;
    }
    .frame-preview {
      max-width: 600px;
      margin: 20px auto;
      border: 2px solid #333;
      border-radius: 16px;
      overflow: hidden;
    }
    .frame-image {
      width: 100%;
      height: auto;
      display: block;
    }
  </style>
</head>
<body>
  <div class="frame-preview">
    <img src="${imageUrl}" alt="${title}" class="frame-image" />
  </div>
  <h1>${title}</h1>
  <p>${description}</p>
</body>
</html>`;
}

// Mood parsing utilities
export const MOOD_PATTERNS = {
  bullish: [
    /bullish/gi,
    /🚀/gi,
    /moon/gi,
    /to the moon/gi,
    /up/gi,
    /pump/gi,
    /💚/gi,
    /🟢/gi,
    /📈/gi,
  ],
  bearish: [
    /bearish/gi,
    /🐻/gi,
    /down/gi,
    /dump/gi,
    /crash/gi,
    /❤️/gi,
    /🔴/gi,
    /📉/gi,
  ],
  confused: [
    /confused/gi,
    /🤔/gi,
    /uncertain/gi,
    /not sure/gi,
    /idk/gi,
    /maybe/gi,
    /🟡/gi,
  ],
  neutral: [
    /neutral/gi,
    /😐/gi,
    /meh/gi,
    /okay/gi,
    /fine/gi,
    /⚪/gi,
    /🔵/gi,
  ],
} as const;

export function parseMoodFromText(text: string): 'bullish' | 'bearish' | 'neutral' | 'confused' {
  const lowerText = text.toLowerCase();

  for (const [mood, patterns] of Object.entries(MOOD_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(lowerText)) {
        return mood as 'bullish' | 'bearish' | 'neutral' | 'confused';
      }
    }
  }

  return 'neutral';
}

// Frame analytics (for tracking interactions)
export class FrameAnalytics {
  static async trackInteraction(
    fid: number,
    action: string,
    buttonIndex?: number,
    inputText?: string
  ) {
    // Here you would track frame interactions in your analytics system
    console.log('Frame interaction:', {
      fid,
      action,
      buttonIndex,
      inputText,
      timestamp: new Date().toISOString(),
    });

    // In production, you might send this to:
    // - Your database
    // - Google Analytics
    // - Mixpanel
    // - Custom analytics endpoint
  }

  static async trackMoodSubmission(
    fid: number,
    mood: string,
    inputText: string
  ) {
    console.log('Mood submitted via frame:', {
      fid,
      mood,
      inputText,
      timestamp: new Date().toISOString(),
    });

    // Here you would:
    // 1. Save the mood entry to your database
    // 2. Update user streak
    // 3. Trigger notifications
    // 4. Update network sentiment calculations
  }
}

// Frame security utilities
export function generateFrameNonce(): string {
  return crypto.randomBytes(16).toString('hex');
}

export function validateFrameTimestamp(timestamp: number, maxAgeMs: number = 300000): boolean {
  const now = Date.now();
  return Math.abs(now - timestamp) <= maxAgeMs; // 5 minutes default
}