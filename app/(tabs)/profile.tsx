import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { ConnectedApps } from "@/components/connected-apps";
import { ScreenContainer } from "@/components/screen-container";
import { Toast } from "@/components/toast";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import { useStudyStats } from "@/hooks/use-study-stats";
import { useToast } from "@/hooks/use-toast";
import { getPushToken } from "@/lib/notifications";
import { useOnboarding } from "@/lib/onboarding-context";
import { DAILY_TARGETS, useLocalProfile } from "@/lib/profile-store";
import { computeExtras } from "@/lib/study-extras";
import {
  EXAM_HISTORY_KEY,
  PRACTICE_HISTORY_KEY,
  subjectColor,
} from "@/lib/study-stats";
import { trpc } from "@/lib/trpc";

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

function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <View className="mt-8">
      <Text className="text-xl font-bold text-foreground">{title}</Text>
      {hint ? <Text className="mt-1 text-sm text-muted">{hint}</Text> : null}
    </View>
  );
}

function StatTile({ value, label }: { value: string; label: string }) {
  return (
    <View className="flex-1 rounded-2xl border border-border bg-surface p-4">
      <Text className="text-2xl font-bold text-foreground">{value}</Text>
      <Text className="mt-1 text-xs text-muted">{label}</Text>
    </View>
  );
}

// Flip to true once Edicurve has its own sign-in.
const SIGN_IN_ENABLED = false;

export default function ProfileScreen() {
  const router = useRouter();
  const colors = useColors();
  const { toast, showToast } = useToast();
  const { user, isAuthenticated, logout } = useAuth();
  const { data: onboarding } = useOnboarding();
  const { stats, history, reload } = useStudyStats();
  const { profile, update } = useLocalProfile();
  const registerToken = trpc.notifications.registerToken.useMutation();

  const extras = useMemo(() => computeExtras(history, stats), [history, stats]);

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [openBadge, setOpenBadge] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  const displayName = profile.name || user?.name || "";
  const initials = getInitials(displayName);
  const version = Constants.expoConfig?.version ?? "1.0.0";

  const unlockedCount = extras.achievements.filter((a) => a.unlocked).length;
  const selectedBadge = extras.achievements.find((a) => a.id === openBadge);
  const maxBar = Math.max(1, ...extras.week.map((day) => day.count));
  const target = profile.dailyTarget;
  const todayPercent = Math.min(
    100,
    Math.round((extras.answeredToday / target) * 100),
  );
  const targetMet = extras.answeredToday >= target;
  const since = profile.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("en-GB", {
        month: "long",
        year: "numeric",
      })
    : "";

  const startEditing = () => {
    setNameDraft(profile.name);
    setEditingName(true);
  };

  const saveName = async () => {
    await update({ name: nameDraft });
    setEditingName(false);
    showToast(nameDraft.trim() ? "Name saved." : "Name cleared.");
  };

  const enableNotifications = async () => {
    const token = await getPushToken();
    if (!token) {
      showToast(
        "Notifications need a physical Android or iOS device.",
        "error",
      );
      return;
    }
    if (isAuthenticated) {
      await registerToken.mutateAsync({ token, platform: "expo" });
    }
    showToast("Study reminders are on for this device.");
  };

  const resetProgress = async () => {
    await AsyncStorage.multiRemove([PRACTICE_HISTORY_KEY, EXAM_HISTORY_KEY]);
    await reload();
    setConfirmReset(false);
    setOpenBadge(null);
    showToast("Your progress has been reset.");
  };

  return (
    <ScreenContainer className="px-5 pt-5" edges={["top", "left", "right"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-3xl font-bold text-foreground">Profile</Text>

        {/* Hero */}
        <View className="mt-6 rounded-3xl bg-[#17382F] p-5">
          <View className="flex-row items-center">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-primary">
              {initials ? (
                <Text className="text-2xl font-bold text-white">{initials}</Text>
              ) : (
                <IconSymbol
                  name="person.crop.circle.fill"
                  size={34}
                  color="#FFFFFF"
                />
              )}
            </View>
            <View className="ml-4 flex-1">
              {editingName ? (
                <View>
                  <TextInput
                    value={nameDraft}
                    onChangeText={setNameDraft}
                    placeholder="Your name"
                    placeholderTextColor="#8FB3A6"
                    autoFocus
                    maxLength={30}
                    onSubmitEditing={saveName}
                    returnKeyType="done"
                    className="rounded-xl bg-[#244B40] px-3 py-2 text-base font-semibold text-white"
                  />
                  <View className="mt-2 flex-row gap-5">
                    <Pressable onPress={saveName}>
                      <Text className="text-xs font-bold text-[#F6D98A]">
                        Save
                      </Text>
                    </Pressable>
                    <Pressable onPress={() => setEditingName(false)}>
                      <Text className="text-xs font-bold text-[#8FB3A6]">
                        Cancel
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable onPress={startEditing}>
                  <Text className="text-2xl font-bold text-white">
                    {displayName || "Add your name"}
                  </Text>
                  <Text className="mt-0.5 text-xs font-semibold text-[#F6D98A]">
                    {displayName ? "Tap to edit" : "So Edicurve can greet you"}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>

          <View className="mt-5 flex-row items-center justify-between">
            <Text className="text-sm font-bold text-white">
              Level {extras.level.index + 1} · {extras.level.title}
            </Text>
            <Text className="text-xs font-semibold text-[#BFE4D5]">
              {extras.xp} XP
            </Text>
          </View>
          <View className="mt-2 h-2 overflow-hidden rounded-full bg-[#2D8D72]">
            <View
              className="h-full rounded-full bg-[#F6D98A]"
              style={{ width: `${extras.level.percent}%` }}
            />
          </View>
          <Text className="mt-2 text-xs text-[#BFE4D5]">
            {extras.level.xpForNext
              ? `${extras.level.xpForNext - extras.level.xpIntoLevel} XP to the next level`
              : "You have reached the top level."}
          </Text>
          {since ? (
            <Text className="mt-3 text-xs text-[#8FB3A6]">
              Studying since {since}
            </Text>
          ) : null}
        </View>

        {SIGN_IN_ENABLED && !isAuthenticated && (
          <View className="mt-4 rounded-2xl border border-border bg-surface p-4">
            <Text className="text-sm text-muted">
              Sign in to sync your workspace across devices.
            </Text>
          </View>
        )}

        {/* Stats */}
        <View className="mt-5 flex-row gap-3">
          <StatTile value={String(stats.streak)} label="Day streak" />
          <StatTile
            value={stats.accuracy === null ? "-" : `${stats.accuracy}%`}
            label="Accuracy"
          />
          <StatTile value={String(stats.totalAnswered)} label="Answered" />
        </View>

        {/* This week */}
        <SectionTitle title="This week" hint="Questions answered each day." />
        <View className="mt-4 rounded-2xl border border-border bg-surface p-4">
          <View className="h-24 flex-row items-end justify-between">
            {extras.week.map((day, index) => {
              const height = day.count === 0 ? 6 : 10 + (day.count / maxBar) * 70;
              return (
                <View
                  key={`${day.label}-${index}`}
                  className="flex-1 items-center justify-end"
                >
                  {day.count > 0 && (
                    <Text className="mb-1 text-[10px] font-bold text-muted">
                      {day.count}
                    </Text>
                  )}
                  <View
                    style={{
                      width: 18,
                      height,
                      borderRadius: 6,
                      backgroundColor: day.isToday
                        ? colors.primary
                        : day.count > 0
                          ? `${colors.primary}66`
                          : colors.border,
                    }}
                  />
                </View>
              );
            })}
          </View>
          <View className="mt-2 flex-row justify-between">
            {extras.week.map((day, index) => (
              <Text
                key={`${day.label}-label-${index}`}
                className="flex-1 text-center text-[10px] font-semibold text-muted"
              >
                {day.label}
              </Text>
            ))}
          </View>

          <View className="mt-5 flex-row items-center justify-between">
            <Text className="text-sm font-bold text-foreground">Today</Text>
            <Text className="text-xs font-semibold text-muted">
              {extras.answeredToday} of {target} questions
            </Text>
          </View>
          <View className="mt-2 h-2 overflow-hidden rounded-full bg-[#E9E8E2]">
            <View
              className="h-full rounded-full"
              style={{
                width: `${todayPercent}%`,
                backgroundColor: targetMet ? "#27AE60" : colors.primary,
              }}
            />
          </View>
          {targetMet && (
            <Text className="mt-2 text-xs font-bold text-[#27AE60]">
              Daily target reached. Nice work.
            </Text>
          )}
        </View>

        {/* Achievements */}
        <SectionTitle
          title="Achievements"
          hint={`${unlockedCount} of ${extras.achievements.length} unlocked. Tap a badge for details.`}
        />
        <View className="mt-4 flex-row flex-wrap" style={{ gap: 12 }}>
          {extras.achievements.map((badge) => {
            const selected = openBadge === badge.id;
            return (
              <Pressable
                key={badge.id}
                onPress={() => setOpenBadge(selected ? null : badge.id)}
                style={{ width: "30.5%" }}
              >
                <View
                  className="items-center rounded-2xl border bg-surface px-2 py-4"
                  style={{
                    borderColor: selected ? colors.primary : colors.border,
                    opacity: badge.unlocked ? 1 : 0.5,
                  }}
                >
                  <View
                    className="h-11 w-11 items-center justify-center rounded-full"
                    style={{
                      backgroundColor: badge.unlocked
                        ? `${colors.primary}22`
                        : colors.border,
                    }}
                  >
                    <IconSymbol
                      name={badge.icon}
                      size={21}
                      color={badge.unlocked ? colors.primary : colors.muted}
                    />
                  </View>
                  <Text
                    className="mt-2 text-center text-[11px] font-bold text-foreground"
                    numberOfLines={2}
                  >
                    {badge.title}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
        {selectedBadge && (
          <View className="mt-3 rounded-2xl border border-border bg-surface p-4">
            <Text className="text-sm font-bold text-foreground">
              {selectedBadge.title}
              {selectedBadge.unlocked ? " · Unlocked" : " · Locked"}
            </Text>
            <Text className="mt-1 text-xs leading-5 text-muted">
              {selectedBadge.description}
            </Text>
          </View>
        )}

        {/* Learning setup */}
        <SectionTitle title="Your learning setup" />
        <View className="mt-4 rounded-2xl border border-border bg-surface p-4">
          <Text className="text-xs font-bold text-muted">CURRENT GOAL</Text>
          <Text className="mt-2 font-semibold text-foreground">
            {onboarding.goal || "Set a goal in onboarding"}
          </Text>

          {onboarding.subjects.length > 0 && (
            <View className="mt-3 flex-row flex-wrap gap-2">
              {onboarding.subjects.map((subject) => {
                const color = subjectColor(subject);
                return (
                  <View
                    key={subject}
                    className="rounded-full px-3 py-1.5"
                    style={{ backgroundColor: `${color}19` }}
                  >
                    <Text className="text-xs font-bold" style={{ color }}>
                      {subject}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          <Text className="mt-3 text-xs leading-5 text-muted">
            {onboarding.minutesPerDay} min on{" "}
            {onboarding.studyDays.join(", ") || "your chosen days"}
          </Text>
          <Pressable
            onPress={() => router.push("/onboarding" as never)}
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
          >
            <Text className="mt-4 text-sm font-bold text-primary">
              Update goals and schedule
            </Text>
          </Pressable>
        </View>

        {/* Study tools */}
        <SectionTitle title="Study tools" />
        <View className="mt-4 overflow-hidden rounded-2xl border border-border bg-surface">
          <Pressable
            onPress={() => router.push("/analytics" as never)}
            style={({ pressed }) => [{ opacity: pressed ? 0.72 : 1 }]}
          >
            <View className="flex-row items-center border-b border-border p-4">
              <IconSymbol name="chart.bar.fill" size={20} color={colors.muted} />
              <Text className="ml-3 flex-1 font-semibold text-foreground">
                Analytics
              </Text>
              <Text className="mr-1 text-xs text-muted">
                {stats.weakTopics.length > 0
                  ? `${stats.weakTopics.length} weak topic${stats.weakTopics.length === 1 ? "" : "s"}`
                  : "Progress & weak topics"}
              </Text>
              <IconSymbol name="chevron.right" size={18} color={colors.muted} />
            </View>
          </Pressable>
          <Pressable
            onPress={() => router.push("/library" as never)}
            style={({ pressed }) => [{ opacity: pressed ? 0.72 : 1 }]}
          >
            <View className="flex-row items-center border-b border-border p-4">
              <IconSymbol name="folder.fill" size={20} color={colors.muted} />
              <Text className="ml-3 flex-1 font-semibold text-foreground">
                Library
              </Text>
              <Text className="mr-1 text-xs text-muted">Notes & PDFs</Text>
              <IconSymbol name="chevron.right" size={18} color={colors.muted} />
            </View>
          </Pressable>
          <Pressable
            onPress={() => router.push("/planner" as never)}
            style={({ pressed }) => [{ opacity: pressed ? 0.72 : 1 }]}
          >
            <View className="flex-row items-center p-4">
              <IconSymbol name="calendar" size={20} color={colors.muted} />
              <Text className="ml-3 flex-1 font-semibold text-foreground">
                Planner
              </Text>
              <Text className="mr-1 text-xs text-muted">Tasks & reminders</Text>
              <IconSymbol name="chevron.right" size={18} color={colors.muted} />
            </View>
          </Pressable>
        </View>

        {isAuthenticated && <ConnectedApps />}

        {/* Settings */}
        <SectionTitle title="Settings" />
        <View className="mt-4 rounded-2xl border border-border bg-surface p-4">
          <Text className="text-sm font-bold text-foreground">
            Daily question target
          </Text>
          <Text className="mt-1 text-xs text-muted">
            How many questions you want to answer each day.
          </Text>
          <View className="mt-3 flex-row gap-2">
            {DAILY_TARGETS.map((value) => {
              const selected = target === value;
              return (
                <Pressable
                  key={value}
                  onPress={() => {
                    update({ dailyTarget: value });
                    showToast(`Daily target set to ${value} questions.`);
                  }}
                  style={{ flex: 1 }}
                >
                  <View
                    className="items-center rounded-xl border py-2.5"
                    style={{
                      backgroundColor: selected ? colors.primary : colors.background,
                      borderColor: selected ? colors.primary : colors.border,
                    }}
                  >
                    <Text
                      className="text-sm font-bold"
                      style={{
                        color: selected ? colors.background : colors.foreground,
                      }}
                    >
                      {value}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View className="mt-3 overflow-hidden rounded-2xl border border-border bg-surface">
          <Pressable
            onPress={enableNotifications}
            style={({ pressed }) => [{ opacity: pressed ? 0.72 : 1 }]}
          >
            <View className="flex-row items-center border-b border-border p-4">
              <IconSymbol name="bell.fill" size={20} color={colors.muted} />
              <Text className="ml-3 flex-1 font-semibold text-foreground">
                Study reminders
              </Text>
              <Text className="text-xs font-bold text-primary">Enable</Text>
            </View>
          </Pressable>
          <Pressable
            onPress={() => showToast("Edicurve follows your device theme.")}
            style={({ pressed }) => [{ opacity: pressed ? 0.72 : 1 }]}
          >
            <View className="flex-row items-center border-b border-border p-4">
              <IconSymbol name="sparkles" size={20} color={colors.muted} />
              <Text className="ml-3 flex-1 font-semibold text-foreground">
                Appearance
              </Text>
              <Text className="text-xs text-muted">System</Text>
            </View>
          </Pressable>
          <Pressable
            onPress={() => setShowAbout((value) => !value)}
            style={({ pressed }) => [{ opacity: pressed ? 0.72 : 1 }]}
          >
            <View className="flex-row items-center p-4">
              <IconSymbol name="info.circle.fill" size={20} color={colors.muted} />
              <Text className="ml-3 flex-1 font-semibold text-foreground">
                About Edicurve
              </Text>
              <Text className="text-xs text-muted">v{version}</Text>
            </View>
          </Pressable>
          {showAbout && (
            <View className="border-t border-border px-4 pb-4 pt-3">
              <Text className="text-sm font-bold text-foreground">
                Learn, Practice, Progress.
              </Text>
              <Text className="mt-1 text-xs leading-5 text-muted">
                Edicurve helps you revise with past-style questions, timed mock
                exams and an AI study companion called EDI. Your progress is
                saved on this device.
              </Text>
            </View>
          )}
        </View>

        {/* Danger zone */}
        <View className="mt-3 rounded-2xl border border-border bg-surface p-4">
          {confirmReset ? (
            <View>
              <Text className="text-sm font-bold text-foreground">
                Reset all progress?
              </Text>
              <Text className="mt-1 text-xs leading-5 text-muted">
                This clears your practice and exam history, streak, level and
                badges. Notes, PDFs and planner tasks are kept.
              </Text>
              <View className="mt-3 flex-row gap-5">
                <Pressable onPress={resetProgress}>
                  <Text className="text-sm font-bold text-error">
                    Yes, reset
                  </Text>
                </Pressable>
                <Pressable onPress={() => setConfirmReset(false)}>
                  <Text className="text-sm font-bold text-muted">Cancel</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable onPress={() => setConfirmReset(true)}>
              <Text className="text-sm font-semibold text-error">
                Reset my progress
              </Text>
            </Pressable>
          )}
        </View>

        {isAuthenticated && (
          <Pressable
            onPress={logout}
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
          >
            <Text className="mt-7 text-center text-sm font-bold text-error">
              Sign out
            </Text>
          </Pressable>
        )}
      </ScrollView>
      <Toast toast={toast} />
    </ScreenContainer>
  );
}