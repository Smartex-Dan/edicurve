import type { StudyHistory, StudyStats } from "@/lib/study-stats";

export type AchievementIcon =
  | "sparkles"
  | "checkmark.circle.fill"
  | "book.fill"
  | "clock.fill"
  | "doc.text.fill"
  | "chart.bar.fill"
  | "calendar";

export type Achievement = {
  id: string;
  title: string;
  description: string;
  icon: AchievementIcon;
  unlocked: boolean;
};

export type DayBar = { label: string; count: number; isToday: boolean };

export type Level = {
  index: number;
  title: string;
  xpIntoLevel: number;
  xpForNext: number | null;
  percent: number;
};

export type StudyExtras = {
  week: DayBar[];
  answeredToday: number;
  xp: number;
  level: Level;
  longestStreak: number;
  achievements: Achievement[];
};

const LEVELS = [
  { title: "Newcomer", min: 0 },
  { title: "Learner", min: 50 },
  { title: "Scholar", min: 150 },
  { title: "Achiever", min: 350 },
  { title: "Master", min: 700 },
  { title: "Legend", min: 1200 },
];

function dayKey(ms: number): string {
  const d = new Date(ms);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

export function computeExtras(
  history: StudyHistory,
  stats: StudyStats,
): StudyExtras {
  // Questions answered per calendar day (practice + exams).
  const perDay = new Map<string, number>();
  const bump = (at: number, amount: number) => {
    const key = dayKey(at);
    perDay.set(key, (perDay.get(key) ?? 0) + amount);
  };
  history.practice.forEach((entry) => bump(entry.at, 1));
  history.exams.forEach((exam) =>
    bump(exam.at, (exam.questions ?? []).filter((q) => q.answered).length),
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const week: DayBar[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    week.push({
      label: d.toLocaleDateString("en-GB", { weekday: "short" }),
      count: perDay.get(dayKey(d.getTime())) ?? 0,
      isToday: i === 0,
    });
  }

  // Longest run of consecutive study days, ever.
  const days = Array.from(perDay.keys())
    .sort()
    .map((key) =>
      Math.round(new Date(`${key}T12:00:00`).getTime() / 86_400_000),
    );
  let longestStreak = 0;
  let run = 0;
  let previous: number | null = null;
  for (const day of days) {
    run = previous !== null && day - previous === 1 ? run + 1 : 1;
    longestStreak = Math.max(longestStreak, run);
    previous = day;
  }

  // XP and level.
  const xp = stats.totalAnswered + stats.totalCorrect + stats.examsTaken * 25;
  let levelIndex = 0;
  LEVELS.forEach((level, i) => {
    if (xp >= level.min) levelIndex = i;
  });
  const current = LEVELS[levelIndex];
  const next = LEVELS[levelIndex + 1];
  const level: Level = {
    index: levelIndex,
    title: current.title,
    xpIntoLevel: xp - current.min,
    xpForNext: next ? next.min - current.min : null,
    percent: next
      ? Math.round(((xp - current.min) / (next.min - current.min)) * 100)
      : 100,
  };

  const sharpExam = history.exams.some(
    (exam) => exam.total >= 5 && exam.correct / exam.total >= 0.8,
  );
  const topicMaster = stats.topics.some(
    (topic) => topic.attempts >= 5 && topic.percent >= 90,
  );

  const achievements: Achievement[] = [
    {
      id: "first",
      title: "First steps",
      description: "Answer your first question.",
      icon: "sparkles",
      unlocked: stats.totalAnswered >= 1,
    },
    {
      id: "q25",
      title: "Warming up",
      description: "Answer 25 questions.",
      icon: "book.fill",
      unlocked: stats.totalAnswered >= 25,
    },
    {
      id: "q100",
      title: "Century",
      description: "Answer 100 questions.",
      icon: "chart.bar.fill",
      unlocked: stats.totalAnswered >= 100,
    },
    {
      id: "streak3",
      title: "On a roll",
      description: "Study 3 days in a row.",
      icon: "calendar",
      unlocked: longestStreak >= 3,
    },
    {
      id: "streak7",
      title: "Week warrior",
      description: "Study 7 days in a row.",
      icon: "clock.fill",
      unlocked: longestStreak >= 7,
    },
    {
      id: "exam1",
      title: "Exam ready",
      description: "Finish a timed mock exam.",
      icon: "doc.text.fill",
      unlocked: stats.examsTaken >= 1,
    },
    {
      id: "sharp",
      title: "Sharp mind",
      description: "Score 80% or more in an exam of 5+ questions.",
      icon: "checkmark.circle.fill",
      unlocked: sharpExam,
    },
    {
      id: "topic",
      title: "Topic master",
      description: "Score 90% or more in a topic after 5+ answers.",
      icon: "sparkles",
      unlocked: topicMaster,
    },
    {
      id: "rounded",
      title: "Well-rounded",
      description: "Practise questions from 3 different subjects.",
      icon: "book.fill",
      unlocked: stats.subjects.length >= 3,
    },
  ];

  return {
    week,
    answeredToday: week[week.length - 1].count,
    xp,
    level,
    longestStreak,
    achievements,
  };
}