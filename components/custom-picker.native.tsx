import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import { Platform, Pressable, Text, View } from "react-native";

export function CustomPicker({
  value,
  onChange,
}: {
  value: Date;
  onChange: (next: Date) => void;
}) {
  if (Platform.OS === "android") {
    // Android shows the date and time pickers one after the other.
    const open = () =>
      DateTimePickerAndroid.open({
        value,
        mode: "date",
        onChange: (event, pickedDate) => {
          if (event.type !== "set" || !pickedDate) return;
          DateTimePickerAndroid.open({
            value: pickedDate,
            mode: "time",
            is24Hour: false,
            onChange: (timeEvent, pickedTime) => {
              if (timeEvent.type !== "set" || !pickedTime) return;
              const next = new Date(pickedDate);
              next.setHours(pickedTime.getHours(), pickedTime.getMinutes(), 0, 0);
              onChange(next);
            },
          });
        },
      });

    return (
      <Pressable
        onPress={open}
        style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
      >
        <View className="items-center rounded-xl border border-border bg-background py-3">
          <Text className="text-xs font-bold text-primary">
            Pick exact date and time
          </Text>
        </View>
      </Pressable>
    );
  }

  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-xs font-bold text-muted">EXACT TIME</Text>
      <DateTimePicker
        value={value}
        mode="datetime"
        display="compact"
        onChange={(_event, picked) => {
          if (picked) onChange(picked);
        }}
      />
    </View>
  );
}