import { Pressable, Text, View } from "react-native";

import { TopicStat, scoreColor, subjectColor } from "@/lib/study-stats";

export function TopicCard({
  topic,
  onPractice,
}: {
  topic: TopicStat;
  onPractice?: () => void;
}) {
  const color = subjectColor(topic.subject);
  const bar = scoreColor(topic.percent);

  return (
    <View className="rounded-2xl border border-border bg-surface p-4">
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="font-bold text-foreground">{topic.topic}</Text>
          <Text className="mt-0.5 text-xs font-semibold" style={{ color }}>
            {topic.subject}
          </Text>
        </View>
        <View className="items-end">
          <Text className="text-lg font-bold" style={{ color: bar }}>
            {topic.percent}%
          </Text>
          <Text className="text-xs text-muted">
            {topic.correct} of {topic.attempts}
          </Text>
        </View>
      </View>
      <View className="mt-3 h-2 overflow-hidden rounded-full bg-[#E9E8E2]">
        <View
          className="h-full rounded-full"
          style={{ width: `${topic.percent}%`, backgroundColor: bar }}
        />
      </View>
      {onPractice && (
        <Pressable
          onPress={onPractice}
          style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
        >
          <Text className="mt-3 text-xs font-bold text-primary">
            Practice this topic
          </Text>
        </Pressable>
      )}
    </View>
  );
}