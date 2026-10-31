import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { startOAuthLogin } from "@/constants/oauth";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import { useStudyStats } from "@/hooks/use-study-stats";
import { useOnboarding } from "@/lib/onboarding-context";
import { getPushToken } from "@/lib/notifications";
import { openOAuthFlow } from "@/lib/connectors";
import { trpc } from "@/lib/trpc";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";

// Flip to true once Edicurve has its own sign-in.
const SIGN_IN_ENABLED = false;

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

const CONNECTORS = [
  {
    id: "google" as const,
    label: "Google",
    caption: "Calendar · Drive · Classroom",
    icon: "person.crop.circle.fill" as const,
    color: "#4285F4",
  },
  {
    id: "notion" as const,
    label: "Notion",
    caption: "Notes & pages",
    icon: "doc.text.fill" as const,
    color: "#555555",
  },
];

export default function ProfileScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user, isAuthenticated, logout } = useAuth();
  const { data: onboarding } = useOnboarding();
  const { stats } = useStudyStats();
  const registerToken = trpc.notifications.registerToken.useMutation();

  const connectorStatus = trpc.connectors.status.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const googleAuthUrl = trpc.connectors.googleAuthUrl.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const notionAuthUrl = trpc.connectors.notionAuthUrl.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const googleCallback = trpc.connectors.googleCallback.useMutation({
    onSuccess: () => connectorStatus.refetch(),
  });
  const notionCallback = trpc.connectors.notionCallback.useMutation({
    onSuccess: () => connectorStatus.refetch(),
  });
  const disconnect = trpc.connectors.disconnect.useMutation({
    onSuccess: () => connectorStatus.refetch(),
  });

  const displayName = user?.name || "Student";
  const initials = getInitials(user?.name);

  const signIn = async () => {
    await startOAuthLogin();
  };

  const enableNotifications = async () => {
    const token = await getPushToken();
    if (!token) {
      Alert.alert(
        "Notifications unavailable",
        "Enable notifications on a physical iOS or Android device.",
      );
      return;
    }
    if (isAuthenticated) {
      await registerToken.mutateAsync({ token, platform: "expo" });
      Alert.alert(
        "Reminders enabled",
        "Edicurve can now send you study and deadline reminders.",
      );
    } else {
      Alert.alert(
        "Reminders ready on this device",
        "Your device permission is set. Study reminders run from this device.",
      );
    }
  };

  const handleConnect = async (provider: "google" | "notion") => {
    const url =
      provider === "google" ? googleAuthUrl.data?.url : notionAuthUrl.data?.url;
    if (!url) return;

    const code = await openOAuthFlow(
      url,
      provider === "google"
        ? "/oauth/google/callback"
        : "/oauth/notion/callback",
    );
    if (!code) return;

    if (provider === "google") {
      await googleCallback.mutateAsync({ code });
    } else {
      await notionCallback.mutateAsync({ code });
    }
  };

  const handleDisconnect = (provider: "google" | "notion") => {
    Alert.alert(
      `Disconnect ${provider === "google" ? "Google" : "Notion"}?`,
      "Edicurve will lose access to your data from this service.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: () => disconnect.mutate({ provider }),
        },
      ],
    );
  };

  return (
    <ScreenContainer className="px-5 pt-5" edges={["top", "left", "right"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <Text className="text-3xl font-bold text-foreground">Profile</Text>

        <View className="mt-8 items-center">
          <View className="h-20 w-20 items-center justify-center rounded-full bg-primary">
            {initials ? (
              <Text className="text-2xl font-bold text-background">
                {initials}
              </Text>
            ) : (
              <IconSymbol
                name="person.crop.circle.fill"
                size={40}
                color={colors.background}
              />
            )}
          </View>
          <Text className="mt-4 text-2xl font-bold text-foreground">
            {displayName}
          </Text>
          <Text className="mt-1 text-sm text-muted">
            {user?.email || "Study workspace"}
          </Text>
        </View>

        {SIGN_IN_ENABLED && !isAuthenticated && (
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
            <Text className="text-2xl font-bold text-foreground">
              {stats.streak}
            </Text>
            <Text className="mt-1 text-xs text-muted">Day streak</Text>
          </View>
          <View className="flex-1 rounded-2xl border border-border bg-surface p-4">
            <Text className="text-2xl font-bold text-foreground">
              {stats.weeklyPercent}%
            </Text>
            <Text className="mt-1 text-xs text-muted">Weekly goal</Text>
          </View>
          <View className="flex-1 rounded-2xl border border-border bg-surface p-4">
            <Text className="text-2xl font-bold text-foreground">
              {stats.totalAnswered}
            </Text>
            <Text className="mt-1 text-xs text-muted">Questions</Text>
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
            {onboarding.minutesPerDay} min ·{" "}
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
          Study tools
        </Text>
        <View className="mt-4 overflow-hidden rounded-2xl border border-border bg-surface">
          <Pressable
            onPress={() => router.push("/analytics" as never)}
            style={({ pressed }) => [{ opacity: pressed ? 0.72 : 1 }]}
          >
            <View className="flex-row items-center border-b border-border p-4">
              <IconSymbol
                name="chart.bar.fill"
                size={20}
                color={colors.muted}
              />
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
              <Text className="mr-1 text-xs text-muted">
                Tasks & reminders
              </Text>
              <IconSymbol name="chevron.right" size={18} color={colors.muted} />
            </View>
          </Pressable>
        </View>

        {isAuthenticated && (
          <>
            <Text className="mt-8 text-xl font-bold text-foreground">
              Connected apps
            </Text>
            <Text className="mt-1 text-sm text-muted">
              Let EDI see your calendar, files, and notes to give smarter help.
            </Text>
            <View className="mt-4 overflow-hidden rounded-2xl border border-border bg-surface">
              {CONNECTORS.map((connector, index) => {
                const connected = connectorStatus.data?.[connector.id] ?? false;
                const isLast = index === CONNECTORS.length - 1;
                return (
                  <View
                    key={connector.id}
                    className={`flex-row items-center p-4 ${
                      !isLast ? "border-b border-border" : ""
                    }`}
                  >
                    <View
                      className="h-10 w-10 items-center justify-center rounded-xl"
                      style={{ backgroundColor: `${connector.color}18` }}
                    >
                      <IconSymbol
                        name={connector.icon}
                        size={20}
                        color={connector.color}
                      />
                    </View>
                    <View className="ml-3 flex-1">
                      <Text className="font-bold text-foreground">
                        {connector.label}
                      </Text>
                      <Text className="mt-0.5 text-xs text-muted">
                        {connector.caption}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() =>
                        connected
                          ? handleDisconnect(connector.id)
                          : handleConnect(connector.id)
                      }
                      disabled={disconnect.isPending}
                      style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                    >
                      <View
                        className={`rounded-full px-3 py-1.5 ${
                          connected
                            ? "border border-border bg-surface"
                            : "bg-primary"
                        }`}
                      >
                        <Text
                          className={`text-xs font-bold ${
                            connected ? "text-muted" : "text-background"
                          }`}
                        >
                          {connected ? "Disconnect" : "Connect"}
                        </Text>
                      </View>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </>
        )}

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
              Alert.alert("About Edicurve", "Learn, Practice, Progress.")
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