import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { assignments, InsertAssignment, InsertNote, InsertQuizAttempt, InsertStudySchedule, InsertUser, notes, pushTokens, quizAttempts, studySchedules, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try { _db = drizzle(process.env.DATABASE_URL); } catch (error) { console.warn("[Database] Failed to connect:", error); _db = null; }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) { if (user[field] !== undefined) { values[field] = user[field] ?? null; updateSet[field] = user[field] ?? null; } }
  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (!Object.keys(updateSet).length) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function listAssignments(userId: number) { const db = await getDb(); if (!db) return []; return db.select().from(assignments).where(eq(assignments.userId, userId)).orderBy(assignments.dueAt); }
export async function createAssignment(data: InsertAssignment) { const db = await getDb(); if (!db) throw new Error("Database not available"); const result = await db.insert(assignments).values(data); return Number(result[0].insertId); }
export async function updateAssignment(userId: number, id: number, data: Partial<InsertAssignment>) { const db = await getDb(); if (!db) throw new Error("Database not available"); await db.update(assignments).set(data).where(and(eq(assignments.id, id), eq(assignments.userId, userId))); }

export async function listNotes(userId: number) { const db = await getDb(); if (!db) return []; return db.select().from(notes).where(eq(notes.userId, userId)).orderBy(desc(notes.updatedAt)); }
export async function createNote(data: InsertNote) { const db = await getDb(); if (!db) throw new Error("Database not available"); const result = await db.insert(notes).values(data); return Number(result[0].insertId); }
export async function updateNote(userId: number, id: number, data: Partial<InsertNote>) { const db = await getDb(); if (!db) throw new Error("Database not available"); await db.update(notes).set(data).where(and(eq(notes.id, id), eq(notes.userId, userId))); }

export async function listQuizAttempts(userId: number) { const db = await getDb(); if (!db) return []; return db.select().from(quizAttempts).where(eq(quizAttempts.userId, userId)).orderBy(desc(quizAttempts.createdAt)).limit(30); }
export async function createQuizAttempt(data: InsertQuizAttempt) { const db = await getDb(); if (!db) throw new Error("Database not available"); const result = await db.insert(quizAttempts).values(data); return Number(result[0].insertId); }

export async function getStudySchedule(userId: number) { const db = await getDb(); if (!db) return undefined; const result = await db.select().from(studySchedules).where(eq(studySchedules.userId, userId)).limit(1); return result[0]; }
export async function upsertStudySchedule(data: InsertStudySchedule) { const db = await getDb(); if (!db) throw new Error("Database not available"); await db.insert(studySchedules).values(data).onDuplicateKeyUpdate({ set: { goal: data.goal, subjects: data.subjects, minutesPerDay: data.minutesPerDay, studyDays: data.studyDays, reminderEnabled: data.reminderEnabled, reminderHour: data.reminderHour, reminderMinute: data.reminderMinute } }); }

export async function registerPushToken(userId: number, token: string, platform: string) { const db = await getDb(); if (!db) throw new Error("Database not available"); await db.insert(pushTokens).values({ userId, token, platform }).onDuplicateKeyUpdate({ set: { userId, platform } }); }
