import { Alert, Pressable, Text, View } from "react-native";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { openOAuthFlow } from "@/lib/connectors";
import { trpc } from "@/lib/trpc";

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

export function ConnectedApps() {
  const status = trpc.connectors.status.useQuery();
  const googleAuthUrl = trpc.connectors.googleAuthUrl.useQuery();
  const notionAuthUrl = trpc.connectors.notionAuthUrl.useQuery();
  const googleCallback = trpc.connectors.googleCallback.useMutation({
    onSuccess: () => status.refetch(),
  });
  const notionCallback = trpc.connectors.notionCallback.useMutation({
    onSuccess: () => status.refetch(),
  });
  const disconnect = trpc.connectors.disconnect.useMutation({
    onSuccess: () => status.refetch(),
  });

  const connect = async (provider: "google" | "notion") => {
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
    if (provider === "google") await googleCallback.mutateAsync({ code });
    else await notionCallback.mutateAsync({ code });
  };

  const confirmDisconnect = (provider: "google" | "notion") => {
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
    <View>
      <Text className="mt-8 text-xl font-bold text-foreground">
        Connected apps
      </Text>
      <Text className="mt-1 text-sm text-muted">
        Let EDI see your calendar, files, and notes to give smarter help.
      </Text>
      <View className="mt-4 overflow-hidden rounded-2xl border border-border bg-surface">
        {CONNECTORS.map((connector, index) => {
          const connected = status.data?.[connector.id] ?? false;
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
                    ? confirmDisconnect(connector.id)
                    : connect(connector.id)
                }
                disabled={disconnect.isPending}
                style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
              >
                <View
                  className={`rounded-full px-3 py-1.5 ${
                    connected ? "border border-border bg-surface" : "bg-primary"
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
    </View>
  );
}