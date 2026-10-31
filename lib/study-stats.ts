import AsyncStorage from "@react-native-async-storage/async-storage";

export const PRACTICE_HISTORY_KEY = "edicurve-practice-history";
export const EXAM_HISTORY_KEY = "edicurve-exam-history";

// A topic needs this many answered questions before it can be called weak.
export const MIN_ATTEMPTS = 3;
export const WEAK_BELOW_PERCENT = 70;

export const SUBJECT_COLORS: Record<string, string> = {
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

export const subjectColor = (name: string) =>
  SUBJECT_COLORS[name] ?? "#0F6B54";

export const scoreColor = (percent: number) =>
  percent < 50 ? "#E74C3C" : percent < WEAK_BELOW_PERCENT ? "#F2B84B" : "#27AE60";

type PracticeEntry = {
  subject: string;
  topic: string;
  correct: boolean;
  at: number;
};

type ExamEntry = {
  at: number;
  total: number;
  correct: number;
  seconds: number;
  questions: {
    subject: string;
    topic: string;
    answered: boolean;
    correct: boolean;
  }[];
};

export type StudyHistory = { practice: PracticeEntry[]; exams: ExamEntry[] };

export type TopicStat = {
  subject: string;
  topic: string;
  attempts: number;
  correct: number;
  percent: number;
};

export type SubjectStat = {
  subject: string;
  attempts: number;
  correct: number;
  percent: number;
};

export type StudyStats = {
  hasData: boolean;
  totalAnswered: number;
  totalCorrect: number;
  accuracy: number | null;
  examsTaken: number;
  streak: number;
  activeDaysThisWeek: number;
  weeklyGoal: number;
  weeklyPercent: number;
  answeredThisWeek: number;
  topics: TopicStat[];
  weakTopics: TopicStat[];
  subjects: SubjectStat[];
};

export const EMPTY_HISTORY: StudyHistory = { practice: [], exams: [] };

async function readList<T>(key: string): Promise<T[]> {
  try {
    const raw = await AsyncStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function loadStudyHistory(): Promise<StudyHistory> {
  const [practice, exams] = await Promise.all([
    readList<PracticeEntry>(PRACTICE_HISTORY_KEY),
    readList<ExamEntry>(EXAM_HISTORY_KEY),
  ]);
  return { practice, exams };
}

function dayKey(ms: number): string {
  const d = new Date(ms);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

// Monday 00:00 local time of the current week.
function startOfWeek(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
}

function computeStreak(activeDays: Set<string>): number {
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  // Nothing yet today? The streak is still alive through yesterday.
  if (!activeDays.has(dayKey(cursor.getTime()))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  let streak = 0;
  while (activeDays.has(dayKey(cursor.getTime()))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function computeStudyStats(
  history: StudyHistory,
  weeklyGoalDays: number,
): StudyStats {
  const topicMap = new Map<string, TopicStat>();
  const subjectMap = new Map<string, SubjectStat>();
  const activeDays = new Set<string>();
  const weekStart = startOfWeek();
  let totalAnswered = 0;
  let totalCorrect = 0;
  let answeredThisWeek = 0;

  const record = (
    subject: string,
    topic: string,
    correct: boolean,
    at: number,
  ) => {
    totalAnswered += 1;
    if (correct) totalCorrect += 1;
    if (at >= weekStart) answeredThisWeek += 1;
    activeDays.add(dayKey(at));

    const topicKey = `${subject}|${topic}`;
    const t = topicMap.get(topicKey) ?? {
      subject,
      topic,
      attempts: 0,
      correct: 0,
      percent: 0,
    };
    t.attempts += 1;
    if (correct) t.correct += 1;
    topicMap.set(topicKey, t);

    const s = subjectMap.get(subject) ?? {
      subject,
      attempts: 0,
      correct: 0,
      percent: 0,
    };
    s.attempts += 1;
    if (correct) s.correct += 1;
    subjectMap.set(subject, s);
  };

  history.practice.forEach((entry) =>
    record(entry.subject, entry.topic, !!entry.correct, entry.at),
  );

  history.exams.forEach((exam) => {
    activeDays.add(dayKey(exam.at));
    (exam.questions ?? []).forEach((q) => {
      // Unanswered questions (usually a timeout) say nothing about the topic.
      if (q.answered) record(q.subject, q.topic, !!q.correct, exam.at);
    });
  });

  const withPercent = <T extends { attempts: number; correct: number; percent: number }>(
    item: T,
  ): T => ({
    ...item,
    percent: Math.round((item.correct / item.attempts) * 100),
  });

  const topics = Array.from(topicMap.values())
    .map(withPercent)
    .sort((a, b) => a.percent - b.percent || b.attempts - a.attempts);
  const subjects = Array.from(subjectMap.values())
    .map(withPercent)
    .sort((a, b) => a.percent - b.percent);
  const weakTopics = topics.filter(
    (t) => t.attempts >= MIN_ATTEMPTS && t.percent < WEAK_BELOW_PERCENT,
  );

  const weekStartKey = dayKey(weekStart);
  const activeDaysThisWeek = Array.from(activeDays).filter(
    (key) => key >= weekStartKey,
  ).length;
  const weeklyGoal = weeklyGoalDays > 0 ? weeklyGoalDays : 3;

  return {
    hasData: totalAnswered > 0 || history.exams.length > 0,
    totalAnswered,
    totalCorrect,
    accuracy:
      totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : null,
    examsTaken: history.exams.length,
    streak: computeStreak(activeDays),
    activeDaysThisWeek,
    weeklyGoal,
    weeklyPercent: Math.min(
      100,
      Math.round((activeDaysThisWeek / weeklyGoal) * 100),
    ),
    answeredThisWeek,
    topics,
    weakTopics,
    subjects,
  };
}