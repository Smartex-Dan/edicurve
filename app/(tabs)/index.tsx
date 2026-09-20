import { useRouter } from "expo-router";
import { useMemo } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 21) return "Good evening";
  return "Good night";
}

function getInitials(name?: string | null): string {
  if (!name) return "S";
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");
}

function getDateLabel(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).toUpperCase();
}

const quickActions = [
  { label: "Ask Edi", caption: "Get unstuck fast", icon: "sparkles" as const, route: "/tutor" },
  { label: "Add task", caption: "Plan your week", icon: "plus" as const, route: "/planner" },
  { label: "Open library", caption: "Notes & files", icon: "folder.fill" as const, route: "/library" },
];

export default function HomeScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user } = useAuth();
  const progress = useMemo(() => 68, []);
  const greeting = getGreeting();
  const initials = getInitials(user?.name);
  const firstName = user?.name?.split(" ")[0] ?? "there";

  return (
    <ScreenContainer className="px-5 pt-5" edges={["top", "left", "right"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Header */}
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-sm font-semibold text-primary">{getDateLabel()}</Text>
            <Text className="mt-1 text-3xl font-bold text-foreground">{greeting}, {firstName}</Text>
          </View>
          <Pressable onPress={() => router.push("/profile" as never)} style={({ pressed }) => [{ opacity: pressed ? 0.65 : 1 }]}>
            <View className="h-11 w-11 items-center justify-center rounded-full bg-primary">
              <Text className="text-lg font-bold text-background">{initials}</Text>
            </View>
          </Pressable>
        </View>

        {/* Streak card */}
        <View className="mt-7 overflow-hidden rounded-3xl bg-primary p-5">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-sm font-semibold text-[#C6F2E2]">YOUR STUDY STREAK</Text>
              <Text className="mt-2 text-4xl font-bold text-white">12 days</Text>
              <Text className="mt-1 text-sm leading-5 text-[#DDF8EC]">Small steps every day add up. Keep your momentum going.</Text>
            </View>
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-[#2D8D72]">
              <IconSymbol name="checkmark.circle.fill" size={28} color="#DDF8EC" />
            </View>
          </View>
          <View className="mt-5 flex-row items-center justify-between">
            <Text className="text-sm font-semibold text-[#DDF8EC]">Weekly goal</Text>
            <Text className="text-sm font-bold text-white">4 of 6 sessions</Text>
          </View>
          <View className="mt-2 h-2 overflow-hidden rounded-full bg-[#2D8D72]">
            <View className="h-full rounded-full bg-[#F6D98A]" style={{ width: `${progress}%` }} />
          </View>
        </View>

        {/* Stats row */}
        <View className="mt-7 flex-row gap-3">
          <View className="flex-1 rounded-2xl border border-border bg-surface p-4">
            <View className="h-9 w-9 items-center justify-center rounded-xl bg-[#E6F2EE]">
              <IconSymbol name="book.fill" size={19} color={colors.primary} />
            </View>
            <Text className="mt-4 text-2xl font-bold text-foreground">3</Text>
            <Text className="mt-1 text-sm text-muted">Active subjects</Text>
          </View>
          <View className="flex-1 rounded-2xl border border-border bg-surface p-4">
            <View className="h-9 w-9 items-center justify-center rounded-xl bg-[#F8EBC7]">
              <IconSymbol name="checkmark.circle.fill" size={19} color="#B27B12" />
            </View>
            <Text className="mt-4 text-2xl font-bold text-foreground">8</Text>
            <Text className="mt-1 text-sm text-muted">Tasks this week</Text>
          </View>
          <View className="flex-1 rounded-2xl border border-border bg-surface p-4">
            <View className="h-9 w-9 items-center justify-center rounded-xl bg-[#F0EEFF]">
              <IconSymbol name="doc.text.fill" size={19} color="#7668D9" />
            </View>
            <Text className="mt-4 text-2xl font-bold text-foreground">2</Text>
            <Text className="mt-1 text-sm text-muted">Exams taken</Text>
          </View>
        </View>

        {/* Coming up */}
        <View className="mt-7 flex-row items-end justify-between">
          <View>
            <Text className="text-xl font-bold text-foreground">Coming up</Text>
            <Text className="mt-1 text-sm text-muted">Your next deadlines at a glance.</Text>
          </View>
          <Pressable onPress={() => router.push("/planner" as never)} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
            <Text className="text-sm font-bold text-primary">See planner</Text>
          </Pressable>
        </View>

        <Pressable onPress={() => router.push("/planner" as never)} style={({ pressed }) => [{ opacity: pressed ? 0.72 : 1 }]}>
          <View className="mt-4 flex-row items-center rounded-2xl border border-border bg-surface p-4">
            <View className="h-11 w-11 items-center justify-center rounded-xl bg-[#F2B84B22]">
              <IconSymbol name="clock.fill" size={20} color="#F2B84B" />
            </View>
            <View className="ml-3 flex-1">
              <Text className="font-bold text-foreground">Study session</Text>
              <Text className="mt-1 text-xs text-muted">Your subjects · Today · 6:00 PM</Text>
            </View>
            <IconSymbol name="chevron.right" size={20} color={colors.muted} />
          </View>
        </Pressable>

        {/* Jump back in */}
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
