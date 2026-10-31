import { Text, View } from "react-native";

import { IconSymbol } from "@/components/ui/icon-symbol";
import type { ToastState } from "@/hooks/use-toast";

export function Toast({ toast }: { toast: ToastState }) {
  if (!toast) return null;
  const isError = toast.type === "error";

  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: 12,
        left: 16,
        right: 16,
        zIndex: 50,
        elevation: 6,
      }}
    >
      <View
        className="flex-row items-center rounded-2xl px-4 py-3"
        style={{ backgroundColor: isError ? "#B3261E" : "#0B7A6B" }}
      >
        <IconSymbol
          name={isError ? "info.circle.fill" : "checkmark.circle.fill"}
          size={18}
          color="#FFFFFF"
        />
        <Text className="ml-2 flex-1 text-sm font-semibold text-white">
          {toast.message}
        </Text>
      </View>
    </View>
  );
}