import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import { useStudyStats } from "@/hooks/use-study-stats";
import { useOnboarding } from "@/lib/onboarding-context";
import { useLocalProfile } from "@/lib/profile-store";

const SHORT_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 21) return "Good evening";
  return "Good night";
}

function getInitials(name?: string | null): string {
  if (!name) return "";
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");
}

function getDateLabel(): string {
  return new Date()
    .toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    })
    .toUpperCase();
}

function nextStudyDay(studyDays: string[]): string | null {
  if (studyDays.length === 0) return null;
  const today = new Date().getDay();
  for (let i = 0; i < 7; i++) {
    const name = SHORT_DAYS[(today + i) % 7];
    if (studyDays.includes(name)) {
      return i === 0 ? "Today" : i === 1 ? "Tomorrow" : name;
    }
  }
  return null;
}

const quickActions = [
  { label: "Ask EDI", caption: "Get unstuck fast", icon: "sparkles" as const, route: "/tutor" },
  { label: "Analytics", caption: "See your weak topics", icon: "chart.bar.fill" as const, route: "/analytics" },
  { label: "Add task", caption: "Plan your week", icon: "plus" as const, route: "/planner" },
  { label: "Open library", caption: "Notes & files", icon: "folder.fill" as const, route: "/library" },
];

export default function HomeScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user } = useAuth();
  const { data: onboarding } = useOnboarding();
  const { stats } = useStudyStats();
  const profile = useLocalProfile();

  const greeting = getGreeting();
  const displayName = profile.profile.name || user?.name || "";
  const firstName = displayName.split(" ")[0];
  const initials = getInitials(displayName);
  const nextDay = nextStudyDay(onboarding.studyDays ?? []);

  const streakText = `${stats.streak} ${stats.streak === 1 ? "day" : "days"}`;
  const streakMessage =
    stats.streak > 0
      ? "Small steps every day add up. Keep your momentum going."
      : "Answer a few questions today to start your streak.";

  return (
    <ScreenContainer className="px-5 pt-5" edges={["top", "left", "right"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-sm font-semibold text-primary">{getDateLabel()}</Text>
            <Text className="mt-1 text-3xl font-bold text-foreground">
              {firstName ? `${greeting}, ${firstName}` : greeting}
            </Text>
          </View>
          <Pressable onPress={() => router.push("/profile" as never)} style={({ pressed }) => [{ opacity: pressed ? 0.65 : 1 }]}>
            <View className="h-11 w-11 items-center justify-center rounded-full bg-primary">
              {initials ? (
                <Text className="text-lg font-bold text-background">{initials}</Text>
              ) : (
                <IconSymbol name="person.crop.circle.fill" size={24} color={colors.background} />
              )}
            </View>
          </Pressable>
        </View>

        <View className="mt-7 overflow-hidden rounded-3xl bg-primary p-5">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-sm font-semibold text-[#C6F2E2]">YOUR STUDY STREAK</Text>
              <Text className="mt-2 text-4xl font-bold text-white">{streakText}</Text>
              <Text className="mt-1 text-sm leading-5 text-[#DDF8EC]">{streakMessage}</Text>
            </View>
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-[#2D8D72]">
              <IconSymbol name="checkmark.circle.fill" size={28} color="#DDF8EC" />
            </View>
          </View>
          <View className="mt-5 flex-row items-center justify-between">
            <Text className="text-sm font-semibold text-[#DDF8EC]">Weekly goal</Text>
            <Text className="text-sm font-bold text-white">
              {stats.activeDaysThisWeek} of {stats.weeklyGoal} study days
            </Text>
          </View>
          <View className="mt-2 h-2 overflow-hidden rounded-full bg-[#2D8D72]">
            <View className="h-full rounded-full bg-[#F6D98A]" style={{ width: `${stats.weeklyPercent}%` }} />
          </View>
        </View>

        <View className="mt-7 flex-row gap-3">
          <View className="flex-1 rounded-2xl border border-border bg-surface p-4">
            <View className="h-9 w-9 items-center justify-center rounded-xl bg-[#E6F2EE]">
              <IconSymbol name="book.fill" size={19} color={colors.primary} />
            </View>
            <Text className="mt-4 text-2xl font-bold text-foreground">{onboarding.subjects?.length ?? 0}</Text>
            <Text className="mt-1 text-sm text-muted">Subjects</Text>
          </View>
          <View className="flex-1 rounded-2xl border border-border bg-surface p-4">
            <View className="h-9 w-9 items-center justify-center rounded-xl bg-[#F8EBC7]">
              <IconSymbol name="checkmark.circle.fill" size={19} color="#B27B12" />
            </View>
            <Text className="mt-4 text-2xl font-bold text-foreground">{stats.answeredThisWeek}</Text>
            <Text className="mt-1 text-sm text-muted">Answered this week</Text>
          </View>
          <View className="flex-1 rounded-2xl border border-border bg-surface p-4">
            <View className="h-9 w-9 items-center justify-center rounded-xl bg-[#F0EEFF]">
              <IconSymbol name="doc.text.fill" size={19} color="#7668D9" />
            </View>
            <Text className="mt-4 text-2xl font-bold text-foreground">{stats.examsTaken}</Text>
            <Text className="mt-1 text-sm text-muted">Exams taken</Text>
          </View>
        </View>

        <View className="mt-7 flex-row items-end justify-between">
          <View>
            <Text className="text-xl font-bold text-foreground">Coming up</Text>
            <Text className="mt-1 text-sm text-muted">Your next study session.</Text>
          </View>
          <Pressable onPress={() => router.push("/planner" as never)} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
            <Text className="text-sm font-bold text-primary">See planner</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={() => router.push((nextDay ? "/planner" : "/onboarding") as never)}
          style={({ pressed }) => [{ opacity: pressed ? 0.72 : 1 }]}
        >
          <View className="mt-4 flex-row items-center rounded-2xl border border-border bg-surface p-4">
            <View className="h-11 w-11 items-center justify-center rounded-xl bg-[#F2B84B22]">
              <IconSymbol name="clock.fill" size={20} color="#F2B84B" />
            </View>
            <View className="ml-3 flex-1">
              <Text className="font-bold text-foreground">
                {nextDay ? "Study session" : "Set your study days"}
              </Text>
              <Text className="mt-1 text-xs text-muted">
                {nextDay
                  ? `${nextDay} · 6:00 PM · ${onboarding.minutesPerDay} min`
                  : "Pick the days you want to study"}
              </Text>
            </View>
            <IconSymbol name="chevron.right" size={20} color={colors.muted} />
          </View>
        </Pressable>

        <Text className="mt-7 text-xl font-bold text-foreground">Jump back in</Text>
        <View className="mt-4 gap-3">
          {quickActions.map((action) => (
            <Pressable key={action.label} onPress={() => router.push(action.route as never)} style={({ pressed }) => [{ opacity: pressed ? 0.72 : 1 }]}>
              <View className="flex-row items-center rounded-2xl border border-border bg-surface p-4">
                <View className="h-11 w-11 items-center justify-center rounded-xl bg-[#E6F2EE]">
                  <IconSymbol name={action.icon} size={21} color={colors.primary} />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="font-bold text-foreground">{action.label}</Text>
                  <Text className="mt-1 text-xs text-muted">{action.caption}</Text>
                </View>
                <IconSymbol name="arrow.up.right" size={19} color={colors.muted} />
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}