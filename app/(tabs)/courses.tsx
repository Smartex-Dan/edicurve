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

const DEFAULT_COLOR = "#0F6B54";

export default function CoursesScreen() {
  const colors = useColors();
  const router = useRouter();
  const { data: onboarding } = useOnboarding();
  const subjects = onboarding.subjects ?? [];

  const openQuiz = (subject: string) =>
    router.push({
      pathname: "/quiz",
      params: { course: subject, progress: "0", focus: subject },
    } as never);

  return (
    <ScreenContainer className="px-5 pt-5" edges={["top", "left", "right"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <View className="flex-row items-end justify-between">
          <View>
            <Text className="text-sm font-semibold text-primary">
              YOUR SUBJECTS
            </Text>
            <Text className="mt-1 text-3xl font-bold text-foreground">
              Courses
            </Text>
          </View>
          <Pressable
            onPress={() => router.push("/tutor")}
            style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
          >
            <IconSymbol name="sparkles" size={23} color={colors.primary} />
          </Pressable>
        </View>
        <Text className="mt-2 max-w-[330px] text-sm leading-5 text-muted">
          Pick up where you left off, or ask EDI to suggest what to tackle next.
        </Text>

        {subjects.length === 0 ? (
          <View className="mt-14 items-center px-4">
            <View className="h-16 w-16 items-center justify-center rounded-3xl bg-[#E6F2EE]">
              <IconSymbol name="book.fill" size={32} color={colors.primary} />
            </View>
            <Text className="mt-5 text-center text-lg font-bold text-foreground">
              No subjects yet
            </Text>
            <Text className="mt-2 text-center text-sm leading-5 text-muted">
              Add your subjects in onboarding so Edicurve can personalise your
              courses and quizzes.
            </Text>
            <Pressable
              onPress={() => router.push("/onboarding" as never)}
              style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
            >
              <View className="mt-6 rounded-2xl bg-primary px-6 py-3">
                <Text className="text-sm font-bold text-background">
                  Set up my subjects
                </Text>
              </View>
            </Pressable>
          </View>
        ) : (
          <View className="mt-6 gap-4">
            {subjects.map((subject) => {
              const color = SUBJECT_COLORS[subject] ?? DEFAULT_COLOR;
              return (
                <View
                  key={subject}
                  className="rounded-3xl border border-border bg-surface p-5"
                >
                  <View className="flex-row items-start">
                    <View
                      className="h-12 w-12 items-center justify-center rounded-2xl"
                      style={{ backgroundColor: `${color}19` }}
                    >
                      <IconSymbol name="book.fill" size={23} color={color} />
                    </View>
                    <View className="ml-3 flex-1">
                      <Text className="text-lg font-bold text-foreground">
                        {subject}
                      </Text>
                      <Text className="mt-1 text-xs text-muted">
                        AI quiz and EDI help available
                      </Text>
                    </View>
                  </View>

                  <View className="mt-4 flex-row gap-2">
                    <Pressable
                      onPress={() => openQuiz(subject)}
                      style={({ pressed }) => [
                        { opacity: pressed ? 0.7 : 1, flex: 1 },
                      ]}
                    >
                      <View
                        className="flex-row items-center justify-center rounded-xl py-2.5"
                        style={{ backgroundColor: `${color}19` }}
                      >
                        <IconSymbol name="sparkles" size={15} color={color} />
                        <Text
                          className="ml-1.5 text-xs font-bold"
                          style={{ color }}
                        >
                          AI Quiz
                        </Text>
                      </View>
                    </Pressable>
                    <Pressable
                      onPress={() => router.push("/tutor" as never)}
                      style={({ pressed }) => [
                        { opacity: pressed ? 0.7 : 1, flex: 1 },
                      ]}
                    >
                      <View className="flex-row items-center justify-center rounded-xl border border-border py-2.5">
                        <IconSymbol
                          name="bubble.left.and.bubble.right.fill"
                          size={15}
                          color={colors.muted}
                        />
                        <Text className="ml-1.5 text-xs font-bold text-muted">
                          Ask EDI
                        </Text>
                      </View>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View className="mt-6 rounded-3xl bg-[#17382F] p-5">
          <View className="flex-row items-center">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-[#2B6B59]">
              <IconSymbol name="sparkles" size={20} color="#DDF8EC" />
            </View>
            <Text className="ml-3 text-lg font-bold text-white">
              Build a smarter routine
            </Text>
          </View>
          <Text className="mt-3 text-sm leading-5 text-[#C7E4D8]">
            Tell EDI your deadline and available time. It can turn that into a
            simple, day-by-day study plan.
          </Text>
          <Pressable
            onPress={() => router.push("/tutor")}
            style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
          >
            <View className="mt-4 self-start rounded-full bg-[#F6D98A] px-4 py-2.5">
              <Text className="text-xs font-bold text-[#17382F]">
                Ask for a plan
              </Text>
            </View>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}