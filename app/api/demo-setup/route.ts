import { NextResponse } from "next/server";
import { db } from "~/db";
import {
  farcasterProfile,
  socialConnection,
  referralCode,
  referral,
  networkSentimentAccess,
  networkSentimentSnapshot,
  leaderboardEntry
} from "~/db/schema";
import { nanoid } from "nanoid";
import { eq, sql } from "drizzle-orm";

// Demo setup endpoint to create sample data for testing
export async function POST() {
  try {
    // Create demo Farcaster profile
    const demoUserId = "demo-user-123";
    const demoFid = 12345;

    const [profile] = await db.insert(farcasterProfile)
      .values({
        userId: demoUserId,
        fid: demoFid,
        username: "demo-user",
        displayName: "Demo User",
        pfp: "https://via.placeholder.com/150/0052FF/FFFFFF?text=DU",
        bio: "Demo user for testing Vibe Check",
        followerCount: 89,
        followingCount: 127,
        lastVerifiedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: farcasterProfile.userId,
        set: {
          fid: demoFid,
          username: "demo-user",
          displayName: "Demo User",
          lastVerifiedAt: new Date(),
        },
      })
      .returning();

    // Create demo social connections
    const demoConnections = [];
    for (let i = 1; i <= 10; i++) {
      demoConnections.push({
        followerFid: demoFid,
        followingFid: 10000 + i,
      });
    }

    await db.insert(socialConnection)
      .values(demoConnections)
      .onConflictDoNothing();

    // Create demo referral code
    const demoReferralCode = nanoid(8).toUpperCase();
    const [referralCodeEntry] = await db.insert(referralCode)
      .values({
        code: demoReferralCode,
        createdBy: demoUserId,
        maxUses: 10,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: referralCode.code,
        set: {
          isActive: true,
        },
      })
      .returning();

    // Create demo network sentiment access
    await db.insert(networkSentimentAccess)
      .values({
        userId: demoUserId,
        hasFullAccess: false,
        referralCount: 1, // Demo user has 1 referral
      })
      .onConflictDoUpdate({
        target: networkSentimentAccess.userId,
        set: {
          hasFullAccess: false,
          referralCount: 1,
          updatedAt: new Date(),
        },
      });

    // Create demo network sentiment snapshot
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [sentimentSnapshot] = await db.insert(networkSentimentSnapshot)
      .values({
        date: today,
        totalMoods: 150,
        bullishCount: 75,
        bearishCount: 30,
        neutralCount: 35,
        confusedCount: 10,
        bullishPercentage: "50.00",
        bearishPercentage: "20.00",
        neutralPercentage: "23.33",
        confusedPercentage: "6.67",
        uniqueUsers: 45,
        totalConnections: 1200,
        avgConnectionsPerUser: "26.67",
      })
      .onConflictDoUpdate({
        target: networkSentimentSnapshot.date,
        set: {
          totalMoods: 150,
          bullishCount: 75,
          bearishCount: 30,
          neutralCount: 35,
          confusedCount: 10,
          bullishPercentage: "50.00",
          bearishPercentage: "20.00",
          neutralPercentage: "23.33",
          confusedPercentage: "6.67",
          uniqueUsers: 45,
          totalConnections: 1200,
          avgConnectionsPerUser: "26.67",
          calculatedAt: new Date(),
        },
      })
      .returning();

    return NextResponse.json({
      success: true,
      message: "Demo data created successfully",
      data: {
        profile,
        referralCode: referralCodeEntry,
        networkSentiment: sentimentSnapshot,
        connections: demoConnections.length,
        demoUserId,
        demoFid,
      }
    });
  } catch (error) {
    console.error("Demo setup error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to create demo data",
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Demo setup endpoint",
    description: "POST to this endpoint to create demo data for testing",
    features: [
      "Farcaster profile creation",
      "Social graph simulation",
      "Referral code generation",
      "Network sentiment snapshot",
      "Access control testing"
    ],
    usage: {
      endpoint: "/api/demo-setup",
      method: "POST",
      demoUserId: "demo-user-123",
      demoFid: 12345,
    }
  });
}