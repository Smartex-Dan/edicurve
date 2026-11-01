import { useState } from "react";
import { Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useOnboarding } from "@/lib/onboarding-context";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { rescheduleStudyReminders } from "@/lib/notifications";

const goals = [
  "Ace my upcoming exams",
  "Build a consistent study habit",
  "Stay on top of coursework",
  "Learn something new at my own pace",
  "Improve my weak subjects",
  "Prepare for university admissions",
];

const subjectOptions = [
  "Mathematics",
  "English",
  "Physics",
  "Chemistry",
  "Biology",
  "Economics",
  "Literature",
  "Geography",
  "Government",
  "History",
  "Further Maths",
  "Computer Science",
  "Accounting",
  "French",
];

const dayOptions = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function OnboardingScreen() {
  const router = useRouter();
  const colors = useColors();
  const { data, save } = useOnboarding();
  const { isAuthenticated } = useAuth();
  const scheduleUpsert = trpc.schedules.upsert.useMutation();

  const [step, setStep] = useState(0);
  const [goals_selected, setGoalsSelected] = useState<string[]>(
    data.goal ? [data.goal] : []
  );
  const [subjects, setSubjects] = useState<string[]>(
    data.subjects.length ? data.subjects : []
  );
  const [customSubject, setCustomSubject] = useState("");
  const [minutes, setMinutes] = useState(data.minutesPerDay || 30);
  const [days, setDays] = useState<string[]>(
    data.studyDays.length ? data.studyDays : ["Mon", "Wed", "Fri"]
  );

  const toggle = (
    value: string,
    list: string[],
    setter: (next: string[]) => void
  ) =>
    setter(
      list.includes(value)
        ? list.filter((item) => item !== value)
        : [...list, value]
    );

  const addCustomSubject = () => {
    const value = customSubject.trim();
    if (value && !subjects.includes(value)) {
      setSubjects([...subjects, value]);
    }
    setCustomSubject("");
  };

  const canProceed = () => {
    if (step === 0) return goals_selected.length > 0;
    if (step === 1) return subjects.length > 0;
    if (step === 2) return days.length > 0;
    return true;
  };

  const finish = async () => {
    const combinedGoal = goals_selected.join(", ");
    await save({
      goal: combinedGoal,
      subjects,
      minutesPerDay: minutes,
      studyDays: days,
    });
    await rescheduleStudyReminders({
      studyDays: days,
      reminderEnabled: true,
      reminderHour: 18,
      reminderMinute: 0,
      minutesPerDay: minutes,
    });
    if (isAuthenticated) {
      await scheduleUpsert.mutateAsync({
        goal: combinedGoal,
        subjects,
        minutesPerDay: minutes,
        studyDays: days,
        reminderEnabled: true,
        reminderHour: 18,
        reminderMinute: 0,
      });
    }
    router.replace("/");
  };

  return (
    <ScreenContainer
      className="px-5 pt-8"
      edges={["top", "left", "right", "bottom"]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 28 }}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Image
              source={require("../assets/images/logo.png")}
              style={{ width: 44, height: 36 }}
              resizeMode="contain"
            />
            <Text className="ml-3 text-lg font-bold text-foreground">
              Edicurve
            </Text>
          </View>
          <Text className="text-xs font-bold text-muted">{step + 1} of 3</Text>
        </View>

        {/* Progress bar */}
        <View className="mt-6 h-1.5 overflow-hidden rounded-full bg-[#E6E1D7]">
          <View
            className="h-full rounded-full bg-primary"
            style={{ width: `${((step + 1) / 3) * 100}%` }}
          />
        </View>

        {/* Step 0 — Goals */}
        {step === 0 && (
          <View className="mt-12">
            <Text className="text-4xl font-bold leading-tight text-foreground">
              What do you want to achieve?
            </Text>
            <Text className="mt-4 text-base leading-6 text-muted">
              Pick as many as you like. Edicurve will shape your experience
              around what matters to you.
            </Text>
            <Text className="mt-9 text-sm font-bold text-foreground">
              Your goals
            </Text>
            <View className="mt-3 gap-3">
              {goals.map((item) => {
                const selected = goals_selected.includes(item);
                return (
                  <Pressable
                    key={item}
                    onPress={() => toggle(item, goals_selected, setGoalsSelected)}
                    style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
                  >
                    <View
                      className={`flex-row items-center rounded-2xl border p-4 ${selected
                          ? "border-primary bg-[#EAF5F0]"
                          : "border-border bg-surface"
                        }`}
                    >
                      <View
                        className={`mr-3 h-5 w-5 items-center justify-center rounded-full border-2 ${selected ? "border-primary bg-primary" : "border-border"
                          }`}
                      >
                        {selected && (
                          <IconSymbol
                            name="checkmark"
                            size={11}
                            color={colors.background}
                          />
                        )}
                      </View>
                      <Text
                        className={`flex-1 text-sm font-semibold ${selected ? "text-primary" : "text-foreground"
                          }`}
                      >
                        {item}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* Step 1 — Subjects */}
        {step === 1 && (
          <View className="mt-12">
            <Text className="text-4xl font-bold leading-tight text-foreground">
              What are you studying?
            </Text>
            <Text className="mt-4 text-base leading-6 text-muted">
              Choose your subjects so Prep AI can personalise your quizzes and
              suggestions.
            </Text>
            <Text className="mt-9 text-sm font-bold text-foreground">
              Your subjects
            </Text>
            <View className="mt-3 flex-row flex-wrap gap-3">
              {subjectOptions.map((item) => {
                const selected = subjects.includes(item);
                return (
                  <Pressable
                    key={item}
                    onPress={() => toggle(item, subjects, setSubjects)}
                    style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
                  >
                    <View
                      className={`rounded-full border px-4 py-3 ${selected
                          ? "border-primary bg-primary"
                          : "border-border bg-surface"
                        }`}
                    >
                      <Text
                        className={`text-sm font-semibold ${selected ? "text-background" : "text-foreground"
                          }`}
                      >
                        {item}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <Text className="mt-10 text-sm font-bold text-foreground">
              Add your own
            </Text>
            <View className="mt-3 flex-row items-center gap-3">
              <TextInput
                value={customSubject}
                onChangeText={setCustomSubject}
                placeholder="e.g. Yoruba, Fine Art, Music"
                placeholderTextColor={colors.muted}
                className="flex-1 rounded-2xl border border-border bg-surface px-4 py-4 text-sm text-foreground"
                onSubmitEditing={addCustomSubject}
                returnKeyType="done"
              />
              <Pressable
                onPress={addCustomSubject}
                style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
              >
                <View className="h-14 w-14 items-center justify-center rounded-2xl bg-primary">
                  <IconSymbol name="plus" size={22} color={colors.background} />
                </View>
              </Pressable>
            </View>

            {/* Show custom-added subjects as removable chips */}
            {subjects.filter((s) => !subjectOptions.includes(s)).length > 0 && (
              <View className="mt-4 flex-row flex-wrap gap-2">
                {subjects
                  .filter((s) => !subjectOptions.includes(s))
                  .map((item) => (
                    <Pressable
                      key={item}
                      onPress={() => toggle(item, subjects, setSubjects)}
                      style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
                    >
                      <View className="flex-row items-center rounded-full border border-primary bg-[#EAF5F0] px-3 py-2 gap-2">
                        <Text className="text-xs font-semibold text-primary">
                          {item}
                        </Text>
                        <IconSymbol
                          name="xmark"
                          size={10}
                          color={colors.primary}
                        />
                      </View>
                    </Pressable>
                  ))}
              </View>
            )}
          </View>
        )}

        {/* Step 2 — Schedule */}
        {step === 2 && (
          <View className="mt-12">
            <Text className="text-4xl font-bold leading-tight text-foreground">
              Make it doable.
            </Text>
            <Text className="mt-4 text-base leading-6 text-muted">
              Pick a realistic rhythm. You can always adjust this later as your
              week changes.
            </Text>

            <Text className="mt-9 text-sm font-bold text-foreground">
              Minutes per study day
            </Text>
            <View className="mt-3 flex-row gap-3">
              {[20, 30, 45, 60].map((value) => (
                <Pressable
                  key={value}
                  onPress={() => setMinutes(value)}
                  style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
                >
                  <View
                    className={`rounded-2xl border px-4 py-3 ${minutes === value
                        ? "border-primary bg-primary"
                        : "border-border bg-surface"
                      }`}
                  >
                    <Text
                      className={`text-sm font-bold ${minutes === value ? "text-background" : "text-foreground"
                        }`}
                    >
                      {value}m
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>

            <Text className="mt-9 text-sm font-bold text-foreground">
              Days you want to study
            </Text>
            <View className="mt-3 flex-row flex-wrap gap-2">
              {dayOptions.map((day) => (
                <Pressable
                  key={day}
                  onPress={() => toggle(day, days, setDays)}
                  style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
                >
                  <View
                    className={`h-11 w-11 items-center justify-center rounded-full border ${days.includes(day)
                        ? "border-primary bg-primary"
                        : "border-border bg-surface"
                      }`}
                  >
                    <Text
                      className={`text-xs font-bold ${days.includes(day) ? "text-background" : "text-foreground"
                        }`}
                    >
                      {day}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>

            <View className="mt-9 rounded-2xl border border-border bg-surface p-4">
              <Text className="text-xs font-bold text-muted">YOUR PLAN</Text>
              <Text className="mt-2 text-sm font-semibold text-foreground">
                {minutes} min · {days.length} day{days.length !== 1 ? "s" : ""} a week ·{" "}
                {subjects.length} subject{subjects.length !== 1 ? "s" : ""}
              </Text>
              <Text className="mt-1 text-xs text-muted">
                That's{" "}
                {Math.round((minutes * days.length * 4) / 60)} hrs of study time
                per month.
              </Text>
            </View>
          </View>
        )}

        {/* Navigation */}
        <View className="mt-auto pt-10">
          <Pressable
            onPress={step < 2 ? () => setStep(step + 1) : finish}
            disabled={!canProceed() || scheduleUpsert.isPending}
            style={({ pressed }) => [{ opacity: pressed ? 0.82 : 1 }]}
          >
            <View
              className={`items-center rounded-2xl py-4 ${canProceed() ? "bg-primary" : "bg-[#C8C8C8]"
                }`}
            >
              <Text className="text-sm font-bold text-background">
                {step < 2
                  ? "Continue"
                  : scheduleUpsert.isPending
                    ? "Setting up..."
                    : "Let's get started"}
              </Text>
            </View>
          </Pressable>
          {step > 0 && (
            <Pressable
              onPress={() => setStep(step - 1)}
              style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
            >
              <Text className="mt-4 text-center text-sm font-semibold text-muted">
                Back
              </Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}