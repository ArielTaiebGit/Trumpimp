import { Tabs } from "expo-router";
import { View, Text, StyleSheet } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "../../src/hooks/useTheme";
import { api } from "../../src/services/api";
import { DEAL_SCORE_THRESHOLD } from "../../src/constants";
import type { WishlistItem } from "../../src/types";

function TabBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{count > 99 ? "99+" : count}</Text>
    </View>
  );
}

export default function TabLayout() {
  const { colors, isDark } = useTheme();
  const { data: items = [] } = useQuery<WishlistItem[]>({
    queryKey: ["items"],
    queryFn: async () => {
      const res = await api.getItems();
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });
  const dealBadgeCount = items.filter((i) => (i.dealScore ?? 0) >= DEAL_SCORE_THRESHOLD).length;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          paddingBottom: 4,
        },
        tabBarActiveTintColor: "#6366f1",
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Wishlist",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>❤️</Text>,
        }}
      />
      <Tabs.Screen
        name="deals"
        options={{
          title: "Deals",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>⚡</Text>,
          tabBarBadge: dealBadgeCount > 0 ? dealBadgeCount : undefined,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>⚙️</Text>,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    right: -6,
    top: -3,
    backgroundColor: "#ef4444",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
  },
});
