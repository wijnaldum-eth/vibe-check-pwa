import { pgTable, text, integer, timestamp, uuid, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user } from "./auth";

// Mood type enum
export const moodTypeEnum = pgEnum("mood_type", ["bullish", "bearish", "neutral", "confused"]);

// Mood entries table
export const moodEntry = pgTable("mood_entry", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  mood: moodTypeEnum("mood").notNull(),
  note: text("note"), // Optional note about the mood
  createdAt: timestamp("created_at")
    .$defaultFn(() => new Date())
    .notNull(),
  // Store additional metadata
  priceData: text("price_data"), // JSON string with price data at time of entry
  context: text("context"), // Market context or reason for mood
});

// User streak tracking
export const userStreak = pgTable("user_streak", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" })
    .unique(),
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  lastCheckIn: timestamp("last_check_in"),
  totalCheckIns: integer("total_check_ins").notNull().default(0),
  createdAt: timestamp("created_at")
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => new Date())
    .notNull(),
});

// Notification subscriptions for push notifications
export const notificationSubscription = pgTable("notification_subscription", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at")
    .$defaultFn(() => new Date())
    .notNull(),
  isActive: boolean("is_active").notNull().default(true),
});

// Network sentiment cache (for performance)
export const networkSentiment = pgTable("network_sentiment", {
  id: uuid("id").primaryKey().defaultRandom(),
  date: timestamp("date").notNull().unique(), // One entry per day
  bullishCount: integer("bullish_count").notNull().default(0),
  bearishCount: integer("bearish_count").notNull().default(0),
  neutralCount: integer("neutral_count").notNull().default(0),
  confusedCount: integer("confused_count").notNull().default(0),
  totalMoods: integer("total_moods").notNull().default(0),
  calculatedAt: timestamp("calculated_at")
    .$defaultFn(() => new Date())
    .notNull(),
});

// Define relations
export const userRelations = relations(user, ({ many }) => ({
  moodEntries: many(moodEntry),
  streak: many(userStreak),
  subscriptions: many(notificationSubscription),
}));

export const moodEntryRelations = relations(moodEntry, ({ one }) => ({
  user: one(user, {
    fields: [moodEntry.userId],
    references: [user.id],
  }),
}));

export const userStreakRelations = relations(userStreak, ({ one }) => ({
  user: one(user, {
    fields: [userStreak.userId],
    references: [user.id],
  }),
}));

export const notificationSubscriptionRelations = relations(notificationSubscription, ({ one }) => ({
  user: one(user, {
    fields: [notificationSubscription.userId],
    references: [user.id],
  }),
}));