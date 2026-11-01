import { Pressable, ScrollView, Text, View } from "react-native";

import { CustomPicker } from "@/components/custom-picker";
import { useColors } from "@/hooks/use-colors";
import {
  TIME_OPTIONS,
  dayLabel,
  formatSummary,
  nextDays,
  sameDay,
  withDay,
  withTime,
} from "@/lib/date-time";

export function DateTimeField({
  value,
  onChange,
}: {
  value: Date;
  onChange: (next: Date) => void;
}) {
  const colors = useColors();
  const now = new Date();
  const days = nextDays(8);

  return (
    <View>
      <Text className="text-xs font-bold text-muted">DAY</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mt-2"
        contentContainerStyle={{ gap: 8 }}
      >
        {days.map((day, index) => {
          const selected = sameDay(day, value);
          return (
            <Pressable
              key={day.toISOString()}
              onPress={() => onChange(withDay(value, day))}
              style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
            >
              <View
                className="rounded-full border px-4 py-2.5"
                style={{
                  backgroundColor: selected ? colors.primary : colors.background,
                  borderColor: selected ? colors.primary : colors.border,
                }}
              >
                <Text
                  className="text-xs font-bold"
                  style={{ color: selected ? colors.background : colors.foreground }}
                >
                  {dayLabel(day, index)}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text className="mt-4 text-xs font-bold text-muted">TIME</Text>
      <View className="mt-2 flex-row flex-wrap gap-2">
        {TIME_OPTIONS.map((option) => {
          const candidate = withTime(value, option.hour);
          const selected =
            value.getHours() === option.hour && value.getMinutes() === 0;
          const inPast = sameDay(value, now) && candidate.getTime() <= now.getTime();
          return (
            <Pressable
              key={option.hour}
              disabled={inPast}
              onPress={() => onChange(candidate)}
              style={({ pressed }) => [
                { opacity: inPast ? 0.35 : pressed ? 0.75 : 1 },
              ]}
            >
              <View
                className="rounded-full border px-4 py-2.5"
                style={{
                  backgroundColor: selected ? colors.primary : colors.background,
                  borderColor: selected ? colors.primary : colors.border,
                }}
              >
                <Text
                  className="text-xs font-bold"
                  style={{ color: selected ? colors.background : colors.foreground }}
                >
                  {option.label}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <View className="mt-4">
        <CustomPicker value={value} onChange={onChange} />
      </View>

      <Text className="mt-4 text-sm font-semibold text-foreground">
        Due {formatSummary(value)}
      </Text>
    </View>
  );
}