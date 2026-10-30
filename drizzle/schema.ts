import {
  boolean,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  unique,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

// ─── existing tables ──────────────────────────────────────────────────────────

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const assignments = mysqlTable("assignments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  course: varchar("course", { length: 160 }).notNull(),
  dueAt: timestamp("dueAt").notNull(),
  done: boolean("done").default(false).notNull(),
  reminderMinutes: int("reminderMinutes").default(60).notNull(),
  reminderEnabled: boolean("reminderEnabled").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const notes = mysqlTable("notes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const studySchedules = mysqlTable("studySchedules", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  goal: varchar("goal", { length: 255 }).notNull(),
  subjects: text("subjects").notNull(),
  minutesPerDay: int("minutesPerDay").default(30).notNull(),
  studyDays: text("studyDays").notNull(),
  reminderEnabled: boolean("reminderEnabled").default(true).notNull(),
  reminderHour: int("reminderHour").default(18).notNull(),
  reminderMinute: int("reminderMinute").default(0).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const pushTokens = mysqlTable("pushTokens", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  platform: varchar("platform", { length: 32 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── question bank ────────────────────────────────────────────────────────────

export const subjects = mysqlTable("subjects", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 120 }).notNull().unique(),
  color: varchar("color", { length: 7 }).notNull().default("#0F6B54"),
  icon: varchar("icon", { length: 64 }).notNull().default("book.fill"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const topics = mysqlTable("topics", {
  id: int("id").autoincrement().primaryKey(),
  subjectId: int("subjectId").notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const questions = mysqlTable("questions", {
  id: int("id").autoincrement().primaryKey(),
  subjectId: int("subjectId").notNull(),
  topicId: int("topicId").notNull(),
  body: text("body").notNull(),
  optionA: text("optionA").notNull(),
  optionB: text("optionB").notNull(),
  optionC: text("optionC").notNull(),
  optionD: text("optionD").notNull(),
  correctOption: mysqlEnum("correctOption", ["A", "B", "C", "D"]).notNull(),
  explanation: text("explanation").notNull(),
  year: int("year"),
  source: varchar("source", { length: 64 }).default("JAMB"),
  difficulty: mysqlEnum("difficulty", ["easy", "medium", "hard"]).default("medium").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── quiz attempts (extended) ─────────────────────────────────────────────────

export const quizAttempts = mysqlTable("quizAttempts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  // kept for AI-generated quizzes (no topicId)
  course: varchar("course", { length: 160 }).notNull(),
  quizTitle: varchar("quizTitle", { length: 255 }).notNull(),
  score: int("score").notNull(),
  total: int("total").notNull(),
  answers: text("answers"),
  // new — null for AI-generated quizzes, set for bank questions
  topicId: int("topicId"),
  subjectId: int("subjectId"),
  // "ai" = Prep AI generated | "bank" = past question bank | "exam" = mock exam
  attemptSource: mysqlEnum("attemptSource", ["ai", "bank", "exam"]).default("ai").notNull(),
  timeTakenSeconds: int("timeTakenSeconds"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── bookmarks ────────────────────────────────────────────────────────────────

export const bookmarks = mysqlTable("bookmarks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  questionId: int("questionId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const connectorTokens = mysqlTable(
  "connectorTokens",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    provider: mysqlEnum("provider", ["google", "notion"]).notNull(),
    accessToken: text("accessToken").notNull(),
    refreshToken: text("refreshToken"),
    expiresAt: timestamp("expiresAt"),
    scope: text("scope"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (t) => [unique("user_provider_unique").on(t.userId, t.provider)],
);

export type ConnectorToken = typeof connectorTokens.$inferSelect;
export type InsertConnectorToken = typeof connectorTokens.$inferInsert;

// ─── types ────────────────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Assignment = typeof assignments.$inferSelect;
export type InsertAssignment = typeof assignments.$inferInsert;
export type Note = typeof notes.$inferSelect;
export type InsertNote = typeof notes.$inferInsert;
export type QuizAttempt = typeof quizAttempts.$inferSelect;
export type InsertQuizAttempt = typeof quizAttempts.$inferInsert;
export type StudySchedule = typeof studySchedules.$inferSelect;
export type InsertStudySchedule = typeof studySchedules.$inferInsert;
export type Subject = typeof subjects.$inferSelect;
export type Topic = typeof topics.$inferSelect;
export type Question = typeof questions.$inferSelect;
export type Bookmark = typeof bookmarks.$inferSelect;