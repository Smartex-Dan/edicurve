import { Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { TopicCard } from "@/components/topic-card";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useStudyStats } from "@/hooks/use-study-stats";
import { useColors } from "@/hooks/use-colors";
import { useOnboarding } from "@/lib/onboarding-context";
import { MIN_ATTEMPTS, subjectColor } from "@/lib/study-stats";

// Keep in sync with app/exam-session.tsx
const PER_SUBJECT = 20;
const SECONDS_PER_QUESTION = 40;

function durationLabel(questionCount: number) {
  const minutes = Math.ceil((questionCount * SECONDS_PER_QUESTION) / 60);
  if (minutes < 60) return `${minutes} min`;
  return `${(minutes / 60).toFixed(1).replace(".0", "")} hrs`;
}

export default function ExamScreen() {
  const colors = useColors();
  const router = useRouter();
  const { data: onboarding } = useOnboarding();
  const { stats } = useStudyStats();
  const subjects = onboarding.subjects ?? [];

  const startExam = (subjectList: string[]) =>
    router.push({
      pathname: "/exam-session",
      params: {
        subjects: subjectList.join(","),
        perSubject: String(PER_SUBJECT),
      },
    } as never);

  const startPractice = (subject: string, topic?: string) =>
    router.push({
      pathname: "/practice",
      params: topic ? { subject, topic } : { subject },
    } as never);

  const fullCount = subjects.length * PER_SUBJECT;
  const shownWeak = stats.weakTopics.slice(0, 3);

  return (
    <ScreenContainer className="px-5 pt-5" edges={["top", "left", "right"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <Text className="text-sm font-semibold text-primary">EXAM CENTRE</Text>
        <Text className="mt-1 text-3xl font-bold text-foreground">
          Mock Exam
        </Text>
        <Text className="mt-2 text-sm leading-5 text-muted">
          Simulate real exam conditions, track your scores, and see exactly
          where you need more work.
        </Text>

        <Text className="mt-8 text-xl font-bold text-foreground">
          Start an exam
        </Text>

        <Pressable
          onPress={() => subjects.length > 0 && startExam(subjects)}
          style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
        >
          <View className="mt-4 rounded-3xl bg-primary p-5">
            <View className="flex-row items-center justify-between">
              <View className="h-12 w-12 items-center justify-center rounded-2xl bg-[#2D8D72]">
                <IconSymbol name="doc.text.fill" size={24} color="#DDF8EC" />
              </View>
              <View className="rounded-full bg-[#F6D98A] px-3 py-1">
                <Text className="text-xs font-bold text-[#17382F]">
                  Full sim
                </Text>
              </View>
            </View>
            <Text className="mt-4 text-xl font-bold text-white">
              Full Simulation
            </Text>
            <Text className="mt-1 text-sm leading-5 text-[#C6F2E2]">
              All your subjects · timed · auto-scored
            </Text>
            <View className="mt-4 flex-row gap-6">
              <View>
                <Text className="text-lg font-bold text-white">
                  {subjects.length > 0 ? fullCount : "-"}
                </Text>
                <Text className="text-xs text-[#A8DCC9]">Questions</Text>
              </View>
              <View>
                <Text className="text-lg font-bold text-white">
                  {subjects.length > 0 ? durationLabel(fullCount) : "-"}
                </Text>
                <Text className="text-xs text-[#A8DCC9]">Duration</Text>
              </View>
              <View>
                <Text className="text-lg font-bold text-white">
                  {subjects.length || "-"}
                </Text>
                <Text className="text-xs text-[#A8DCC9]">Subjects</Text>
              </View>
            </View>
          </View>
        </Pressable>

        {subjects.length > 0 && (
          <>
            <Text className="mt-8 text-xl font-bold text-foreground">
              By subject
            </Text>
            <View className="mt-4 gap-3">
              {subjects.map((subject) => {
                const color = subjectColor(subject);
                return (
                  <View
                    key={subject}
                    className="rounded-2xl border border-border bg-surface p-4"
                  >
                    <View className="flex-row items-center">
                      <View
                        className="h-11 w-11 items-center justify-center rounded-xl"
                        style={{ backgroundColor: `${color}19` }}
                      >
                        <IconSymbol name="book.fill" size={20} color={color} />
                      </View>
                      <View className="ml-3 flex-1">
                        <Text className="font-bold text-foreground">
                          {subject}
                        </Text>
                        <Text className="mt-1 text-xs text-muted">
                          {PER_SUBJECT} questions · {durationLabel(PER_SUBJECT)}
                        </Text>
                      </View>
                    </View>
                    <View className="mt-3 flex-row gap-2">
                      <Pressable
                        onPress={() => startPractice(subject)}
                        style={({ pressed }) => [
                          { opacity: pressed ? 0.7 : 1, flex: 1 },
                        ]}
                      >
                        <View className="items-center rounded-xl border border-border py-2.5">
                          <Text className="text-xs font-bold text-muted">
                            Practice
                          </Text>
                        </View>
                      </Pressable>
                      <Pressable
                        onPress={() => startExam([subject])}
                        style={({ pressed }) => [
                          { opacity: pressed ? 0.7 : 1, flex: 1 },
                        ]}
                      >
                        <View
                          className="items-center rounded-xl py-2.5"
                          style={{ backgroundColor: `${color}19` }}
                        >
                          <Text className="text-xs font-bold" style={{ color }}>
                            Timed exam
                          </Text>
                        </View>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {subjects.length === 0 && (
          <View className="mt-6 items-center rounded-2xl border border-border bg-surface p-5">
            <IconSymbol name="doc.text.fill" size={28} color={colors.muted} />
            <Text className="mt-3 text-center font-semibold text-foreground">
              No subjects set
            </Text>
            <Text className="mt-1 text-center text-sm text-muted">
              Add your subjects first so Edicurve can build your exam.
            </Text>
            <Pressable
              onPress={() => router.push("/onboarding" as never)}
              style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
            >
              <View className="mt-4 rounded-2xl bg-primary px-5 py-2.5">
                <Text className="text-sm font-bold text-background">
                  Set up subjects
                </Text>
              </View>
            </Pressable>
          </View>
        )}

        <View className="mt-8 flex-row items-end justify-between">
          <View>
            <Text className="text-xl font-bold text-foreground">
              Weak topics
            </Text>
            <Text className="mt-1 text-sm text-muted">
              Based on your practice and exam history.
            </Text>
          </View>
          <Pressable
            onPress={() => router.push("/analytics" as never)}
            style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
          >
            <Text className="text-sm font-bold text-primary">See all</Text>
          </Pressable>
        </View>

        {shownWeak.length > 0 ? (
          <View className="mt-4 gap-3">
            {shownWeak.map((topic) => (
              <TopicCard
                key={`${topic.subject}-${topic.topic}`}
                topic={topic}
                onPractice={() => startPractice(topic.subject, topic.topic)}
              />
            ))}
          </View>
        ) : (
          <View className="mt-4 rounded-2xl border border-border bg-surface p-4">
            <Text className="text-sm leading-5 text-muted">
              {stats.hasData
                ? `No weak topics yet. A topic shows up here once you have answered at least ${MIN_ATTEMPTS} questions in it and score under 70%.`
                : "Finish a practice set or a mock exam and your weak topics will show up here."}
            </Text>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}