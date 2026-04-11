import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { CATEGORY_CONFIG } from "../constants";
import type { Category } from "../types";

interface Props {
  category: Category;
  size?: "sm" | "md";
}

export function CategoryBadge({ category, size = "sm" }: Props) {
  const config = CATEGORY_CONFIG[category] ?? CATEGORY_CONFIG.other;

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: config.color + "22" },
        size === "md" && styles.badgeMd,
      ]}
    >
      <Text style={[styles.text, size === "md" && styles.textMd]}>
        {config.icon} {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 2,
    alignSelf: "flex-start",
  },
  badgeMd: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  text: {
    fontSize: 10,
    fontWeight: "600",
    color: "#475569",
  },
  textMd: {
    fontSize: 13,
  },
});
