import { Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useOnboarding } from "@/lib/onboarding-context";

const SUBJECT_META: Record<
  string,
  {
    color: string;
    icon:
      | "function"
      | "edit-note"
      | "science"
      | "biotech"
      | "eco"
      | "trending-up"
      | "account-balance"
      | "menu-book"
      | "public"
      | "history-edu"
      | "calculate"
      | "computer"
      | "receipt-long"
      | "translate"
      | "book.fill";
  }
> = {
  Mathematics: { color: "#7668D9", icon: "function" },
  English: { color: "#D89034", icon: "edit-note" },
  Physics: { color: "#0F6B54", icon: "science" },
  Chemistry: { color: "#C0392B", icon: "biotech" },
  Biology: { color: "#27AE60", icon: "eco" },
  Economics: { color: "#2980B9", icon: "trending-up" },
  Government: { color: "#8E44AD", icon: "account-balance" },
  Literature: { color: "#E67E22", icon: "menu-book" },
  Geography: { color: "#16A085", icon: "public" },
  History: { color: "#795548", icon: "history-edu" },
  "Further Maths": { color: "#5C6BC0", icon: "calculate" },
  "Computer Science": { color: "#0288D1", icon: "computer" },
  Accounting: { color: "#00897B", icon: "receipt-long" },
  French: { color: "#E91E63", icon: "translate" },
};

const DEFAULT_META = { color: "#0F6B54", icon: "book.fill" as const };

export default function CoursesScreen() {
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
          Pick up where you left off, or ask Edi to suggest what to tackle next.
        </Text>

        {subjects.length === 0 ? (
          /* Empty state */
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
              const meta = SUBJECT_META[subject] ?? DEFAULT_META;
              return (
                <Pressable
                  key={subject}
                  onPress={() =>
                    router.push({
                      pathname: "/quiz",
                      params: {
                        course: subject,
                        progress: "0",
                        focus: subject,
                      },
                    } as never)
                  }
                  style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
                >
                  <View className="rounded-3xl border border-border bg-surface p-5">
                    <View className="flex-row items-start">
                      <View
                        className="h-12 w-12 items-center justify-center rounded-2xl"
                        style={{ backgroundColor: `${meta.color}19` }}
                      >
                        <IconSymbol
                          name={meta.icon}
                          size={23}
                          color={meta.color}
                        />
                      </View>
                      <View className="ml-3 flex-1">
                        <Text className="text-lg font-bold text-foreground">
                          {subject}
                        </Text>
                        <Text className="mt-1 text-xs text-muted">
                          Tap to practice · AI quiz available
                        </Text>
                      </View>
                      <IconSymbol
                        name="chevron.right"
                        size={20}
                        color={colors.muted}
                      />
                    </View>

                    {/* Actions row */}
                    <View className="mt-4 flex-row gap-2">
                      <Pressable
                        onPress={() =>
                          router.push({
                            pathname: "/quiz",
                            params: {
                              course: subject,
                              progress: "0",
                              focus: subject,
                            },
                          } as never)
                        }
                        style={({ pressed }) => [
                          { opacity: pressed ? 0.7 : 1, flex: 1 },
                        ]}
                      >
                        <View
                          className="flex-row items-center justify-center rounded-xl py-2.5"
                          style={{ backgroundColor: `${meta.color}19` }}
                        >
                          <IconSymbol
                            name="sparkles"
                            size={15}
                            color={meta.color}
                          />
                          <Text
                            className="ml-1.5 text-xs font-bold"
                            style={{ color: meta.color }}
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
                            Ask Edi
                          </Text>
                        </View>
                      </Pressable>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Edi CTA */}
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
            Tell Edi your deadline and available time. It can turn that into a
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
