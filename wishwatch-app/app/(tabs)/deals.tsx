import React from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "../../src/hooks/useTheme";
import { DealBadge } from "../../src/components/DealBadge";
import { CategoryBadge } from "../../src/components/CategoryBadge";
import { RETAILERS } from "../../src/types";
import { api } from "../../src/services/api";
import type { DealItem } from "../../src/types";

export default function DealsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();

  const {
    data: deals = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["deals"],
    queryFn: async () => {
      const res = await api.getDeals();
      return res.data;
    },
    refetchInterval: 5 * 60 * 1000,
  });

  const renderDealCard = ({ item }: { item: DealItem }) => {
    const best = item.bestPrice;
    const retailer = RETAILERS[best?.retailer ?? "unknown"];

    return (
      <TouchableOpacity
        onPress={() => router.push(`/item/${item.id}`)}
        activeOpacity={0.85}
        style={[styles.card, { backgroundColor: colors.surface }]}
      >
        <View style={styles.cardTop}>
          <View style={styles.cardLabels}>
            <CategoryBadge category={item.category} />
            <DealBadge score={item.dealScore} size="md" />
          </View>
          {item.allTimeLow != null && best && best.price <= item.allTimeLow + 0.01 && (
            <View style={styles.atlTag}>
              <Text style={styles.atlTagText}>⭐ BEST EVER</Text>
            </View>
          )}
        </View>

        <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={2}>
          {item.name}
        </Text>

        <View style={styles.priceRow}>
          <View>
            <Text style={[styles.price, { color: colors.text }]}>
              €{best?.price.toFixed(2) ?? "—"}
            </Text>
            <Text style={[styles.retailerName, { color: colors.textSecondary }]}>
              {retailer?.flag ?? "🌐"} {retailer?.name ?? best?.retailer}
            </Text>
          </View>

          {item.savingsPercent > 0 && (
            <View style={styles.savingsBadge}>
              <Text style={styles.savingsText}>-{item.savingsPercent.toFixed(0)}%</Text>
              <Text style={styles.savingsAmount}>€{item.savings.toFixed(2)} off avg</Text>
            </View>
          )}
        </View>

        <View style={styles.cardFooter}>
          {best?.shippingCost === 0 ? (
            <Text style={styles.freeShipping}>✓ Free shipping to Barcelona</Text>
          ) : best?.shippingCost ? (
            <Text style={[styles.shippingCost, { color: colors.textSecondary }]}>
              +€{best.shippingCost.toFixed(2)} shipping
            </Text>
          ) : null}

          {best?.url && (
            <TouchableOpacity
              onPress={() => Linking.openURL(best.url)}
              style={styles.openButton}
            >
              <Text style={styles.openButtonText}>Open →</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Active Deals</Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
          {deals.length} deals found
        </Text>
      </View>

      <FlatList
        data={deals}
        keyExtractor={(item) => item.id}
        renderItem={renderDealCard}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#6366f1" />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>{isLoading ? "⏳" : "🎯"}</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {isLoading ? "Loading deals..." : "No deals yet"}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              {!isLoading && "Add items to your wishlist and we'll alert you when prices drop."}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 26, fontWeight: "800", letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 12, marginTop: 2 },
  listContent: { padding: 16, paddingBottom: 100, gap: 12 },
  card: {
    borderRadius: 16,
    padding: 16,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardLabels: { flexDirection: "row", gap: 6, alignItems: "center" },
  atlTag: {
    backgroundColor: "#fef3c7",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  atlTagText: { fontSize: 10, fontWeight: "700", color: "#92400e" },
  itemName: { fontSize: 16, fontWeight: "600", lineHeight: 22 },
  priceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  price: { fontSize: 24, fontWeight: "700" },
  retailerName: { fontSize: 12, marginTop: 2 },
  savingsBadge: {
    backgroundColor: "#dcfce7",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: "center",
  },
  savingsText: { fontSize: 18, fontWeight: "800", color: "#16a34a" },
  savingsAmount: { fontSize: 10, color: "#166534" },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  freeShipping: { fontSize: 11, color: "#22c55e", fontWeight: "600" },
  shippingCost: { fontSize: 11 },
  openButton: {
    backgroundColor: "#6366f1",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
  },
  openButtonText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  emptyState: { alignItems: "center", paddingTop: 80, paddingHorizontal: 32, gap: 12 },
  emptyIcon: { fontSize: 56 },
  emptyTitle: { fontSize: 20, fontWeight: "700" },
  emptySubtitle: { fontSize: 14, textAlign: "center" },
});
