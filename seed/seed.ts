// seed/seed.ts
// Run with: npx tsx seed/seed.ts

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as fs from "fs";
import * as path from "path";
import { parse } from "csv-parse/sync";
import { subjects, topics, questions } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import "dotenv/config";

const SUBJECTS_META: Record<string, { color: string; icon: string }> = {
  Mathematics:      { color: "#7668D9", icon: "function" },
  English:          { color: "#D89034", icon: "edit-note" },
  Physics:          { color: "#0F6B54", icon: "science" },
  Chemistry:        { color: "#C0392B", icon: "biotech" },
  Biology:          { color: "#27AE60", icon: "eco" },
  Economics:        { color: "#2980B9", icon: "trending-up" },
  Government:       { color: "#8E44AD", icon: "account-balance" },
  Literature:       { color: "#E67E22", icon: "menu-book" },
  Geography:        { color: "#16A085", icon: "public" },
  History:          { color: "#795548", icon: "history-edu" },
  "Further Maths":  { color: "#5C6BC0", icon: "calculate" },
  "Computer Science": { color: "#0288D1", icon: "computer" },
  Accounting:       { color: "#00897B", icon: "receipt-long" },
  French:           { color: "#E91E63", icon: "translate" },
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
    console.log("No CSV files found in seed/questions/. Add your CSVs and re-run.");
    process.exit(0);
  }

  for (const file of files) {
    const subjectName = path.basename(file, ".csv");
    const meta = SUBJECTS_META[subjectName] ?? { color: "#0F6B54", icon: "book.fill" };

    // upsert subject
    await db
      .insert(subjects)
      .values({ name: subjectName, color: meta.color, icon: meta.icon })
      .onDuplicateKeyUpdate({ set: { color: meta.color, icon: meta.icon } });

    const [subject] = await db
      .select()
      .from(subjects)
      .where(eq(subjects.name, subjectName))
      .limit(1);

    console.log(`\n📚 Subject: ${subjectName} (id: ${subject.id})`);

    const raw = fs.readFileSync(path.join(csvDir, file), "utf-8");
    const rows = parse(raw, { columns: true, skip_empty_lines: true, trim: true });

    for (const row of rows) {
      // upsert topic
      const existing = await db
        .select()
        .from(topics)
        .where(and(eq(topics.subjectId, subject.id), eq(topics.name, row.topic)))
        .limit(1);

      let topicId: number;

      if (existing.length > 0) {
        topicId = existing[0].id;
      } else {
        const result = await db
          .insert(topics)
          .values({ subjectId: subject.id, name: row.topic });
        topicId = Number(result[0].insertId);
        console.log(`  ↳ New topic: ${row.topic}`);
      }

      // insert question
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
        year: row.year ? parseInt(row.year) : null,
        source: row.source || "JAMB",
        difficulty: (row.difficulty as "easy" | "medium" | "hard") || "medium",
      });
    }

    console.log(`  ✓ ${rows.length} questions inserted for ${subjectName}`);
  }

  console.log("\n✅ Seed complete.");
  await connection.end();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});