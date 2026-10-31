import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
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

const HISTORY_KEY = "edicurve-practice-history";
const SET_SIZE = 10;

type Letter = "A" | "B" | "C" | "D";
const LETTERS: Letter[] = ["A", "B", "C", "D"];

export default function PracticeScreen() {
  const router = useRouter();
  const colors = useColors();
  const { subject, topic: topicParam } = useLocalSearchParams<{
    subject?: string;
    topic?: string;
  }>();

  const subjectsQuery = trpc.bank.subjects.useQuery();
  const bankSubject = subjectsQuery.data?.find((s) => s.name === subject);
  const topicsQuery = trpc.bank.topics.useQuery(
    { subjectId: bankSubject?.id ?? 0 },
    { enabled: !!bankSubject },
  );

  const [topicId, setTopicId] = useState<number | undefined>(undefined);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<Letter | null>(null);
  const [score, setScore] = useState(0);
  const [loadingSet, setLoadingSet] = useState(false);
  const [emptySet, setEmptySet] = useState(false);

  const practice = trpc.bank.practice.useQuery(
    { subjectId: bankSubject?.id ?? 0, topicId, limit: SET_SIZE },
    { enabled: false, staleTime: Infinity },
  );

  const topicNames = useMemo(() => {
    const map = new Map<number, string>();
    topicsQuery.data?.forEach((t) => map.set(t.id, t.name));
    return map;
  }, [topicsQuery.data]);

// Arriving from Analytics with a topic: preselect it once topics load.
  useEffect(() => {
    if (!topicParam || !topicsQuery.data) return;
    const match = topicsQuery.data.find((t) => t.name === topicParam);
    if (match) setTopicId(match.id);
  }, [topicParam, topicsQuery.data]);

  const accent = bankSubject?.color ?? colors.primary;
  const questionSet = practice.data ?? [];
  const current = questionSet[index];

  const startSet = async () => {
    if (!bankSubject) return;
    setLoadingSet(true);
    setEmptySet(false);
    const result = await practice.refetch();
    setLoadingSet(false);
    if (!result.data || result.data.length === 0) {
      setEmptySet(true);
      return;
    }
    setIndex(0);
    setPicked(null);
    setScore(0);
    setFinished(false);
    setStarted(true);
  };

  const answer = async (letter: Letter) => {
    if (picked || !current) return;
    setPicked(letter);
    const correct = letter === current.correctOption;
    if (correct) setScore((value) => value + 1);

    try {
      const raw = await AsyncStorage.getItem(HISTORY_KEY);
      const history = raw ? JSON.parse(raw) : [];
      history.push({
        subject,
        topic: topicNames.get(current.topicId) ?? "General",
        correct,
        at: Date.now(),
      });
      await AsyncStorage.setItem(
        HISTORY_KEY,
        JSON.stringify(history.slice(-2000)),
      );
    } catch {
      // History is a bonus; never block practice on it.
    }
  };

  const next = () => {
    if (index + 1 < questionSet.length) {
      setIndex(index + 1);
      setPicked(null);
    } else {
      setFinished(true);
    }
  };

  const optionText = (letter: Letter) => {
    if (!current) return "";
    return {
      A: current.optionA,
      B: current.optionB,
      C: current.optionC,
      D: current.optionD,
    }[letter];
  };

  const backButton = (
    <Pressable
      onPress={() => router.back()}
      style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
    >
      <Text className="text-sm font-bold text-primary">Back</Text>
    </Pressable>
  );

  // ── Loading / missing subject ───────────────────────────────────────────
  if (subjectsQuery.isLoading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <ActivityIndicator color={colors.primary} />
      </ScreenContainer>
    );
  }

    if (subjectsQuery.isError) {
    return (
      <ScreenContainer className="px-5 pt-5">
        {backButton}
        <Text className="mt-6 text-2xl font-bold text-foreground">
          Could not load the question bank
        </Text>
        <Text className="mt-3 text-sm leading-5 text-muted">
          {subjectsQuery.error.message}
        </Text>
      </ScreenContainer>
    );
  }

  if (!bankSubject) {
    return (
      <ScreenContainer className="px-5 pt-5">
        {backButton}
        <Text className="mt-6 text-2xl font-bold text-foreground">
          {subject ?? "This subject"} has no questions yet
        </Text>
        <Text className="mt-3 text-sm leading-5 text-muted">
          The question bank is empty for this subject. Add a CSV named exactly
          like the subject (for example Physics.csv) to seed/questions and run
          the seed script.
        </Text>
      </ScreenContainer>
    );
  }

  // ── Finished ───────────────────────────────────────────────────────────
  if (finished) {
    const percent = Math.round((score / questionSet.length) * 100);
    return (
      <ScreenContainer className="px-5 pt-5">
        {backButton}
        <View className="mt-10 items-center">
          <Text className="text-sm font-semibold text-primary">
            SET COMPLETE
          </Text>
          <Text className="mt-3 text-6xl font-bold" style={{ color: accent }}>
            {percent}%
          </Text>
          <Text className="mt-2 text-base text-muted">
            {score} of {questionSet.length} correct
          </Text>
        </View>
        <Pressable
          onPress={startSet}
          style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
        >
          <View
            className="mt-10 items-center rounded-2xl py-4"
            style={{ backgroundColor: accent }}
          >
            <Text className="text-sm font-bold text-white">
              {loadingSet ? "Loading..." : "New set"}
            </Text>
          </View>
        </Pressable>
        <Pressable
          onPress={() => {
            setStarted(false);
            setFinished(false);
          }}
          style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
        >
          <Text className="mt-4 text-center text-sm font-semibold text-muted">
            Change topic
          </Text>
        </Pressable>
      </ScreenContainer>
    );
  }

  // ── Question view ──────────────────────────────────────────────────────
  if (started && current) {
    const wasCorrect = picked === current.correctOption;
    return (
      <ScreenContainer className="px-5 pt-5">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
        >
          <View className="flex-row items-center justify-between">
            {backButton}
            <Text className="text-xs font-bold text-muted">
              {index + 1} of {questionSet.length}
            </Text>
          </View>

          <View className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#E6E1D7]">
            <View
              className="h-full rounded-full"
              style={{
                width: `${((index + 1) / questionSet.length) * 100}%`,
                backgroundColor: accent,
              }}
            />
          </View>

          <Text className="mt-6 text-xs font-bold text-muted">
            {topicNames.get(current.topicId) ?? "General"}
            {current.year ? ` · ${current.year}` : ""}
          </Text>
          <Text className="mt-2 text-xl font-bold leading-7 text-foreground">
            {current.body}
          </Text>

          <View className="mt-6 gap-3">
            {LETTERS.map((letter) => {
              const isCorrect = letter === current.correctOption;
              const isPicked = letter === picked;
              let borderColor = colors.border;
              let backgroundColor = colors.surface;
              if (picked) {
                if (isCorrect) {
                  borderColor = "#27AE60";
                  backgroundColor = "#27AE6018";
                } else if (isPicked) {
                  borderColor = "#E74C3C";
                  backgroundColor = "#E74C3C18";
                }
              }
              return (
                <Pressable
                  key={letter}
                  onPress={() => answer(letter)}
                  disabled={!!picked}
                  style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
                >
                  <View
                    className="flex-row items-center rounded-2xl border p-4"
                    style={{ borderColor, backgroundColor }}
                  >
                    <View className="h-8 w-8 items-center justify-center rounded-full bg-[#E9E8E2]">
                      <Text className="text-xs font-bold text-foreground">
                        {letter}
                      </Text>
                    </View>
                    <Text className="ml-3 flex-1 text-sm text-foreground">
                      {optionText(letter)}
                    </Text>
                    {picked && isCorrect && (
                      <IconSymbol name="checkmark" size={16} color="#27AE60" />
                    )}
                    {picked && isPicked && !isCorrect && (
                      <IconSymbol name="xmark" size={16} color="#E74C3C" />
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>

          {picked && (
            <View className="mt-5 rounded-2xl border border-border bg-surface p-4">
              <Text
                className="text-xs font-bold"
                style={{ color: wasCorrect ? "#27AE60" : "#E74C3C" }}
              >
                {wasCorrect
                  ? "CORRECT"
                  : `NOT QUITE — ANSWER IS ${current.correctOption}`}
              </Text>
              <Text className="mt-2 text-sm leading-5 text-foreground">
                {current.explanation}
              </Text>
            </View>
          )}

          {picked && (
            <Pressable
              onPress={next}
              style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
            >
              <View
                className="mt-5 items-center rounded-2xl py-4"
                style={{ backgroundColor: accent }}
              >
                <Text className="text-sm font-bold text-white">
                  {index + 1 < questionSet.length ? "Next question" : "See result"}
                </Text>
              </View>
            </Pressable>
          )}
        </ScrollView>
      </ScreenContainer>
    );
  }

  // ── Topic picker (start screen) ────────────────────────────────────────
  return (
    <ScreenContainer className="px-5 pt-5">
      {backButton}
      <Text className="mt-6 text-sm font-semibold text-primary">PRACTICE</Text>
      <Text className="mt-1 text-3xl font-bold text-foreground">
        {bankSubject.name}
      </Text>
      <Text className="mt-2 text-sm text-muted">
        {bankSubject.questionCount} questions in the bank. Each set is{" "}
        {SET_SIZE} random questions.
      </Text>

      <Text className="mt-8 text-sm font-bold text-foreground">Topic</Text>
      <View className="mt-3 flex-row flex-wrap gap-2">
        <Pressable onPress={() => setTopicId(undefined)}>
          <View
            className="rounded-full border px-4 py-2.5"
            style={{
              borderColor: topicId === undefined ? accent : colors.border,
              backgroundColor: topicId === undefined ? accent : colors.surface,
            }}
          >
            <Text
              className="text-sm font-semibold"
              style={{ color: topicId === undefined ? "#fff" : colors.foreground }}
            >
              All topics
            </Text>
          </View>
        </Pressable>
        {topicsQuery.data?.map((topic) => {
          const selected = topicId === topic.id;
          return (
            <Pressable key={topic.id} onPress={() => setTopicId(topic.id)}>
              <View
                className="rounded-full border px-4 py-2.5"
                style={{
                  borderColor: selected ? accent : colors.border,
                  backgroundColor: selected ? accent : colors.surface,
                }}
              >
                <Text
                  className="text-sm font-semibold"
                  style={{ color: selected ? "#fff" : colors.foreground }}
                >
                  {topic.name} ({topic.questionCount})
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {emptySet && (
        <Text className="mt-4 text-sm text-muted">
          No questions found for that selection.
        </Text>
      )}

      <Pressable
        onPress={startSet}
        disabled={loadingSet}
        style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
      >
        <View
          className="mt-10 items-center rounded-2xl py-4"
          style={{ backgroundColor: accent }}
        >
          <Text className="text-sm font-bold text-white">
            {loadingSet ? "Loading..." : "Start practice"}
          </Text>
        </View>
      </Pressable>
    </ScreenContainer>
  );
}