import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { startOAuthLogin } from "@/constants/oauth";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import { useOnboarding } from "@/lib/onboarding-context";
import { getPushToken } from "@/lib/notifications";
import { trpc } from "@/lib/trpc";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";

export default function ProfileScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user, isAuthenticated, logout } = useAuth();
  const { data: onboarding } = useOnboarding();
  const registerToken = trpc.notifications.registerToken.useMutation();
  const displayName = user?.name || "Student";
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const signIn = async () => {
    await startOAuthLogin();
  };
  const enableNotifications = async () => {
    const token = await getPushToken();
    if (!token) {
      Alert.alert(
        "Notifications unavailable",
        "Enable notifications on a physical iOS or Android device. Web reminders are not supported by the browser preview.",
      );
      return;
    }
    if (isAuthenticated) {
      await registerToken.mutateAsync({ token, platform: "expo" });
      Alert.alert(
        "Reminders enabled",
        "Edicurve can now register this device for study and deadline notifications.",
      );
    } else Alert.alert("Sign in to sync reminders to your Edicurve account.");
  };

  return (
    <ScreenContainer className="px-5 pt-5" edges={["top", "left", "right"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <View className="flex-row items-center">
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
          >
            <IconSymbol
              name="chevron.left"
              size={20}
              color={colors.foreground}
            />
          </Pressable>
          <Text className="ml-3 text-xl font-bold text-foreground">
            Profile
          </Text>
        </View>
        <View className="mt-8 items-center">
          <View className="h-20 w-20 items-center justify-center rounded-full bg-primary">
            <Text className="text-2xl font-bold text-background">
              {initials}
            </Text>
          </View>
          <Text className="mt-4 text-2xl font-bold text-foreground">
            {displayName}
          </Text>
          <Text className="mt-1 text-sm text-muted">
            {user?.email || "Student workspace"}
          </Text>
        </View>

        {!isAuthenticated && (
          <Pressable
            onPress={signIn}
            style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
          >
            <View className="mt-6 flex-row items-center justify-center rounded-2xl bg-primary px-4 py-4">
              <IconSymbol
                name="person.crop.circle.fill"
                size={20}
                color={colors.background}
              />
              <Text className="ml-2 text-sm font-bold text-background">
                Sign in to sync your workspace
              </Text>
            </View>
          </Pressable>
        )}

        <View className="mt-7 flex-row gap-3">
          <View className="flex-1 rounded-2xl border border-border bg-surface p-4">
            <Text className="text-2xl font-bold text-foreground">12</Text>
            <Text className="mt-1 text-xs text-muted">Day streak</Text>
          </View>
          <View className="flex-1 rounded-2xl border border-border bg-surface p-4">
            <Text className="text-2xl font-bold text-foreground">68%</Text>
            <Text className="mt-1 text-xs text-muted">Weekly goal</Text>
          </View>
          <View className="flex-1 rounded-2xl border border-border bg-surface p-4">
            <Text className="text-2xl font-bold text-foreground">27</Text>
            <Text className="mt-1 text-xs text-muted">Sessions</Text>
          </View>
        </View>

        <Text className="mt-8 text-xl font-bold text-foreground">
          Your learning setup
        </Text>
        <View className="mt-4 rounded-2xl border border-border bg-surface p-4">
          <Text className="text-xs font-bold text-muted">CURRENT GOAL</Text>
          <Text className="mt-2 font-semibold text-foreground">
            {onboarding.goal || "Set a goal in onboarding"}
          </Text>
          <Text className="mt-3 text-xs leading-5 text-muted">
            {onboarding.minutesPerDay} minutes on{" "}
            {onboarding.studyDays.join(", ") || "your chosen days"} ·{" "}
            {onboarding.subjects.join(", ") || "No subjects yet"}
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

        <Text className="mt-8 text-xl font-bold text-foreground">
          Preferences
        </Text>
        <View className="mt-4 overflow-hidden rounded-2xl border border-border bg-surface">
          <Pressable
            onPress={enableNotifications}
            style={({ pressed }) => [{ opacity: pressed ? 0.72 : 1 }]}
          >
            <View className="flex-row items-center border-b border-border p-4">
              <IconSymbol name="bell.fill" size={20} color={colors.muted} />
              <Text className="ml-3 flex-1 font-semibold text-foreground">
                Notifications
              </Text>
              <Text className="text-xs font-bold text-primary">Enable</Text>
            </View>
          </Pressable>
          <Pressable
            onPress={() =>
              Alert.alert("Appearance", "Edicurve follows your device theme.")
            }
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
            onPress={() =>
              Alert.alert(
                "About Edicurve",
                "Your all-in-one study companion. Study smarter, not harder.",
              )
            }
            style={({ pressed }) => [{ opacity: pressed ? 0.72 : 1 }]}
          >
            <View className="flex-row items-center p-4">
              <IconSymbol
                name="info.circle.fill"
                size={20}
                color={colors.muted}
              />
              <Text className="ml-3 flex-1 font-semibold text-foreground">
                About Edicurve
              </Text>
              <IconSymbol name="chevron.right" size={18} color={colors.muted} />
            </View>
          </Pressable>
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
    </ScreenContainer>
  );
}
