import { initTRPC } from "@trpc/server";
import { createNextApiHandler } from "@trpc/server/adapters/next";
import { z } from "zod";
import { db } from "~/db";
import {
  farcasterProfile,
  socialConnection,
  referral,
  referralCode,
  networkSentimentSnapshot,
  networkSentimentAccess,
  leaderboardEntry,
  moodEntry,
  userStreak,
  user
} from "~/db/schema";
import { eq, and, desc, count, sql } from "drizzle-orm";
import Redis from "ioredis";
import { nanoid } from "nanoid";

// Create Redis client
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

// Create context type
export interface Context {
  db: typeof db;
  redis: Redis;
  userId?: string;
  userFid?: number;
}

// Create tRPC instance
const t = initTRPC.context<Context>().create();

// Create router
export const appRouter = t.router({
  // Farcaster Profile Management
  getFarcasterProfile: t.procedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const profile = await ctx.db.query.farcasterProfile.findFirst({
        where: eq(farcasterProfile.userId, input.userId),
      });
      return profile;
    }),

  createFarcasterProfile: t.procedure
    .input(z.object({
      userId: z.string(),
      fid: z.number(),
      username: z.string(),
      displayName: z.string().optional(),
      pfp: z.string().optional(),
      bio: z.string().optional(),
      followerCount: z.number().default(0),
      followingCount: z.number().default(0),
    }))
    .mutation(async ({ ctx, input }) => {
      const existingProfile = await ctx.db.query.farcasterProfile.findFirst({
        where: eq(farcasterProfile.fid, input.fid),
      });

      if (existingProfile) {
        throw new Error("Farcaster profile already exists for this FID");
      }

      const [profile] = await ctx.db.insert(farcasterProfile)
        .values({
          ...input,
          lastVerifiedAt: new Date(),
        })
        .returning();

      return profile;
    }),

  // Social Graph Operations
  getUserSocialGraph: t.procedure
    .input(z.object({
      fid: z.number(),
      includeFollowers: z.boolean().default(true),
      includeFollowing: z.boolean().default(true),
      limit: z.number().default(100),
    }))
    .query(async ({ ctx, input }) => {
      const cacheKey = `social_graph:${input.fid}:${JSON.stringify({
        includeFollowers: input.includeFollowers,
        includeFollowing: input.includeFollowing,
        limit: input.limit,
      })}`;

      // Try to get from cache first
      const cached = await ctx.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      let connections = [];

      if (input.includeFollowers) {
        const followers = await ctx.db
          .select({
            fid: socialConnection.followerFid,
          })
          .from(socialConnection)
          .where(eq(socialConnection.followingFid, input.fid))
          .limit(input.limit);

        connections.push(...followers.map(f => ({ fid: f.fid, type: "follower" as const })));
      }

      if (input.includeFollowing) {
        const following = await ctx.db
          .select({
            fid: socialConnection.followingFid,
          })
          .from(socialConnection)
          .where(eq(socialConnection.followerFid, input.fid))
          .limit(input.limit);

        connections.push(...following.map(f => ({ fid: f.fid, type: "following" as const })));
      }

      // Cache for 15 minutes
      await ctx.redis.setex(cacheKey, 900, JSON.stringify(connections));

      return connections;
    }),

  // Social Graph Sync from Neynar API
  syncSocialGraphFromNeynar: t.procedure
    .input(z.object({
      fid: z.number(),
      neynarApiKey: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Fetch followers from Neynar API
        const followersResponse = await fetch(
          `https://api.neynar.com/v2/farcaster/user/followers?fid=${input.fid}&limit=150`,
          {
            headers: {
              "accept": "application/json",
              "api_key": input.neynarApiKey,
            },
          }
        );

        const followingResponse = await fetch(
          `https://api.neynar.com/v2/farcaster/user/following?fid=${input.fid}&limit=150`,
          {
            headers: {
              "accept": "application/json",
              "api_key": input.neynarApiKey,
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
          followingFid: input.fid,
        })) || [];

        const followingConnections = followingData.users?.map((user: any) => ({
          followerFid: input.fid,
          followingFid: user.fid,
        })) || [];

        // Delete existing connections for this FID and insert new ones
        await ctx.db.transaction(async (tx) => {
          await tx.delete(socialConnection)
            .where(
              sql`follower_fid = ${input.fid} OR following_fid = ${input.fid}`
            );

          if (followerConnections.length > 0) {
            await tx.insert(socialConnection).values(followerConnections);
          }

          if (followingConnections.length > 0) {
            await tx.insert(socialConnection).values(followingConnections);
          }
        });

        // Clear cache
        await ctx.redis.del(`social_graph:${input.fid}:*`);

        return {
          success: true,
          followerCount: followerConnections.length,
          followingCount: followingConnections.length,
        };
      } catch (error) {
        console.error("Error syncing social graph:", error);
        throw new Error("Failed to sync social graph from Neynar API");
      }
    }),

  // Network Sentiment Analysis
  getNetworkSentiment: t.procedure
    .input(z.object({
      userId: z.string().optional(),
      fid: z.number().optional(),
      date: z.string().optional(), // YYYY-MM-DD format
    }))
    .query(async ({ ctx, input }) => {
      // Check if user has access to full network sentiment
      let hasFullAccess = false;
      if (input.userId) {
        const access = await ctx.db.query.networkSentimentAccess.findFirst({
          where: eq(networkSentimentAccess.userId, input.userId),
        });
        hasFullAccess = access?.hasFullAccess || false;
      }

      // If no full access and no specific FID, return limited data
      if (!hasFullAccess && !input.fid) {
        return {
          hasAccess: false,
          message: "Full network sentiment access requires 3 referrals",
          data: null,
        };
      }

      const targetDate = input.date ? new Date(input.date) : new Date();
      const dateStr = targetDate.toISOString().split('T')[0];

      // Try to get from cache first
      const cacheKey = `network_sentiment:${dateStr}`;
      const cached = await ctx.redis.get(cacheKey);

      if (cached) {
        const data = JSON.parse(cached);
        return {
          hasAccess: true,
          data: input.fid ? filterSentimentForFid(data, input.fid) : data,
        };
      }

      // Calculate sentiment from database
      const sentimentData = await calculateNetworkSentiment(ctx.db, targetDate, input.fid);

      // Cache for 5 minutes
      await ctx.redis.setex(cacheKey, 300, JSON.stringify(sentimentData));

      return {
        hasAccess: true,
        data: sentimentData,
      };
    }),

  // Referral System
  createReferralCode: t.procedure
    .input(z.object({
      userId: z.string(),
      maxUses: z.number().default(10),
      expiresAt: z.date().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const code = nanoid(8).toUpperCase();

      const [referralCodeEntry] = await ctx.db.insert(referralCode)
        .values({
          code,
          createdBy: input.userId,
          maxUses: input.maxUses,
          expiresAt: input.expiresAt,
        })
        .returning();

      return referralCodeEntry;
    }),

  useReferralCode: t.procedure
    .input(z.object({
      code: z.string(),
      userId: z.string(),
      referredFid: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [codeEntry] = await ctx.db
        .select()
        .from(referralCode)
        .where(eq(referralCode.code, input.code))
        .limit(1);

      if (!codeEntry || !codeEntry.isActive) {
        throw new Error("Invalid referral code");
      }

      if (codeEntry.currentUses >= codeEntry.maxUses) {
        throw new Error("Referral code has reached maximum uses");
      }

      if (codeEntry.expiresAt && codeEntry.expiresAt < new Date()) {
        throw new Error("Referral code has expired");
      }

      // Check if user has already used this code
      const existingReferral = await ctx.db.query.referral.findFirst({
        where: and(
          eq(referral.referralCodeId, codeEntry.id),
          eq(referral.referredUserId, input.userId)
        ),
      });

      if (existingReferral) {
        throw new Error("You have already used this referral code");
      }

      // Create referral record
      await ctx.db.transaction(async (tx) => {
        await tx.insert(referral)
          .values({
            referrerId: codeEntry.createdBy,
            referredUserId: input.userId,
            referralCodeId: codeEntry.id,
            referredFid: input.referredFid,
            status: "completed",
            completedAt: new Date(),
          });

        // Increment usage count
        await tx.update(referralCode)
          .set({
            currentUses: codeEntry.currentUses + 1,
          })
          .where(eq(referralCode.id, codeEntry.id));

        // Update referrer's referral count and check for access unlock
        const [referrerAccess] = await tx
          .select({
            referralCount: sql<number>`COALESCE(${networkSentimentAccess.referralCount}, 0) + 1`,
            hasFullAccess: networkSentimentAccess.hasFullAccess,
          })
          .from(networkSentimentAccess)
          .where(eq(networkSentimentAccess.userId, codeEntry.createdBy))
          .limit(1);

        const newReferralCount = referrerAccess?.referralCount || 1;
        const shouldUnlockAccess = newReferralCount >= 3 && !referrerAccess?.hasFullAccess;

        if (shouldUnlockAccess) {
          await tx.insert(networkSentimentAccess)
            .values({
              userId: codeEntry.createdBy,
              hasFullAccess: true,
              referralCount: newReferralCount,
              unlockedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: networkSentimentAccess.userId,
              set: {
                hasFullAccess: true,
                referralCount: newReferralCount,
                unlockedAt: new Date(),
                updatedAt: new Date(),
              },
            });
        } else {
          await tx.insert(networkSentimentAccess)
            .values({
              userId: codeEntry.createdBy,
              referralCount: newReferralCount,
            })
            .onConflictDoUpdate({
              target: networkSentimentAccess.userId,
              set: {
                referralCount: newReferralCount,
                updatedAt: new Date(),
              },
            });
        }
      });

      return { success: true, message: "Referral code used successfully!" };
    }),

  getUserReferralStatus: t.procedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const access = await ctx.db.query.networkSentimentAccess.findFirst({
        where: eq(networkSentimentAccess.userId, input.userId),
        with: {
          user: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      const userReferrals = await ctx.db
        .select({
          id: referral.id,
          referredUser: {
            name: user.name,
            email: user.email,
          },
          status: referral.status,
          completedAt: referral.completedAt,
          createdAt: referral.createdAt,
        })
        .from(referral)
        .leftJoin(user, eq(referral.referredUserId, user.id))
        .where(eq(referral.referrerId, input.userId))
        .orderBy(desc(referral.createdAt));

      const userCodes = await ctx.db.query.referralCode.findMany({
        where: eq(referralCode.createdBy, input.userId),
        orderBy: desc(referralCode.createdAt),
      });

      return {
        hasFullAccess: access?.hasFullAccess || false,
        referralCount: access?.referralCount || 0,
        unlockedAt: access?.unlockedAt,
        referrals: userReferrals,
        referralCodes: userCodes,
      };
    }),

  // Leaderboard
  getLeaderboard: t.procedure
    .input(z.object({
      category: z.enum(["current_streak", "longest_streak", "total_check_ins"]).default("current_streak"),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ ctx, input }) => {
      const cacheKey = `leaderboard:${input.category}:${input.limit}:${input.offset}`;
      const cached = await ctx.redis.get(cacheKey);

      if (cached) {
        return JSON.parse(cached);
      }

      const leaderboard = await ctx.db
        .select({
          userId: leaderboardEntry.userId,
          fid: leaderboardEntry.fid,
          username: leaderboardEntry.username,
          displayName: leaderboardEntry.displayName,
          pfp: leaderboardEntry.pfp,
          currentStreak: leaderboardEntry.currentStreak,
          longestStreak: leaderboardEntry.longestStreak,
          totalCheckIns: leaderboardEntry.totalCheckIns,
          rank: leaderboardEntry.rank,
          score: leaderboardEntry.score,
          category: leaderboardEntry.category,
          snapshotDate: leaderboardEntry.snapshotDate,
        })
        .from(leaderboardEntry)
        .where(eq(leaderboardEntry.category, input.category))
        .orderBy(desc(leaderboardEntry.rank))
        .limit(input.limit)
        .offset(input.offset);

      // Cache for 2 minutes
      await ctx.redis.setex(cacheKey, 120, JSON.stringify(leaderboard));

      return leaderboard;
    }),

  refreshLeaderboard: t.procedure
    .input(z.object({
      category: z.enum(["current_streak", "longest_streak", "total_check_ins"]),
    }))
    .mutation(async ({ ctx, input }) => {
      // This would typically be called by a background job
      const streakData = await ctx.db
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
          input.category === "current_streak"
            ? sql`${userStreak.currentStreak} > 0`
            : input.category === "longest_streak"
            ? sql`${userStreak.longestStreak} > 0`
            : sql`${userStreak.totalCheckIns} > 0`
        );

      // Sort and rank entries
      const sortedEntries = streakData
        .sort((a, b) => {
          const aValue = input.category === "current_streak"
            ? a.currentStreak
            : input.category === "longest_streak"
            ? a.longestStreak
            : a.totalCheckIns;
          const bValue = input.category === "current_streak"
            ? b.currentStreak
            : input.category === "longest_streak"
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
          score: calculateScore(entry, input.category),
          category: input.category,
          snapshotDate: new Date(),
        }));

      // Update leaderboard entries
      await ctx.db.transaction(async (tx) => {
        await tx.delete(leaderboardEntry)
          .where(eq(leaderboardEntry.category, input.category));

        if (sortedEntries.length > 0) {
          await tx.insert(leaderboardEntry).values(sortedEntries);
        }
      });

      // Clear cache
      await ctx.redis.del(`leaderboard:${input.category}:*`);

      return { success: true, updatedCount: sortedEntries.length };
    }),
});

// Helper functions
async function calculateNetworkSentiment(db: any, date: Date, fid?: number) {
  const dateStart = new Date(date);
  dateStart.setHours(0, 0, 0, 0);
  const dateEnd = new Date(date);
  dateEnd.setHours(23, 59, 59, 999);

  let query = db
    .select({
      mood: moodEntry.mood,
      count: count(moodEntry.id),
    })
    .from(moodEntry)
    .where(
      sql`${moodEntry.createdAt} >= ${dateStart} AND ${moodEntry.createdAt} <= ${dateEnd}`
    );

  // If fid is provided, filter by user's social graph
  if (fid) {
    const socialGraph = await db
      .select({
        fid: socialConnection.followerFid,
      })
      .from(socialConnection)
      .where(eq(socialConnection.followingFid, fid));

    const fids = socialGraph.map(s => s.fid);
    if (fids.length > 0) {
      query = query.where(
        sql`${moodEntry.createdAt} >= ${dateStart} AND ${moodEntry.createdAt} <= ${dateEnd} AND ${farcasterProfile.fid} IN (${fids.join(",")})`
      ).leftJoin(farcasterProfile, eq(moodEntry.userId, farcasterProfile.userId));
    }
  }

  const sentimentCounts = await query.groupBy(moodEntry.mood);

  const totalMoods = sentimentCounts.reduce((sum, entry) => sum + Number(entry.count), 0);

  const result = {
    date: date.toISOString().split('T')[0],
    totalMoods,
    bullishCount: 0,
    bearishCount: 0,
    neutralCount: 0,
    confusedCount: 0,
    bullishPercentage: "0.00",
    bearishPercentage: "0.00",
    neutralPercentage: "0.00",
    confusedPercentage: "0.00",
  };

  sentimentCounts.forEach(entry => {
    const count = Number(entry.count);
    switch (entry.mood) {
      case "bullish":
        result.bullishCount = count;
        break;
      case "bearish":
        result.bearishCount = count;
        break;
      case "neutral":
        result.neutralCount = count;
        break;
      case "confused":
        result.confusedCount = count;
        break;
    }
  });

  if (totalMoods > 0) {
    result.bullishPercentage = ((result.bullishCount / totalMoods) * 100).toFixed(2);
    result.bearishPercentage = ((result.bearishCount / totalMoods) * 100).toFixed(2);
    result.neutralPercentage = ((result.neutralCount / totalMoods) * 100).toFixed(2);
    result.confusedPercentage = ((result.confusedCount / totalMoods) * 100).toFixed(2);
  }

  return result;
}

function filterSentimentForFid(data: any, fid: number) {
  // This would filter sentiment data to only include the user's social graph
  // Implementation depends on how you want to filter the data
  return data;
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

// Export type for router
export type AppRouter = typeof appRouter;

// Create Next.js API handler
export default createNextApiHandler({
  router: appRouter,
  createContext: ({ req, res }): Context => {
    // Here you would typically get the user session and set userId and userFid
    // For now, returning basic context
    return {
      db,
      redis,
      // These would be populated from auth middleware in a real app
      userId: undefined,
      userFid: undefined,
    };
  },
});