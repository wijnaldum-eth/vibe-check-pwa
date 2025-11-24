import Redis from "ioredis";
import { db } from "~/db";
import {
  networkSentimentSnapshot,
  leaderboardEntry,
  userStreak,
  user,
  farcasterProfile,
  moodEntry,
  socialConnection
} from "~/db/schema";
import { eq, desc, count, sql, and, gte, lte } from "drizzle-orm";
import { nanoid } from "nanoid";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

// Background job types
export interface Job {
  id: string;
  type: "update_network_sentiment" | "refresh_leaderboard" | "sync_social_graphs";
  scheduledAt: Date;
  data?: any;
}

export class BackgroundJobScheduler {
  private redis: Redis;
  private running = false;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  // Schedule a job
  async scheduleJob(type: Job["type"], scheduledAt: Date, data?: any): Promise<string> {
    const job: Job = {
      id: nanoid(),
      type,
      scheduledAt,
      data,
    };

    await this.redis.zadd(
      "background_jobs",
      scheduledAt.getTime(),
      JSON.stringify(job)
    );

    console.log(`Scheduled job ${job.id} of type ${type} for ${scheduledAt.toISOString()}`);
    return job.id;
  }

  // Start the job processor
  start() {
    if (this.running) return;
    this.running = true;

    console.log("Starting background job processor...");
    this.processJobs();
  }

  // Stop the job processor
  stop() {
    this.running = false;
    console.log("Stopping background job processor...");
  }

  private async processJobs() {
    while (this.running) {
      try {
        const now = Date.now();

        // Get jobs that are ready to run
        const readyJobs = await this.redis.zrangebyscore(
          "background_jobs",
          0,
          now,
          "WITHSCORES"
        );

        for (let i = 0; i < readyJobs.length; i += 2) {
          const jobData = readyJobs[i];
          const score = readyJobs[i + 1];

          try {
            const job: Job = JSON.parse(jobData);

            // Remove the job from the queue
            await this.redis.zrem("background_jobs", jobData);

            // Process the job
            await this.processJob(job);

            console.log(`Successfully processed job ${job.id} of type ${job.type}`);
          } catch (error) {
            console.error("Error processing job:", error);
          }
        }

        // Wait before next check
        await new Promise(resolve => setTimeout(resolve, 60000)); // Check every minute
      } catch (error) {
        console.error("Error in job processor loop:", error);
        await new Promise(resolve => setTimeout(resolve, 60000));
      }
    }
  }

  private async processJob(job: Job) {
    switch (job.type) {
      case "update_network_sentiment":
        await updateNetworkSentiment();
        break;
      case "refresh_leaderboard":
        await refreshLeaderboard(job.data?.category);
        break;
      case "sync_social_graphs":
        await syncSocialGraphs(job.data);
        break;
      default:
        console.warn(`Unknown job type: ${job.type}`);
    }
  }
}

// Network sentiment calculation
export async function updateNetworkSentiment(date: Date = new Date()) {
  try {
    const dateStart = new Date(date);
    dateStart.setHours(0, 0, 0, 0);
    const dateEnd = new Date(date);
    dateEnd.setHours(23, 59, 59, 999);

    // Get sentiment counts for the day
    const sentimentCounts = await db
      .select({
        mood: moodEntry.mood,
        count: count(moodEntry.id),
      })
      .from(moodEntry)
      .where(and(
        gte(moodEntry.createdAt, dateStart),
        lte(moodEntry.createdAt, dateEnd)
      ))
      .groupBy(moodEntry.mood);

    // Get unique users
    const uniqueUsersResult = await db
      .select({
        count: count(userStreak.userId),
      })
      .from(userStreak)
      .where(and(
        gte(userStreak.lastCheckIn, dateStart),
        lte(userStreak.lastCheckIn, dateEnd)
      ));

    const uniqueUsers = uniqueUsersResult[0]?.count || 0;

    const totalMoods = sentimentCounts.reduce((sum, entry) => sum + Number(entry.count), 0);

    const bullishCount = sentimentCounts.find(c => c.mood === "bullish")?.count || 0;
    const bearishCount = sentimentCounts.find(c => c.mood === "bearish")?.count || 0;
    const neutralCount = sentimentCounts.find(c => c.mood === "neutral")?.count || 0;
    const confusedCount = sentimentCounts.find(c => c.mood === "confused")?.count || 0;

    const bullishPercentage = totalMoods > 0 ? ((bullishCount / totalMoods) * 100).toFixed(2) : "0.00";
    const bearishPercentage = totalMoods > 0 ? ((bearishCount / totalMoods) * 100).toFixed(2) : "0.00";
    const neutralPercentage = totalMoods > 0 ? ((neutralCount / totalMoods) * 100).toFixed(2) : "0.00";
    const confusedPercentage = totalMoods > 0 ? ((confusedCount / totalMoods) * 100).toFixed(2) : "0.00";

    // Calculate social graph metrics
    const totalConnections = await db
      .select({
        count: count(sql`*`),
      })
      .from(socialConnection);

    const avgConnectionsPerUser = uniqueUsers > 0 ?
      (Number(totalConnections[0]?.count || 0) / uniqueUsers).toFixed(2) : "0.00";

    // Store the snapshot
    const [snapshot] = await db.insert(networkSentimentSnapshot)
      .values({
        date: dateStart,
        totalMoods,
        bullishCount,
        bearishCount,
        neutralCount,
        confusedCount,
        bullishPercentage,
        bearishPercentage,
        neutralPercentage,
        confusedPercentage,
        uniqueUsers,
        totalConnections: Number(totalConnections[0]?.count || 0),
        avgConnectionsPerUser,
      })
      .onConflictDoUpdate({
        target: networkSentimentSnapshot.date,
        set: {
          totalMoods,
          bullishCount,
          bearishCount,
          neutralCount,
          confusedCount,
          bullishPercentage,
          bearishPercentage,
          neutralPercentage,
          confusedPercentage,
          uniqueUsers,
          totalConnections: Number(totalConnections[0]?.count || 0),
          avgConnectionsPerUser,
          calculatedAt: new Date(),
        },
      })
      .returning();

    // Update cache
    const cacheKey = `network_sentiment:${dateStart.toISOString().split('T')[0]}`;
    await redis.setex(cacheKey, 300, JSON.stringify(snapshot));

    console.log(`Updated network sentiment for ${dateStart.toISOString().split('T')[0]}`);
    return snapshot;
  } catch (error) {
    console.error("Error updating network sentiment:", error);
    throw error;
  }
}

// Leaderboard refresh
export async function refreshLeaderboard(category: "current_streak" | "longest_streak" | "total_check_ins") {
  try {
    const streakData = await db
      .select({
        userId: userStreak.userId,
        currentStreak: userStreak.currentStreak,
        longestStreak: userStreak.longestStreak,
        totalCheckIns: userStreak.totalCheckIns,
        user: {
          name: user.name,
          image: user.image,
        },
        farcasterProfile: {
          fid: farcasterProfile.fid,
          username: farcasterProfile.username,
          displayName: farcasterProfile.displayName,
          pfp: farcasterProfile.pfp,
        },
      })
      .from(userStreak)
      .leftJoin(user, eq(userStreak.userId, user.id))
      .leftJoin(farcasterProfile, eq(userStreak.userId, farcasterProfile.userId))
      .where(
        category === "current_streak"
          ? sql`${userStreak.currentStreak} > 0`
          : category === "longest_streak"
          ? sql`${userStreak.longestStreak} > 0`
          : sql`${userStreak.totalCheckIns} > 0`
      );

    // Sort and rank entries
    const sortedEntries = streakData
      .sort((a, b) => {
        const aValue = category === "current_streak"
          ? a.currentStreak
          : category === "longest_streak"
          ? a.longestStreak
          : a.totalCheckIns;
        const bValue = category === "current_streak"
          ? b.currentStreak
          : category === "longest_streak"
          ? b.longestStreak
          : b.totalCheckIns;
        return bValue - aValue;
      })
      .map((entry, index) => ({
        userId: entry.userId,
        fid: entry.farcasterProfile?.fid,
        username: entry.farcasterProfile?.username || entry.user?.name || "Anonymous",
        displayName: entry.farcasterProfile?.displayName || entry.user?.name,
        pfp: entry.farcasterProfile?.pfp || entry.user?.image,
        currentStreak: entry.currentStreak,
        longestStreak: entry.longestStreak,
        totalCheckIns: entry.totalCheckIns,
        rank: index + 1,
        score: calculateScore(entry, category),
        category,
        snapshotDate: new Date(),
      }));

    // Update leaderboard entries
    await db.transaction(async (tx) => {
      await tx.delete(leaderboardEntry)
        .where(eq(leaderboardEntry.category, category));

      if (sortedEntries.length > 0) {
        await tx.insert(leaderboardEntry).values(sortedEntries);
      }
    });

    // Clear cache
    await redis.del(`leaderboard:${category}:*`);

    console.log(`Refreshed leaderboard for category ${category}, ${sortedEntries.length} entries`);
    return { success: true, updatedCount: sortedEntries.length };
  } catch (error) {
    console.error("Error refreshing leaderboard:", error);
    throw error;
  }
}

// Social graph sync
export async function syncSocialGraphs({ fid, neynarApiKey }: { fid: number; neynarApiKey: string }) {
  try {
    // Fetch followers from Neynar API
    const followersResponse = await fetch(
      `https://api.neynar.com/v2/farcaster/user/followers?fid=${fid}&limit=150`,
      {
        headers: {
          "accept": "application/json",
          "api_key": neynarApiKey,
        },
      }
    );

    const followingResponse = await fetch(
      `https://api.neynar.com/v2/farcaster/user/following?fid=${fid}&limit=150`,
      {
        headers: {
          "accept": "application/json",
          "api_key": neynarApiKey,
        },
      }
    );

    if (!followersResponse.ok || !followingResponse.ok) {
      throw new Error("Failed to fetch data from Neynar API");
    }

    const followersData = await followersResponse.json();
    const followingData = await followingResponse.json();

    // Batch insert social connections
    const followerConnections = followersData.users?.map((user: any) => ({
      followerFid: user.fid,
      followingFid: fid,
    })) || [];

    const followingConnections = followingData.users?.map((user: any) => ({
      followerFid: fid,
      followingFid: user.fid,
    })) || [];

    // Database operations would go here
    // This is a simplified version - you'd need to import the schema

    // Clear cache
    await redis.del(`social_graph:${fid}:*`);

    console.log(`Synced social graph for FID ${fid}: ${followerConnections.length} followers, ${followingConnections.length} following`);

    return {
      success: true,
      followerCount: followerConnections.length,
      followingCount: followingConnections.length,
    };
  } catch (error) {
    console.error("Error syncing social graph:", error);
    throw error;
  }
}

function calculateScore(entry: any, category: string): number {
  switch (category) {
    case "current_streak":
      return entry.currentStreak * 10;
    case "longest_streak":
      return entry.longestStreak * 5;
    case "total_check_ins":
      return entry.totalCheckIns;
    default:
      return 0;
  }
}

// Initialize the job scheduler
export const jobScheduler = new BackgroundJobScheduler(redis);

// Schedule recurring jobs
export function scheduleRecurringJobs() {
  // Update network sentiment every hour
  const scheduleHourlySentimentUpdate = () => {
    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setHours(now.getHours() + 1, 0, 0, 0);

    jobScheduler.scheduleJob("update_network_sentiment", nextHour);

    // Schedule the next one
    setTimeout(scheduleHourlySentimentUpdate, nextHour.getTime() - now.getTime());
  };

  // Refresh leaderboards every 30 minutes
  const scheduleLeaderboardRefresh = () => {
    const now = new Date();
    const nextRefresh = new Date(now.getTime() + 30 * 60 * 1000);

    jobScheduler.scheduleJob("refresh_leaderboard", nextRefresh, { category: "current_streak" });
    jobScheduler.scheduleJob("refresh_leaderboard", nextRefresh, { category: "longest_streak" });
    jobScheduler.scheduleJob("refresh_leaderboard", nextRefresh, { category: "total_check_ins" });

    // Schedule the next one
    setTimeout(scheduleLeaderboardRefresh, nextRefresh.getTime() - now.getTime());
  };

  // Start the recurring schedules
  setTimeout(scheduleHourlySentimentUpdate, 5000); // Start after 5 seconds
  setTimeout(scheduleLeaderboardRefresh, 10000); // Start after 10 seconds

  console.log("Scheduled recurring background jobs");
}