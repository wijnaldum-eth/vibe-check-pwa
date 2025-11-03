import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { getUserMoodData, getTopUsers } from '@/lib/og-utils';

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
    const userId = searchParams.get('userId');
    const mood = searchParams.get('mood');
    const streak = parseInt(searchParams.get('streak') || '0');
    const username = searchParams.get('username');
    const networkSentiment = searchParams.get('networkSentiment');
    const type = searchParams.get('type') || 'user'; // 'user', 'leaderboard', 'network'
    const frame = searchParams.get('frame') === 'true';

    let userData = null;

    // If userId is provided, try to fetch real data
    if (userId) {
      userData = await getUserMoodData(userId);
    }

    // Override with query parameters if provided
    const finalUsername = username || userData?.username || 'Anonymous';
    const finalMood = mood || userData?.currentMood || 'neutral';
    const finalStreak = streak || userData?.streak || 0;
    const finalNetworkSentiment = networkSentiment || userData?.networkSentiment;

    // Generate different image types
    if (type === 'leaderboard') {
      return generateLeaderboardImage();
    } else if (type === 'network') {
      return generateNetworkImage();
    } else {
      return generateUserImage(
        finalUsername,
        finalMood,
        finalStreak,
        finalNetworkSentiment,
        frame
      );
    }
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

async function generateUserImage(
  username: string,
  mood: string,
  streak: number,
  networkSentiment?: string,
  frame: boolean = false
) {
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
  const height = frame ? 800 : 630; // Taller for frames

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
                flexDirection: 'column',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '14px',
                  color: '#64748B',
                }}
              >
                <div>👆</div>
                <div>Tap buttons to interact</div>
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: '#475569',
                }}
              >
                Share your crypto sentiment with the world
              </div>
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
}

async function generateLeaderboardImage() {
  const topUsers = await getTopUsers(5);

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          backgroundColor: '#000000',
          backgroundImage: 'linear-gradient(135deg, #000000 0%, #0F172A 50%, #1E293B 100%)',
          padding: '60px',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#FFFFFF', marginBottom: '10px' }}>
            🏆 Vibe Check Leaderboard
          </div>
          <div style={{ fontSize: '18px', color: '#94A3B8' }}>
            Top sentiment trackers this week
          </div>
        </div>

        {/* Leaderboard */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {topUsers.map((user, index) => {
            const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
            return (
              <div
                key={user.userId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '20px',
                  padding: '20px',
                  backgroundColor: 'rgba(0, 82, 255, 0.1)',
                  border: '1px solid #0052FF',
                  borderRadius: '12px',
                }}
              >
                <div style={{ fontSize: '32px' }}>{medals[index]}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#FFFFFF' }}>
                    {user.username}
                  </div>
                  <div style={{ fontSize: '14px', color: '#94A3B8' }}>
                    {user.totalCheckIns} total check-ins
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0052FF' }}>
                    {user.currentStreak}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>day streak</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        'Cache-Control': 'public, max-age=300', // Shorter cache for leaderboard
      },
    }
  );
}

async function generateNetworkImage() {
  // This would fetch network sentiment data
  // For now, return a placeholder
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
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>🌐</div>
        <div style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '10px' }}>
          Network Sentiment
        </div>
        <div style={{ fontSize: '18px', opacity: 0.8 }}>
          Coming soon...
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}