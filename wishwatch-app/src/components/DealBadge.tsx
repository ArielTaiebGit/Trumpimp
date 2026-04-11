import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS, DEAL_SCORE_THRESHOLD } from "../constants";

interface Props {
  score: number;
  size?: "sm" | "md" | "lg";
}

export function DealBadge({ score, size = "md" }: Props) {
  if (score < DEAL_SCORE_THRESHOLD) return null;

  const isHot = score >= 85;
  const isGood = score >= 70;

  const bgColor = isHot
    ? COLORS.danger
    : isGood
    ? COLORS.warning
    : COLORS.success;

  const label = isHot ? "🔥 HOT" : isGood ? "⚡ DEAL" : "✓ GOOD";

  const styles = StyleSheet.create({
    badge: {
      backgroundColor: bgColor,
      borderRadius: 6,
      paddingHorizontal: size === "sm" ? 6 : size === "lg" ? 10 : 8,
      paddingVertical: size === "sm" ? 2 : size === "lg" ? 5 : 3,
      alignSelf: "flex-start",
    },
    text: {
      color: "#fff",
      fontWeight: "700",
      fontSize: size === "sm" ? 9 : size === "lg" ? 13 : 11,
      letterSpacing: 0.3,
    },
    score: {
      color: "rgba(255,255,255,0.85)",
      fontSize: size === "sm" ? 8 : 10,
      marginLeft: 3,
    },
  });

  return (
    <View style={styles.badge}>
      <Text style={styles.text}>
        {label} <Text style={styles.score}>{score}</Text>
      </Text>
    </View>
  );
}
