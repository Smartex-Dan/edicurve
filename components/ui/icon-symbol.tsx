// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<SymbolViewProps["name"], ComponentProps<typeof MaterialIcons>["name"]>;
type IconSymbolName = keyof typeof MAPPING;

const MAPPING = {
  "house.fill": "home",
  "book.fill": "menu-book",
  "calendar": "event",
  "folder.fill": "folder",
  "bubble.left.and.bubble.right.fill": "forum",
  "person.crop.circle.fill": "account-circle",
  "paperplane.fill": "send",
  "person.fill": "person",
  "plus": "add",
  "checkmark.circle.fill": "check-circle",
  "clock.fill": "schedule",
  "doc.text.fill": "description",
  "sparkles": "auto-awesome",
  "chevron.right": "chevron-right",
  "chevron.left": "chevron-left",
  "info.circle.fill": "info",
  "arrow.up.right": "north-east",
  "magnifyingglass": "search",
  "bell.fill": "notifications-none",
  "pin.fill": "push-pin",
  "play.fill": "play-arrow",
  "ellipsis": "more-horiz",
} as IconMapping;

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
