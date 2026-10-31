import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { TopicCard } from "@/components/topic-card";
import { useStudyStats } from "@/hooks/use-study-stats";
import {
  MIN_ATTEMPTS,
  WEAK_BELOW_PERCENT,
  scoreColor,
  subjectColor,
} from "@/lib/study-stats";

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 rounded-2xl border border-border bg-surface p-4">
      <Text className="text-2xl font-bold text-foreground">{value}</Text>
      <Text className="mt-1 text-xs text-muted">{label}</Text>
    </View>
  );
}

export default function AnalyticsScreen() {
  const router = useRouter();
  const { stats, loaded } = useStudyStats();

  const practice = (subject: string, topic?: string) =>
    router.push({
      pathname: "/practice",
      params: topic ? { subject, topic } : { subject },
    } as never);

  return (
    <ScreenContainer className="px-5 pt-5">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
        >
          <Text className="text-sm font-bold text-primary">Back</Text>
        </Pressable>

        <Text className="mt-6 text-sm font-semibold text-primary">
          YOUR PROGRESS
        </Text>
        <Text className="mt-1 text-3xl font-bold text-foreground">
          Analytics
        </Text>

        {loaded && !stats.hasData && (
          <View className="mt-10 items-center rounded-3xl border border-border bg-surface p-6">
            <Text className="text-center text-lg font-bold text-foreground">
              Nothing to analyse yet
            </Text>
            <Text className="mt-2 text-center text-sm leading-5 text-muted">
              Finish a practice set or a mock exam and your results will show
              up here.
            </Text>
            <Pressable
              onPress={() => router.push("/exam" as never)}
              style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
            >
              <View className="mt-5 rounded-2xl bg-primary px-6 py-3">
                <Text className="text-sm font-bold text-background">
                  Go to Mock Exam
                </Text>
              </View>
            </Pressable>
          </View>
        )}

        {stats.hasData && (
          <>
            <View className="mt-6 flex-row gap-3">
              <SummaryCard
                label="Accuracy"
                value={stats.accuracy === null ? "-" : `${stats.accuracy}%`}
              />
              <SummaryCard
                label="Questions answered"
                value={String(stats.totalAnswered)}
              />
            </View>
            <View className="mt-3 flex-row gap-3">
              <SummaryCard label="Exams taken" value={String(stats.examsTaken)} />
              <SummaryCard
                label="Day streak"
                value={String(stats.streak)}
              />
            </View>

            <Text className="mt-8 text-xl font-bold text-foreground">
              By subject
            </Text>
            <View className="mt-4 gap-3">
              {stats.subjects.map((subject) => {
                const color = subjectColor(subject.subject);
                return (
                  <View
                    key={subject.subject}
                    className="rounded-2xl border border-border bg-surface p-4"
                  >
                    <View className="flex-row items-center justify-between">
                      <Text className="font-bold text-foreground">
                        {subject.subject}
                      </Text>
                      <Text className="font-bold" style={{ color }}>
                        {subject.correct}/{subject.attempts} · {subject.percent}%
                      </Text>
                    </View>
                    <View className="mt-3 h-2 overflow-hidden rounded-full bg-[#E9E8E2]">
                      <View
                        className="h-full rounded-full"
                        style={{
                          width: `${subject.percent}%`,
                          backgroundColor: color,
                        }}
                      />
                    </View>
                  </View>
                );
              })}
            </View>

            <Text className="mt-8 text-xl font-bold text-foreground">
              Weak topics
            </Text>
            {stats.weakTopics.length > 0 ? (
              <View className="mt-4 gap-3">
                {stats.weakTopics.map((topic) => (
                  <TopicCard
                    key={`${topic.subject}-${topic.topic}`}
                    topic={topic}
                    onPractice={() => practice(topic.subject, topic.topic)}
                  />
                ))}
              </View>
            ) : (
              <Text className="mt-2 text-sm leading-5 text-muted">
                Nothing flagged yet. A topic is flagged once you have answered
                at least {MIN_ATTEMPTS} questions in it and score under{" "}
                {WEAK_BELOW_PERCENT}%.
              </Text>
            )}

            <Text className="mt-8 text-xl font-bold text-foreground">
              All topics
            </Text>
            <View className="mt-4 overflow-hidden rounded-2xl border border-border bg-surface">
              {stats.topics.map((topic, index) => (
                <Pressable
                  key={`${topic.subject}-${topic.topic}`}
                  onPress={() => practice(topic.subject, topic.topic)}
                  style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
                >
                  <View
                    className={`flex-row items-center p-4 ${
                      index < stats.topics.length - 1
                        ? "border-b border-border"
                        : ""
                    }`}
                  >
                    <View className="flex-1">
                      <Text className="font-semibold text-foreground">
                        {topic.topic}
                      </Text>
                      <Text className="mt-0.5 text-xs text-muted">
                        {topic.subject} · {topic.attempts} answered
                        {topic.attempts < MIN_ATTEMPTS ? " (too few to judge)" : ""}
                      </Text>
                    </View>
                    <Text
                      className="font-bold"
                      style={{
                        color:
                          topic.attempts < MIN_ATTEMPTS
                            ? "#9A9A9A"
                            : scoreColor(topic.percent),
                      }}
                    >
                      {topic.percent}%
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}