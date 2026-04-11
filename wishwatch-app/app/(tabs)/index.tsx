import React, { useCallback, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "../../src/hooks/useTheme";
import { useAppStore } from "../../src/store";
import { WishlistCard } from "../../src/components/WishlistCard";
import { api } from "../../src/services/api";
import { MAX_WISHLIST_ITEMS, DEAL_SCORE_THRESHOLD } from "../../src/constants";
import type { WishlistItem } from "../../src/types";

export default function WishlistScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const setDealBadgeCount = useAppStore((s) => s.setDealBadgeCount);
  const queryClient = useQueryClient();

  const {
    data: items = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["items"],
    queryFn: async () => {
      const res = await api.getItems();
      return res.data;
    },
    refetchInterval: 5 * 60 * 1000,
  });

  const { data: stats } = useQuery({
    queryKey: ["stats"],
    queryFn: async () => {
      const res = await api.getStats();
      return res.data;
    },
  });

  // Update badge count whenever items change
  useEffect(() => {
    const dealCount = items.filter((i) => (i.dealScore ?? 0) >= DEAL_SCORE_THRESHOLD).length;
    setDealBadgeCount(dealCount);
  }, [items, setDealBadgeCount]);

  const deleteMutation = useMutation({
    mutationFn: api.deleteItem,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["items"] }),
  });

  const handleDelete = useCallback(
    (item: WishlistItem) => {
      Alert.alert(
        "Remove Item",
        `Remove "${item.name}" from your wishlist?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove",
            style: "destructive",
            onPress: () => deleteMutation.mutate(item.id),
          },
        ]
      );
    },
    [deleteMutation]
  );

  const handleScanAll = async () => {
    try {
      await api.triggerScrapeAll();
      Alert.alert("Scan Started", "Checking prices across all retailers. This may take a few minutes.");
      setTimeout(() => refetch(), 10000);
    } catch {
      Alert.alert("Error", "Could not start scan. Is the backend running?");
    }
  };

  const canAddMore = items.length < MAX_WISHLIST_ITEMS;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>WishWatch</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            {items.length}/{MAX_WISHLIST_ITEMS} items
            {stats?.activeDeals ? ` · ${stats.activeDeals} deals` : ""}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleScanAll} style={styles.scanButton}>
            <Text style={styles.scanButtonText}>🔄</Text>
          </TouchableOpacity>
          {canAddMore && (
            <TouchableOpacity
              onPress={() => router.push("/add-item")}
              style={[styles.addButton, { backgroundColor: "#6366f1" }]}
            >
              <Text style={styles.addButtonText}>+ Add</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Last scan info */}
      {stats?.lastScanAt && (
        <View style={[styles.scanInfo, { backgroundColor: colors.surfaceSecondary }]}>
          <Text style={[styles.scanInfoText, { color: colors.textTertiary }]}>
            Last scan: {new Date(stats.lastScanAt).toLocaleString("en-GB", {
              day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
            })}
          </Text>
        </View>
      )}

      {/* Items list */}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <WishlistCard item={item} />}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor="#6366f1"
          />
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyIcon]}>⏳</Text>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Loading...</Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🛍️</Text>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                Your wishlist is empty
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Add up to {MAX_WISHLIST_ITEMS} items and we'll track the best deals across major EU retailers for you.
              </Text>
              <TouchableOpacity
                onPress={() => router.push("/add-item")}
                style={[styles.emptyButton, { backgroundColor: "#6366f1" }]}
              >
                <Text style={styles.emptyButtonText}>Add your first item</Text>
              </TouchableOpacity>
            </View>
          )
        }
      />

      {/* Floating add button when list has items */}
      {items.length > 0 && canAddMore && (
        <TouchableOpacity
          onPress={() => router.push("/add-item")}
          style={[styles.fab, { bottom: insets.bottom + 80 }]}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  scanButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(99,102,241,0.1)",
  },
  scanButtonText: { fontSize: 18 },
  addButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  scanInfo: {
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  scanInfoText: { fontSize: 11 },
  listContent: { paddingBottom: 100 },
  emptyState: {
    alignItems: "center",
    paddingHorizontal: 32,
    paddingTop: 80,
    gap: 12,
  },
  emptyIcon: { fontSize: 56 },
  emptyTitle: { fontSize: 20, fontWeight: "700", textAlign: "center" },
  emptySubtitle: { fontSize: 14, textAlign: "center", lineHeight: 21 },
  emptyButton: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  emptyButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  fab: {
    position: "absolute",
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#6366f1",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: { color: "#fff", fontSize: 28, lineHeight: 32, fontWeight: "300" },
});
