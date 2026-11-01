import { createElement } from "react";
import { Text, View } from "react-native";

import { useColors } from "@/hooks/use-colors";
import { fromInputValue, toInputValue } from "@/lib/date-time";

export function CustomPicker({
  value,
  onChange,
}: {
  value: Date;
  onChange: (next: Date) => void;
}) {
  const colors = useColors();
  return (
    <View>
      <Text className="text-xs font-bold text-muted">OR PICK EXACTLY</Text>
      {createElement("input", {
        type: "datetime-local",
        value: toInputValue(value),
        onChange: (event: any) => {
          const next = fromInputValue(event.target.value);
          if (next) onChange(next);
        },
        style: {
          marginTop: 8,
          padding: 12,
          borderRadius: 12,
          border: `1px solid ${colors.border}`,
          backgroundColor: colors.background,
          color: colors.foreground,
          fontSize: 14,
          fontFamily: "inherit",
          width: "100%",
          boxSizing: "border-box",
        },
      })}
    </View>
  );
}