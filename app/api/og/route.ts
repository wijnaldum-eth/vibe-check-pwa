import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

// Define mood emojis and colors
const MOOD_CONFIG = {
  bullish: {
    emoji: '🚀',
    color: '#10B981', // Green
    bgGradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
    label: 'Bullish'
  },
  bearish: {
    emoji: '🐻',
    color: '#EF4444', // Red
    bgGradient: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
    label: 'Bearish'
  },
  neutral: {
    emoji: '😐',
    color: '#6B7280', // Gray
    bgGradient: 'linear-gradient(135deg, #6B7280 0%, #4B5563 100%)',
    label: 'Neutral'
  },
  confused: {
    emoji: '🤔',
    color: '#F59E0B', // Amber
    bgGradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
    label: 'Confused'
  }
};

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Get query parameters
    const userId = searchParams.get('userId') || 'anonymous';
    const mood = searchParams.get('mood') || 'neutral';
    const streak = parseInt(searchParams.get('streak') || '0');
    const username = searchParams.get('username') || 'Anonymous';
    const networkSentiment = searchParams.get('networkSentiment');
    const frame = searchParams.get('frame') === 'true';

    // Validate mood
    const validMood = mood in MOOD_CONFIG ? mood as keyof typeof MOOD_CONFIG : 'neutral';
    const moodInfo = MOOD_CONFIG[validMood];

    // Calculate streak milestone
    let milestone = '';
    if (streak >= 100) milestone = '🔥 Legendary';
    else if (streak >= 30) milestone = '💎 Expert';
    else if (streak >= 7) milestone = '⭐ Dedicated';
    else if (streak >= 3) milestone = '🌱 Growing';

    // Image dimensions
    const width = 1200;
    const height = 630;

    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            width: '100%',
            height: '100%',
            backgroundColor: '#000000',
            backgroundImage: 'linear-gradient(135deg, #000000 0%, #0F172A 50%, #1E293B 100%)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Background pattern */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage: `radial-gradient(circle at 25% 25%, #0052FF20 0%, transparent 50%), radial-gradient(circle at 75% 75%, ${moodInfo.color}20 0%, transparent 50%)`,
              opacity: 0.3,
            }}
          />

          {/* Header */}
          <div
            style={{
              position: 'absolute',
              top: '40px',
              left: '60px',
              right: '60px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            {/* Logo/Brand */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  backgroundColor: '#0052FF',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                }}
              >
                📊
              </div>
              <div
                style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: '#FFFFFF',
                }}
              >
                Vibe Check
              </div>
            </div>

            {/* Date */}
            <div
              style={{
                fontSize: '16px',
                color: '#94A3B8',
              }}
            >
              {new Date().toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}
            </div>
          </div>

          {/* Main Content */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '30px',
              padding: '0 60px',
              textAlign: 'center',
            }}
          >
            {/* User Name */}
            <div
              style={{
                fontSize: '32px',
                fontWeight: 'bold',
                color: '#FFFFFF',
                marginBottom: '10px',
              }}
            >
              {username}
            </div>

            {/* Mood Display */}
            <div
              style={{
                display: 'flex',
              alignItems: 'center',
              gap: '20px',
              padding: '20px 40px',
              backgroundColor: moodInfo.bgGradient,
              borderRadius: '100px',
              boxShadow: `0 10px 30px ${moodInfo.color}40`,
            }}
            >
              <div
                style={{
                  fontSize: '48px',
                  lineHeight: 1,
                }}
              >
                {moodInfo.emoji}
              </div>
              <div
                style={{
                  fontSize: '28px',
                  fontWeight: 'bold',
                  color: '#FFFFFF',
                }}
              >
                {moodInfo.label}
              </div>
            </div>

            {/* Streak Information */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '15px 25px',
                  backgroundColor: 'rgba(0, 82, 255, 0.1)',
                  border: '2px solid #0052FF',
                  borderRadius: '16px',
                }}
              >
                <div
                  style={{
                    fontSize: '36px',
                    fontWeight: 'bold',
                    color: '#0052FF',
                  }}
                >
                  {streak}
                </div>
                <div
                  style={{
                    fontSize: '14px',
                    color: '#94A3B8',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                  }}
                >
                  Day Streak
                </div>
              </div>

              {milestone && (
                <div
                  style={{
                    fontSize: '20px',
                    fontWeight: 'bold',
                    color: '#F59E0B',
                    padding: '10px 20px',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    borderRadius: '20px',
                    border: '1px solid #F59E0B',
                  }}
                >
                  {milestone}
                </div>
              )}
            </div>

            {/* Network Sentiment (if available) */}
            {networkSentiment && (
              <div
                style={{
                  fontSize: '16px',
                  color: '#94A3B8',
                  fontStyle: 'italic',
                }}
              >
                Network sentiment: {networkSentiment}
              </div>
            )}

            {/* Call to Action for Frames */}
            {frame && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '14px',
                  color: '#64748B',
                }}
              >
                <div>👆</div>
                <div>Tap to share your vibe</div>
              </div>
            )}
          </div>

          {/* Decorative elements */}
          <div
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              width: '100px',
              height: '100px',
              background: 'radial-gradient(circle, #0052FF20 0%, transparent 70%)',
              borderRadius: '50%',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '20px',
              left: '20px',
              width: '80px',
              height: '80px',
              background: `radial-gradient(circle, ${moodInfo.color}20 0%, transparent 70%)`,
              borderRadius: '50%',
            }}
          />
        </div>
      ),
      {
        width,
        height,
        // Add caching headers for social media crawlers
        headers: {
          'Cache-Control': 'public, max-age=86400, s-maxage=86400', // Cache for 1 day
          'CDN-Cache-Control': 'public, max-age=86400',
          'Vercel-CDN-Cache-Control': 'public, max-age=86400',
        },
      }
    );
  } catch (error) {
    console.error('OG image generation error:', error);

    // Return a fallback image
    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            width: '100%',
            height: '100%',
            backgroundColor: '#000000',
            color: '#FFFFFF',
            fontSize: '32px',
            fontWeight: 'bold',
            textAlign: 'center',
            padding: '40px',
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>📊</div>
          <div>Vibe Check</div>
          <div style={{ fontSize: '18px', marginTop: '10px', opacity: 0.8 }}>
            Track your crypto sentiment
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        headers: {
          'Cache-Control': 'public, max-age=300', // Shorter cache for error fallback
        },
      }
    );
  }
}

// Handle POST requests for dynamic data
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, mood, streak, username, networkSentiment } = body;

    // Construct URL with query parameters
    const params = new URLSearchParams();
    if (userId) params.set('userId', userId);
    if (mood) params.set('mood', mood);
    if (streak) params.set('streak', streak.toString());
    if (username) params.set('username', username);
    if (networkSentiment) params.set('networkSentiment', networkSentiment);
    params.set('frame', 'true');

    // Redirect to GET endpoint with parameters
    const url = new URL(`${process.env.NEXT_PUBLIC_APP_URL}/api/og?${params.toString()}`);

    return Response.redirect(url, 302);
  } catch (error) {
    console.error('OG POST request error:', error);
    return new Response(
      JSON.stringify({ error: 'Invalid request body' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}