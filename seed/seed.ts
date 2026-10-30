// seed/seed.ts
// Run with: npx tsx seed/seed.ts

import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { parse } from "csv-parse/sync";
import { and, eq } from "drizzle-orm";
import { subjects, topics, questions } from "../drizzle/schema";

type CsvRow = {
  subject?: string;
  topic: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct: string;
  explanation: string;
  year?: string;
  source?: string;
  difficulty?: string;
};

const SUBJECT_COLORS: Record<string, string> = {
  Mathematics: "#7668D9",
  English: "#D89034",
  Physics: "#0F6B54",
  Chemistry: "#C0392B",
  Biology: "#27AE60",
  Economics: "#2980B9",
  Government: "#8E44AD",
  Literature: "#E67E22",
  Geography: "#16A085",
  History: "#795548",
  "Further Maths": "#5C6BC0",
  "Computer Science": "#0288D1",
  Accounting: "#00897B",
  French: "#E91E63",
};

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set in your .env");
  }

  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const db = drizzle(connection);

  const csvDir = path.join(__dirname, "questions");
  const files = fs.readdirSync(csvDir).filter((f) => f.endsWith(".csv"));

  if (files.length === 0) {
    console.log("No CSV files found in seed/questions/. Add some and re-run.");
    await connection.end();
    return;
  }

  for (const file of files) {
    const subjectName = path.basename(file, ".csv");
    const color = SUBJECT_COLORS[subjectName] ?? "#0F6B54";

    await db
      .insert(subjects)
      .values({ name: subjectName, color, icon: "book.fill" })
      .onDuplicateKeyUpdate({ set: { color } });

    const [subject] = await db
      .select()
      .from(subjects)
      .where(eq(subjects.name, subjectName))
      .limit(1);

    console.log(`\nSubject: ${subjectName} (id ${subject.id})`);

    const raw = fs.readFileSync(path.join(csvDir, file), "utf-8");
    const rows = parse(raw, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as CsvRow[];

    let inserted = 0;
    let skipped = 0;

    for (const row of rows) {
      const existingTopic = await db
        .select()
        .from(topics)
        .where(
          and(eq(topics.subjectId, subject.id), eq(topics.name, row.topic)),
        )
        .limit(1);

      let topicId: number;
      if (existingTopic.length > 0) {
        topicId = existingTopic[0].id;
      } else {
        const result = await db
          .insert(topics)
          .values({ subjectId: subject.id, name: row.topic });
        topicId = Number(result[0].insertId);
        console.log(`  New topic: ${row.topic}`);
      }

      const duplicate = await db
        .select({ id: questions.id })
        .from(questions)
        .where(
          and(
            eq(questions.subjectId, subject.id),
            eq(questions.body, row.question),
          ),
        )
        .limit(1);

      if (duplicate.length > 0) {
        skipped++;
        continue;
      }

      await db.insert(questions).values({
        subjectId: subject.id,
        topicId,
        body: row.question,
        optionA: row.option_a,
        optionB: row.option_b,
        optionC: row.option_c,
        optionD: row.option_d,
        correctOption: row.correct.toUpperCase() as "A" | "B" | "C" | "D",
        explanation: row.explanation,
        year: row.year ? parseInt(row.year, 10) : null,
        source: row.source || "JAMB",
        difficulty:
          (row.difficulty as "easy" | "medium" | "hard") || "medium",
      });
      inserted++;
    }

    console.log(`  Done: ${inserted} inserted, ${skipped} already existed`);
  }

  console.log("\nSeed complete.");
  await connection.end();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});