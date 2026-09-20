import { Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useOnboarding } from "@/lib/onboarding-context";

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

const WEAK_TOPICS_PLACEHOLDER = [
  { subject: "Physics", topic: "Mechanics", score: 42 },
  { subject: "Chemistry", topic: "Moles & Titration", score: 38 },
  { subject: "Mathematics", topic: "Logarithms", score: 55 },
];

export default function ExamScreen() {
  const colors = useColors();
  const router = useRouter();
  const { data: onboarding } = useOnboarding();
  const subjects = onboarding.subjects ?? [];

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

        {/* Start exam options */}
        <Text className="mt-8 text-xl font-bold text-foreground">
          Start an exam
        </Text>
        <Text className="mt-1 text-sm text-muted">
          Question bank coming once your CSVs are seeded.
        </Text>

        {/* Full simulation card */}
        <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}>
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
            <View className="mt-4 flex-row gap-4">
              {[
                {
                  label: "Questions",
                  value: subjects.length > 0 ? `${subjects.length * 20}` : "—",
                },
                { label: "Duration", value: "3 hrs" },
                { label: "Subjects", value: `${subjects.length || "—"}` },
              ].map((stat) => (
                <View key={stat.label}>
                  <Text className="text-lg font-bold text-white">
                    {stat.value}
                  </Text>
                  <Text className="text-xs text-[#A8DCC9]">{stat.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </Pressable>

        {/* Per-subject practice */}
        {subjects.length > 0 && (
          <>
            <Text className="mt-8 text-xl font-bold text-foreground">
              Practice by subject
            </Text>
            <View className="mt-4 gap-3">
              {subjects.map((subject) => {
                const color = SUBJECT_COLORS[subject] ?? "#0F6B54";
                return (
                  <Pressable
                    key={subject}
                    style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
                  >
                    <View className="flex-row items-center rounded-2xl border border-border bg-surface p-4">
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
                          20 questions · 30 min
                        </Text>
                      </View>
                      <View
                        className="rounded-full px-3 py-1.5"
                        style={{ backgroundColor: `${color}19` }}
                      >
                        <Text className="text-xs font-bold" style={{ color }}>
                          Start
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {subjects.length === 0 && (
          <View className="mt-6 rounded-2xl border border-border bg-surface p-5 items-center">
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

        {/* Weak topics */}
        <View className="mt-8 flex-row items-end justify-between">
          <View>
            <Text className="text-xl font-bold text-foreground">
              Weak topics
            </Text>
            <Text className="mt-1 text-sm text-muted">
              Based on your exam history.
            </Text>
          </View>
          <Text className="text-xs font-bold text-primary">See all</Text>
        </View>

        <View className="mt-4 gap-3">
          {WEAK_TOPICS_PLACEHOLDER.map((item) => {
            const color = SUBJECT_COLORS[item.subject] ?? "#0F6B54";
            const barColor =
              item.score < 50
                ? "#E74C3C"
                : item.score < 65
                  ? "#F2B84B"
                  : "#27AE60";
            return (
              <View
                key={`${item.subject}-${item.topic}`}
                className="rounded-2xl border border-border bg-surface p-4"
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="font-bold text-foreground">
                      {item.topic}
                    </Text>
                    <Text
                      className="mt-0.5 text-xs font-semibold"
                      style={{ color }}
                    >
                      {item.subject}
                    </Text>
                  </View>
                  <Text
                    className="text-lg font-bold"
                    style={{ color: barColor }}
                  >
                    {item.score}%
                  </Text>
                </View>
                <View className="mt-3 h-2 overflow-hidden rounded-full bg-[#E9E8E2]">
                  <View
                    className="h-full rounded-full"
                    style={{
                      width: `${item.score}%`,
                      backgroundColor: barColor,
                    }}
                  />
                </View>
                <Pressable
                  onPress={() => router.push("/tutor" as never)}
                  style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                >
                  <Text className="mt-3 text-xs font-bold text-primary">
                    Practice this topic with Edi →
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>

        {/* Placeholder note */}
        <View className="mt-6 rounded-2xl bg-[#FFF8E7] border border-[#F2B84B33] p-4">
          <Text className="text-xs font-bold text-[#B27B12]">COMING NEXT</Text>
          <Text className="mt-1 text-sm leading-5 text-[#7A5A0A]">
            Weak topic data will auto-populate once you complete mock exams. The
            scores above are placeholders.
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
