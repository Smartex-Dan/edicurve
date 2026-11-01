import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import {
  ActiveDocument,
  clearActiveDocument,
  getActiveDocument,
} from "@/lib/library-storage";
import { trpc } from "@/lib/trpc";

type Message = { id: string; role: "user" | "assistant"; content: string };

const starterMessages: Message[] = [
  {
    id: "welcome",
    role: "assistant",
    content:
      "Hi, I'm EDI, your AI study companion. Ask me anything: concepts, past paper help, practice questions, or study plans. What are you working on?",
  },
];

const prompts = [
  "Explain a concept",
  "Quiz me on a topic",
  "Help me plan this week",
  "Break down this problem",
];

export default function TutorScreen() {
  const colors = useColors();
  const [messages, setMessages] = useState<Message[]>(starterMessages);
  const [draft, setDraft] = useState("");
  const [document, setDocument] = useState<ActiveDocument | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const chat = trpc.tutor.chat.useMutation();

  // Reload the chosen PDF whenever this tab comes into view.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      getActiveDocument().then((doc) => {
        if (active) setDocument(doc);
      });
      return () => {
        active = false;
      };
    }, []),
  );

  useEffect(() => {
    requestAnimationFrame(() =>
      scrollRef.current?.scrollToEnd({ animated: true }),
    );
  }, [messages.length]);

  const sendMessage = async (value = draft) => {
    const content = value.trim();
    if (!content || chat.isPending) return;
    const nextMessages = [
      ...messages,
      { id: Date.now().toString(), role: "user" as const, content },
    ];
    setMessages(nextMessages);
    setDraft("");
    try {
      const response = await chat.mutateAsync({
        document: document
          ? { name: document.name, text: document.text }
          : undefined,
        messages: nextMessages.map(({ role, content: text }) => ({
          role,
          content: text,
        })),
      });
      setMessages((current) => [
        ...current,
        {
          id: `${Date.now()}-reply`,
          role: "assistant",
          content: response.reply,
        },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: `${Date.now()}-fallback`,
          role: "assistant",
          content:
            "I'm having trouble connecting right now. Try again in a moment, or tell me exactly which part you're stuck on.",
        },
      ]);
    }
  };

  const removeDocument = async () => {
    await clearActiveDocument();
    setDocument(null);
  };

  return (
    <ScreenContainer
      className="px-5 pt-5"
      edges={["top", "left", "right", "bottom"]}
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <View className="h-11 w-11 items-center justify-center rounded-2xl bg-primary">
              <IconSymbol name="sparkles" size={22} color={colors.background} />
            </View>
            <View className="ml-3">
              <Text className="text-sm font-semibold text-primary">
                YOUR AI COMPANION
              </Text>
              <Text className="mt-0.5 text-2xl font-bold text-foreground">
                EDI
              </Text>
            </View>
          </View>
          <View className="flex-row items-center rounded-full bg-[#E6F2EE] px-3 py-2">
            <View className="mr-2 h-2 w-2 rounded-full bg-[#4EA982]" />
            <Text className="text-xs font-bold text-primary">Online</Text>
          </View>
        </View>

        <Text className="mt-3 text-sm leading-5 text-muted">
          Explanations, practice questions, past papers, and study plans, all in
          one place.
        </Text>

        {document && (
          <View className="mt-4 flex-row items-center rounded-2xl border border-primary bg-[#EAF5F0] px-3 py-3">
            <IconSymbol name="doc.text.fill" size={18} color={colors.primary} />
            <View className="ml-2 flex-1">
              <Text className="text-xs font-bold text-primary">
                PDF context active
              </Text>
              <Text className="mt-0.5 text-xs text-foreground" numberOfLines={1}>
                {document.name}
              </Text>
            </View>
            <Pressable
              onPress={removeDocument}
              style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
            >
              <Text className="text-xs font-bold text-muted">Remove</Text>
            </Pressable>
          </View>
        )}

        <ScrollView
          ref={scrollRef}
          className="mt-5 flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 16 }}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((message) => (
            <View
              key={message.id}
              className={`mb-3 max-w-[88%] rounded-2xl px-4 py-3 ${
                message.role === "user"
                  ? "self-end rounded-br-md bg-primary"
                  : "self-start rounded-bl-md border border-border bg-surface"
              }`}
            >
              <Text
                className={`text-sm leading-5 ${
                  message.role === "user" ? "text-background" : "text-foreground"
                }`}
              >
                {message.content}
              </Text>
            </View>
          ))}
          {chat.isPending && (
            <View className="mb-3 self-start rounded-2xl rounded-bl-md border border-border bg-surface px-4 py-3">
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          )}
        </ScrollView>

        {messages.length === 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mb-3"
            contentContainerStyle={{ gap: 8 }}
          >
            {prompts.map((prompt) => (
              <Pressable
                key={prompt}
                onPress={() => sendMessage(prompt)}
                style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
              >
                <View className="rounded-full border border-border bg-surface px-3 py-2">
                  <Text className="text-xs font-semibold text-foreground">
                    {prompt}
                  </Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        )}

        <View className="flex-row items-end rounded-2xl border border-border bg-surface px-3 py-2">
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={
              document ? "Ask about this PDF..." : "Ask EDI anything..."
            }
            placeholderTextColor={colors.muted}
            multiline
            className="max-h-24 flex-1 px-1 py-1 text-sm leading-5 text-foreground"
            onSubmitEditing={() => sendMessage()}
            returnKeyType="send"
            blurOnSubmit={false}
          />
          <Pressable
            onPress={() => sendMessage()}
            style={({ pressed }) => [
              { opacity: pressed ? 0.65 : draft.trim() ? 1 : 0.35 },
            ]}
            disabled={!draft.trim() || chat.isPending}
          >
            <View className="h-9 w-9 items-center justify-center rounded-xl bg-primary">
              <IconSymbol
                name="paperplane.fill"
                size={17}
                color={colors.background}
              />
            </View>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}