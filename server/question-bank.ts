// server/question-bank.ts
import { and, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "./db";
import { questions, subjects, topics } from "../drizzle/schema";

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db;
}

export async function listBankSubjects() {
  const db = await requireDb();
  const rows = await db
    .select({
      id: subjects.id,
      name: subjects.name,
      color: subjects.color,
      questionCount: sql<number>`count(${questions.id})`,
    })
    .from(subjects)
    .leftJoin(questions, eq(questions.subjectId, subjects.id))
    .groupBy(subjects.id, subjects.name, subjects.color);

  return rows.map((row) => ({
    ...row,
    questionCount: Number(row.questionCount),
  }));
}

export async function listBankTopics(subjectId: number) {
  const db = await requireDb();
  const rows = await db
    .select({
      id: topics.id,
      name: topics.name,
      questionCount: sql<number>`count(${questions.id})`,
    })
    .from(topics)
    .leftJoin(questions, eq(questions.topicId, topics.id))
    .where(eq(topics.subjectId, subjectId))
    .groupBy(topics.id, topics.name);

  return rows.map((row) => ({
    ...row,
    questionCount: Number(row.questionCount),
  }));
}

export async function getPracticeQuestions(input: {
  subjectId: number;
  topicId?: number;
  limit: number;
}) {
  const db = await requireDb();
  const conditions = [eq(questions.subjectId, input.subjectId)];
  if (input.topicId) conditions.push(eq(questions.topicId, input.topicId));

  return db
    .select()
    .from(questions)
    .where(and(...conditions))
    .orderBy(sql`RAND()`)
    .limit(input.limit);
}

export async function buildExam(input: {
  subjectNames: string[];
  perSubject: number;
}) {
  const db = await requireDb();

  const subjectRows = await db
    .select()
    .from(subjects)
    .where(inArray(subjects.name, input.subjectNames));

  const batches = await Promise.all(
    subjectRows.map(async (subject) => {
      const rows = await db
        .select({
          id: questions.id,
          body: questions.body,
          optionA: questions.optionA,
          optionB: questions.optionB,
          optionC: questions.optionC,
          optionD: questions.optionD,
          correctOption: questions.correctOption,
          explanation: questions.explanation,
          year: questions.year,
          topicName: topics.name,
        })
        .from(questions)
        .innerJoin(topics, eq(questions.topicId, topics.id))
        .where(eq(questions.subjectId, subject.id))
        .orderBy(sql`RAND()`)
        .limit(input.perSubject);

      return rows.map((row) => ({
        ...row,
        subjectName: subject.name,
        subjectColor: subject.color,
      }));
    }),
  );

  const order = new Map(input.subjectNames.map((name, i) => [name, i]));
  return batches
    .flat()
    .sort(
      (a, b) =>
        (order.get(a.subjectName) ?? 0) - (order.get(b.subjectName) ?? 0),
    );
}