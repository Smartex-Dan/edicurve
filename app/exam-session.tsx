import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

const HISTORY_KEY = "edicurve-exam-history";
// Keep in sync with app/(tabs)/exam.tsx. Lower this temporarily (say 3) to
// test the auto-submit quickly.
const SECONDS_PER_QUESTION = 40;

type Letter = "A" | "B" | "C" | "D";
const LETTERS: Letter[] = ["A", "B", "C", "D"];
type Phase = "loading" | "empty" | "intro" | "running" | "results";

type ExamQuestion = {
  id: number;
  body: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: Letter;
  explanation: string;
  year: number | null;
  topicName: string;
  subjectName: string;
  subjectColor: string;
};

function optionOf(q: ExamQuestion, letter: Letter) {
  return { A: q.optionA, B: q.optionB, C: q.optionC, D: q.optionD }[letter];
}

function formatTime(totalSeconds: number) {
  const s = Math.max(0, totalSeconds);
  const h = Math.floor(s / 3600);
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const sec = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${m}:${sec}` : `${m}:${sec}`;
}

export default function ExamSessionScreen() {
  const router = useRouter();
  const colors = useColors();
  const { subjects: subjectsParam, perSubject: perSubjectParam } =
    useLocalSearchParams<{ subjects?: string; perSubject?: string }>();

  const subjectNames = useMemo(
    () =>
      (subjectsParam ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    [subjectsParam],
  );
  const perSubject = Math.min(
    60,
    Math.max(1, parseInt(perSubjectParam ?? "20", 10) || 20),
  );

  const build = trpc.bank.buildExam.useMutation();

  const [phase, setPhase] = useState<Phase>("loading");
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, Letter>>({});
  const [flagged, setFlagged] = useState<Record<number, boolean>>({});
  const [loadError, setLoadError] = useState("");
  const [index, setIndex] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [showPalette, setShowPalette] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [confirm, setConfirm] = useState<null | "submit" | "exit">(null);
  const endAtRef = useRef(0);

  const totalSeconds = Math.max(60, questions.length * SECONDS_PER_QUESTION);

  const loadExam = async () => {
    setPhase("loading");
    setAnswers({});
    setFlagged({});
    setIndex(0);
    setShowPalette(false);
    setShowReview(false);
    setConfirm(null);
    try {
      const data = await build.mutateAsync({
        subjects: subjectNames,
        perSubject,
      });
      if (data.length === 0) {
        setPhase("empty");
      } else {
        setQuestions(data as ExamQuestion[]);
        setPhase("intro");
      }
      } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unknown error");
    }
  };

  useEffect(() => {
    if (subjectNames.length === 0) setPhase("empty");
    else loadExam();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Countdown, based on an end timestamp so it stays accurate if the tab sleeps.
  useEffect(() => {
    if (phase !== "running") return;
    const id = setInterval(() => {
      setRemaining(
        Math.max(0, Math.round((endAtRef.current - Date.now()) / 1000)),
      );
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (phase === "running" && remaining <= 0) finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, phase]);

  const startExam = () => {
    endAtRef.current = Date.now() + totalSeconds * 1000;
    setRemaining(totalSeconds);
    setIndex(0);
    setPhase("running");
  };

  const finish = () => {
    setConfirm(null);
    setElapsed(Math.max(0, totalSeconds - remaining));
    setPhase("results");

    const rows = questions.map((q, i) => ({
      subject: q.subjectName,
      topic: q.topicName,
      answered: answers[i] !== undefined,
      correct: answers[i] === q.correctOption,
    }));
    AsyncStorage.getItem(HISTORY_KEY)
      .then((raw) => {
        const history = raw ? JSON.parse(raw) : [];
        history.push({
          at: Date.now(),
          total: rows.length,
          correct: rows.filter((r) => r.correct).length,
          seconds: Math.max(0, totalSeconds - remaining),
          questions: rows,
        });
        return AsyncStorage.setItem(
          HISTORY_KEY,
          JSON.stringify(history.slice(-50)),
        );
      })
      .catch(() => {
        // History is a bonus; never block the results screen on it.
      });
  };

  const results = useMemo(() => {
    const bySubject = new Map<
      string,
      { correct: number; total: number; color: string }
    >();
    let correct = 0;
    let unanswered = 0;
    questions.forEach((q, i) => {
      const entry = bySubject.get(q.subjectName) ?? {
        correct: 0,
        total: 0,
        color: q.subjectColor,
      };
      entry.total += 1;
      const picked = answers[i];
      if (picked === undefined) unanswered += 1;
      if (picked === q.correctOption) {
        entry.correct += 1;
        correct += 1;
      }
      bySubject.set(q.subjectName, entry);
    });
    return { correct, unanswered, subjects: Array.from(bySubject.entries()) };
  }, [questions, answers]);

  const answeredCount = Object.keys(answers).length;
  const unansweredCount = questions.length - answeredCount;
  const q = questions[index];
  const accent = q?.subjectColor ?? colors.primary;
  const lowTime = remaining <= 300;

  const backButton = (
    <Pressable
      onPress={() => router.back()}
      style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
    >
      <Text className="text-sm font-bold text-primary">Back</Text>
    </Pressable>
  );

  // ── Loading ─────────────────────────────────────────────────────────────
  if (phase === "loading") {
    return (
      <ScreenContainer className="items-center justify-center">
        <ActivityIndicator color={colors.primary} />
        <Text className="mt-3 text-sm text-muted">Building your exam...</Text>
      </ScreenContainer>
    );
  }

  // ── Empty ───────────────────────────────────────────────────────────────
  if (phase === "empty") {
    return (
      <ScreenContainer className="px-5 pt-5">
        {backButton}
        <Text className="mt-6 text-2xl font-bold text-foreground">
          No questions available
        </Text>
        <Text className="mt-3 text-sm leading-5 text-muted">
          The question bank has nothing for these subjects yet. Add CSV files to
          seed/questions (named exactly like the subjects) and run the seed
          script.
          { loadError ? (
          <Text className="mt-3 text-sm text-muted">Error: {loadError}</Text>
        ) : null }
        </Text>
      </ScreenContainer>
    );
  }

  // ── Intro ───────────────────────────────────────────────────────────────
  if (phase === "intro") {
    const minutes = Math.ceil(totalSeconds / 60);
    return (
      <ScreenContainer className="px-5 pt-5">
        {backButton}
        <Text className="mt-6 text-sm font-semibold text-primary">
          MOCK EXAM
        </Text>
        <Text className="mt-1 text-3xl font-bold text-foreground">
          Ready when you are
        </Text>

        <View className="mt-6 rounded-3xl border border-border bg-surface p-5">
          <View className="flex-row justify-between">
            <View>
              <Text className="text-2xl font-bold text-foreground">
                {questions.length}
              </Text>
              <Text className="text-xs text-muted">Questions</Text>
            </View>
            <View>
              <Text className="text-2xl font-bold text-foreground">
                {minutes} min
              </Text>
              <Text className="text-xs text-muted">Time allowed</Text>
            </View>
            <View>
              <Text className="text-2xl font-bold text-foreground">
                {new Set(questions.map((x) => x.subjectName)).size}
              </Text>
              <Text className="text-xs text-muted">Subjects</Text>
            </View>
          </View>
          <Text className="mt-5 text-xs font-bold text-muted">RULES</Text>
          <Text className="mt-2 text-sm leading-5 text-foreground">
            The timer starts when you tap Start and keeps running. You can
            change answers and flag questions to revisit. The exam submits
            itself when time runs out, and answers are shown after you submit.
          </Text>
        </View>

        <Pressable
          onPress={startExam}
          style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
        >
          <View className="mt-8 items-center rounded-2xl bg-primary py-4">
            <Text className="text-sm font-bold text-background">
              Start exam
            </Text>
          </View>
        </Pressable>
      </ScreenContainer>
    );
  }

  // ── Results ─────────────────────────────────────────────────────────────
  if (phase === "results") {
    const percent = Math.round((results.correct / questions.length) * 100);
    const wrong = questions
      .map((item, i) => ({ item, i }))
      .filter(({ item, i }) => answers[i] !== item.correctOption);

    return (
      <ScreenContainer className="px-5 pt-5">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {backButton}
          <View className="mt-8 items-center">
            <Text className="text-sm font-semibold text-primary">
              EXAM COMPLETE
            </Text>
            <Text className="mt-3 text-6xl font-bold text-foreground">
              {percent}%
            </Text>
            <Text className="mt-2 text-base text-muted">
              {results.correct} of {questions.length} correct ·{" "}
              {formatTime(elapsed)} used
            </Text>
            {results.unanswered > 0 && (
              <Text className="mt-1 text-xs text-muted">
                {results.unanswered} unanswered
              </Text>
            )}
          </View>

          <Text className="mt-8 text-xl font-bold text-foreground">
            By subject
          </Text>
          <View className="mt-4 gap-3">
            {results.subjects.map(([name, stat]) => {
              const pct = Math.round((stat.correct / stat.total) * 100);
              return (
                <View
                  key={name}
                  className="rounded-2xl border border-border bg-surface p-4"
                >
                  <View className="flex-row items-center justify-between">
                    <Text className="font-bold text-foreground">{name}</Text>
                    <Text className="font-bold" style={{ color: stat.color }}>
                      {stat.correct}/{stat.total} · {pct}%
                    </Text>
                  </View>
                  <View className="mt-3 h-2 overflow-hidden rounded-full bg-[#E9E8E2]">
                    <View
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: stat.color }}
                    />
                  </View>
                </View>
              );
            })}
          </View>

          {wrong.length > 0 && (
            <Pressable
              onPress={() => setShowReview((value) => !value)}
              style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
            >
              <View className="mt-8 items-center rounded-2xl border border-border bg-surface py-3.5">
                <Text className="text-sm font-bold text-primary">
                  {showReview
                    ? "Hide review"
                    : `Review ${wrong.length} missed question${wrong.length === 1 ? "" : "s"}`}
                </Text>
              </View>
            </Pressable>
          )}

          {showReview && (
            <View className="mt-5 gap-3">
              {wrong.map(({ item, i }) => {
                const mine = answers[i];
                return (
                  <View
                    key={item.id}
                    className="rounded-2xl border border-border bg-surface p-4"
                  >
                    <Text
                      className="text-xs font-bold"
                      style={{ color: item.subjectColor }}
                    >
                      {item.subjectName} · {item.topicName}
                    </Text>
                    <Text className="mt-2 text-sm font-semibold leading-5 text-foreground">
                      {item.body}
                    </Text>
                    <Text className="mt-3 text-xs text-muted">
                      {mine
                        ? `Your answer: ${mine}. ${optionOf(item, mine)}`
                        : "You did not answer this question."}
                    </Text>
                    <Text
                      className="mt-1 text-xs font-bold"
                      style={{ color: "#27AE60" }}
                    >
                      Correct: {item.correctOption}.{" "}
                      {optionOf(item, item.correctOption)}
                    </Text>
                    <Text className="mt-2 text-xs leading-5 text-foreground">
                      {item.explanation}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          <Pressable
            onPress={loadExam}
            style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
          >
            <View className="mt-8 items-center rounded-2xl bg-primary py-4">
              <Text className="text-sm font-bold text-background">
                New exam
              </Text>
            </View>
          </Pressable>
        </ScrollView>
      </ScreenContainer>
    );
  }

  // ── Running ─────────────────────────────────────────────────────────────
  return (
    <ScreenContainer className="px-5 pt-5">
      <View className="flex-row items-center justify-between">
        <Pressable
          onPress={() => setConfirm("exit")}
          style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
        >
          <Text className="text-sm font-bold text-muted">Exit</Text>
        </Pressable>
        <View className="flex-row items-center rounded-full border border-border bg-surface px-3 py-1.5">
          <IconSymbol
            name="clock.fill"
            size={14}
            color={lowTime ? "#E74C3C" : colors.muted}
          />
          <Text
            className="ml-1.5 text-sm font-bold"
            style={{ color: lowTime ? "#E74C3C" : colors.foreground }}
          >
            {formatTime(remaining)}
          </Text>
        </View>
        <Pressable
          onPress={() => setConfirm("submit")}
          style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
        >
          <Text className="text-sm font-bold text-primary">Submit</Text>
        </Pressable>
      </View>

      {confirm && (
        <View className="mt-4 rounded-2xl border border-border bg-surface p-4">
          <Text className="font-bold text-foreground">
            {confirm === "submit" ? "Submit exam?" : "Leave this exam?"}
          </Text>
          <Text className="mt-1 text-sm text-muted">
            {confirm === "submit"
              ? unansweredCount > 0
                ? `${unansweredCount} question${unansweredCount === 1 ? "" : "s"} still unanswered.`
                : "You have answered every question."
              : "Your progress will be lost."}
          </Text>
          <View className="mt-4 flex-row gap-3">
            <Pressable
              onPress={() => setConfirm(null)}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, flex: 1 }]}
            >
              <View className="items-center rounded-xl border border-border py-3">
                <Text className="text-sm font-bold text-muted">Keep going</Text>
              </View>
            </Pressable>
            <Pressable
              onPress={() => (confirm === "submit" ? finish() : router.back())}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, flex: 1 }]}
            >
              <View className="items-center rounded-xl bg-primary py-3">
                <Text className="text-sm font-bold text-background">
                  {confirm === "submit" ? "Submit" : "Leave"}
                </Text>
              </View>
            </Pressable>
          </View>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        <View className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#E6E1D7]">
          <View
            className="h-full rounded-full"
            style={{
              width: `${(answeredCount / questions.length) * 100}%`,
              backgroundColor: colors.primary,
            }}
          />
        </View>
        <Text className="mt-2 text-xs text-muted">
          {answeredCount} of {questions.length} answered
        </Text>

        {showPalette ? (
          <>
            <Text className="mt-5 text-xl font-bold text-foreground">
              Questions
            </Text>
            <Text className="mt-1 text-xs text-muted">
              Tinted = answered · amber border = flagged
            </Text>
            <View className="mt-4 flex-row flex-wrap gap-2">
              {questions.map((item, i) => {
                const answered = answers[i] !== undefined;
                const isCurrent = i === index;
                const isFlagged = !!flagged[i];
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => {
                      setIndex(i);
                      setShowPalette(false);
                    }}
                  >
                    <View
                      className="h-10 w-10 items-center justify-center rounded-xl"
                      style={{
                        borderWidth: isCurrent || isFlagged ? 2 : 1,
                        borderColor: isFlagged
                          ? "#F2B84B"
                          : isCurrent
                            ? colors.primary
                            : colors.border,
                        backgroundColor: answered
                          ? `${item.subjectColor}30`
                          : colors.surface,
                      }}
                    >
                      <Text className="text-xs font-bold text-foreground">
                        {i + 1}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              onPress={() => setShowPalette(false)}
              style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
            >
              <View className="mt-6 items-center rounded-2xl bg-primary py-3.5">
                <Text className="text-sm font-bold text-background">
                  Back to question
                </Text>
              </View>
            </Pressable>
          </>
        ) : (
          <>
            <View className="mt-5 flex-row items-center justify-between">
              <Text className="text-xs font-bold" style={{ color: accent }}>
                {q.subjectName} · {q.topicName}
                {q.year ? ` · ${q.year}` : ""}
              </Text>
              <Text className="text-xs font-bold text-muted">
                Q {index + 1} / {questions.length}
              </Text>
            </View>
            <Text className="mt-3 text-xl font-bold leading-7 text-foreground">
              {q.body}
            </Text>

            <View className="mt-5 gap-3">
              {LETTERS.map((letter) => {
                const selected = answers[index] === letter;
                return (
                  <Pressable
                    key={letter}
                    onPress={() =>
                      setAnswers((prev) => {
                        const next = { ...prev };
                        if (next[index] === letter) delete next[index];
                        else next[index] = letter;
                        return next;
                      })
                    }
                    style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
                  >
                    <View
                      className="flex-row items-center rounded-2xl border p-4"
                      style={{
                        borderColor: selected ? accent : colors.border,
                        backgroundColor: selected
                          ? `${accent}18`
                          : colors.surface,
                      }}
                    >
                      <View
                        className="h-8 w-8 items-center justify-center rounded-full"
                        style={{
                          backgroundColor: selected ? accent : "#E9E8E2",
                        }}
                      >
                        <Text
                          className="text-xs font-bold"
                          style={{ color: selected ? "#fff" : colors.foreground }}
                        >
                          {letter}
                        </Text>
                      </View>
                      <Text className="ml-3 flex-1 text-sm text-foreground">
                        {optionOf(q, letter)}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <View className="mt-6 flex-row gap-2">
              <Pressable
                onPress={() => setIndex((i) => Math.max(0, i - 1))}
                disabled={index === 0}
                style={({ pressed }) => [
                  { opacity: index === 0 ? 0.35 : pressed ? 0.7 : 1, flex: 1 },
                ]}
              >
                <View className="items-center rounded-xl border border-border py-3">
                  <Text className="text-xs font-bold text-foreground">
                    Previous
                  </Text>
                </View>
              </Pressable>
              <Pressable
                onPress={() =>
                  setFlagged((prev) => ({ ...prev, [index]: !prev[index] }))
                }
                style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, flex: 1 }]}
              >
                <View
                  className="items-center rounded-xl border py-3"
                  style={{
                    borderColor: flagged[index] ? "#F2B84B" : colors.border,
                    backgroundColor: flagged[index] ? "#F2B84B22" : "transparent",
                  }}
                >
                  <Text className="text-xs font-bold text-foreground">
                    {flagged[index] ? "Flagged" : "Flag"}
                  </Text>
                </View>
              </Pressable>
              <Pressable
                onPress={() => setShowPalette(true)}
                style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, flex: 1 }]}
              >
                <View className="items-center rounded-xl border border-border py-3">
                  <Text className="text-xs font-bold text-foreground">
                    Questions
                  </Text>
                </View>
              </Pressable>
              <Pressable
                onPress={() =>
                  setIndex((i) => Math.min(questions.length - 1, i + 1))
                }
                disabled={index === questions.length - 1}
                style={({ pressed }) => [
                  {
                    opacity:
                      index === questions.length - 1 ? 0.35 : pressed ? 0.7 : 1,
                    flex: 1,
                  },
                ]}
              >
                <View className="items-center rounded-xl bg-primary py-3">
                  <Text className="text-xs font-bold text-background">
                    Next
                  </Text>
                </View>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}