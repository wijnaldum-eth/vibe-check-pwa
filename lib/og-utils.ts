import { db } from '@/db';
import { user, moodEntry, userStreak, networkSentiment } from '@/db/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';

export interface UserMoodData {
  username: string;
  currentMood: string;
  streak: number;
  networkSentiment?: string;
}

export async function getUserMoodData(userId: string): Promise<UserMoodData | null> {
  try {
    // Get user information
    const userInfo = await db
      .select({
        name: user.name,
      })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (!userInfo.length) {
      return null;
    }

    // Get most recent mood entry
    const latestMood = await db
      .select({
        mood: moodEntry.mood,
        createdAt: moodEntry.createdAt,
      })
      .from(moodEntry)
      .where(eq(moodEntry.userId, userId))
      .orderBy(desc(moodEntry.createdAt))
      .limit(1);

    // Get user streak information
    const streakInfo = await db
      .select({
        currentStreak: userStreak.currentStreak,
      })
      .from(userStreak)
      .where(eq(userStreak.userId, userId))
      .limit(1);

    // Get today's network sentiment
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const networkData = await db
      .select({
        bullishCount: networkSentiment.bullishCount,
        bearishCount: networkSentiment.bearishCount,
        neutralCount: networkSentiment.neutralCount,
        confusedCount: networkSentiment.confusedCount,
        totalMoods: networkSentiment.totalMoods,
      })
      .from(networkSentiment)
      .where(
        and(
          gte(networkSentiment.date, today),
          lt(networkSentiment.date, tomorrow)
        )
      )
      .limit(1);

    // Calculate network sentiment
    let networkSentimentText = '';
    if (networkData.length > 0 && networkData[0].totalMoods > 0) {
      const { bullishCount, bearishCount, neutralCount, confusedCount, totalMoods } = networkData[0];
      const bullishPercentage = (bullishCount / totalMoods) * 100;

      if (bullishPercentage >= 60) {
        networkSentimentText = `${bullishPercentage.toFixed(0)}% bullish 🚀`;
      } else if (bullishPercentage >= 40) {
        networkSentimentText = `Mixed sentiment 📊`;
      } else {
        networkSentimentText = `${(100 - bullishPercentage).toFixed(0)}% bearish 🐻`;
      }
    }

    return {
      username: userInfo[0].name || 'Anonymous',
      currentMood: latestMood[0]?.mood || 'neutral',
      streak: streakInfo[0]?.currentStreak || 0,
      networkSentiment: networkSentimentText || undefined,
    };
  } catch (error) {
    console.error('Error fetching user mood data:', error);
    return null;
  }
}

export async function getTopUsers(limit: number = 10) {
  try {
    const topUsers = await db
      .select({
        userId: userStreak.userId,
        username: user.name,
        currentStreak: userStreak.currentStreak,
        longestStreak: userStreak.longestStreak,
        totalCheckIns: userStreak.totalCheckIns,
      })
      .from(userStreak)
      .leftJoin(user, eq(userStreak.userId, user.id))
      .orderBy(desc(userStreak.currentStreak))
      .limit(limit);

    return topUsers;
  } catch (error) {
    console.error('Error fetching top users:', error);
    return [];
  }
}

// Helper function for date comparison
function lt(column: any, value: Date) {
  return {
    column,
    operator: '<',
    value,
  };
}