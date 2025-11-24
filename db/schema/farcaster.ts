import { pgTable, text, integer, timestamp, uuid, pgEnum, boolean, decimal } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user } from "./auth";
import { moodEntry } from "./moods";

// Farcaster user profile data
export const farcasterProfile = pgTable("farcaster_profile", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" })
    .unique(),
  fid: integer("fid").notNull().unique(), // Farcaster ID
  username: text("username").notNull(),
  displayName: text("display_name"),
  pfp: text("pfp"), // Profile picture URL
  bio: text("bio"),
  followerCount: integer("follower_count").default(0),
  followingCount: integer("following_count").default(0),
  activeStatus: boolean("active_status").default(true), // User has active Farcaster account
  lastVerifiedAt: timestamp("last_verified_at"),
  createdAt: timestamp("created_at")
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => new Date())
    .notNull(),
});

// Social graph connections (who follows whom)
export const socialConnection = pgTable("social_connection", {
  id: uuid("id").primaryKey().defaultRandom(),
  followerFid: integer("follower_fid").notNull(), // FID of the follower
  followingFid: integer("following_fid").notNull(), // FID being followed
  createdAt: timestamp("created_at")
    .$defaultFn(() => new Date())
    .notNull(),
});

// Referral system
export const referralEnum = pgEnum("referral_status", ["pending", "completed", "expired"]);

export const referralCode = pgTable("referral_code", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  createdBy: text("created_by")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  maxUses: integer("max_uses").default(10),
  currentUses: integer("current_uses").default(0),
  isActive: boolean("is_active").default(true),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at")
    .$defaultFn(() => new Date())
    .notNull(),
});

export const referral = pgTable("referral", {
  id: uuid("id").primaryKey().defaultRandom(),
  referrerId: text("referrer_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  referredUserId: text("referred_user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  referralCodeId: uuid("referral_code_id")
    .references(() => referralCode.id, { onDelete: "set null" }),
  status: referralEnum("status").notNull().default("pending"),
  referredFid: integer("referred_fid"), // FID of referred user
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at")
    .$defaultFn(() => new Date())
    .notNull(),
});

// Enhanced network sentiment with social graph context
export const networkSentimentSnapshot = pgTable("network_sentiment_snapshot", {
  id: uuid("id").primaryKey().defaultRandom(),
  date: timestamp("date").notNull(),
  totalMoods: integer("total_moods").notNull().default(0),
  bullishCount: integer("bullish_count").notNull().default(0),
  bearishCount: integer("bearish_count").notNull().default(0),
  neutralCount: integer("neutral_count").notNull().default(0),
  confusedCount: integer("confused_count").notNull().default(0),

  // Sentiment percentages
  bullishPercentage: decimal("bullish_percentage", { precision: 5, scale: 2 }).default("0.00"),
  bearishPercentage: decimal("bearish_percentage", { precision: 5, scale: 2 }).default("0.00"),
  neutralPercentage: decimal("neutral_percentage", { precision: 5, scale: 2 }).default("0.00"),
  confusedPercentage: decimal("confused_percentage", { precision: 5, scale: 2 }).default("0.00"),

  // Social graph metrics
  uniqueUsers: integer("unique_users").notNull().default(0),
  avgConnectionsPerUser: decimal("avg_connections_per_user", { precision: 8, scale: 2 }).default("0.00"),
  totalConnections: integer("total_connections").notNull().default(0),

  calculatedAt: timestamp("calculated_at")
    .$defaultFn(() => new Date())
    .notNull(),
});

// Leaderboard entries (cached in Redis, but also stored here for persistence)
export const leaderboardEntry = pgTable("leaderboard_entry", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  fid: integer("fid"), // Farcaster FID if available
  username: text("username"),
  displayName: text("display_name"),
  pfp: text("pfp"),
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  totalCheckIns: integer("total_check_ins").notNull().default(0),
  rank: integer("rank").notNull(),
  score: integer("score").notNull(), // Composite score for ranking
  category: text("category").notNull(), // "current_streak", "longest_streak", "total_check_ins"
  snapshotDate: timestamp("snapshot_date").notNull(), // When this leaderboard entry was captured
  createdAt: timestamp("created_at")
    .$defaultFn(() => new Date())
    .notNull(),
});

// User's network sentiment access permissions
export const networkSentimentAccess = pgTable("network_sentiment_access", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" })
    .unique(),
  hasFullAccess: boolean("has_full_access").default(false),
  referralCount: integer("referral_count").default(0),
  unlockedAt: timestamp("unlocked_at"),
  lastAccessedAt: timestamp("last_accessed_at"),
  createdAt: timestamp("created_at")
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => new Date())
    .notNull(),
});

// Define relations
export const farcasterProfileRelations = relations(farcasterProfile, ({ one, many }) => ({
  user: one(user, {
    fields: [farcasterProfile.userId],
    references: [user.id],
  }),
  moodEntries: many(moodEntry),
}));

export const referralCodeRelations = relations(referralCode, ({ one, many }) => ({
  createdBy: one(user, {
    fields: [referralCode.createdBy],
    references: [user.id],
  }),
  referrals: many(referral),
}));

export const referralRelations = relations(referral, ({ one }) => ({
  referrer: one(user, {
    fields: [referral.referrerId],
    references: [user.id],
  }),
  referredUser: one(user, {
    fields: [referral.referredUserId],
    references: [user.id],
  }),
  referralCode: one(referralCode, {
    fields: [referral.referralCodeId],
    references: [referralCode.id],
  }),
}));

export const networkSentimentAccessRelations = relations(networkSentimentAccess, ({ one }) => ({
  user: one(user, {
    fields: [networkSentimentAccess.userId],
    references: [user.id],
  }),
}));

export const leaderboardEntryRelations = relations(leaderboardEntry, ({ one }) => ({
  user: one(user, {
    fields: [leaderboardEntry.userId],
    references: [user.id],
  }),
}));