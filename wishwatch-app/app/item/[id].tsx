import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "../../src/hooks/useTheme";
import { DealBadge } from "../../src/components/DealBadge";
import { CategoryBadge } from "../../src/components/CategoryBadge";
import { PriceChart } from "../../src/components/PriceChart";
import { RETAILERS } from "../../src/types";
import { api } from "../../src/services/api";

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [scanning, setScanning] = useState(false);

  const { data: items = [] } = useQuery({
    queryKey: ["items"],
    queryFn: async () => (await api.getItems()).data,
  });

  const item = items.find((i) => i.id === id);

  const { data: priceHistory = [] } = useQuery({
    queryKey: ["prices", id],
    queryFn: async () => (await api.getItemPrices(id!)).data,
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteItem(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
      router.back();
    },
  });

  const handleScanNow = async () => {
    setScanning(true);
    try {
      await api.triggerScrapeItem(id!);
      Alert.alert("Scan Started", "Checking prices for this item. Results will appear shortly.");
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["items"] });
        queryClient.invalidateQueries({ queryKey: ["prices", id] });
        setScanning(false);
      }, 12000);
    } catch {
      setScanning(false);
      Alert.alert("Error", "Scan failed. Make sure the backend is running.");
    }
  };

  if (!item) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color="#6366f1" />
      </View>
    );
  }

  // Group latest prices per retailer (keep only latest per retailer)
  const latestByRetailer = new Map<string, typeof priceHistory[0]>();
  for (const p of [...priceHistory].sort(
    (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
  )) {
    if (!latestByRetailer.has(p.retailer)) latestByRetailer.set(p.retailer, p);
  }
  const retailerPrices = [...latestByRetailer.values()].sort((a, b) => a.price - b.price);

  const savings =
    item.avg90 && item.bestPrice ? Math.max(0, item.avg90 - item.bestPrice.price) : 0;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: 60 }}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={[styles.backText, { color: "#6366f1" }]}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() =>
            Alert.alert("Remove Item", `Remove "${item.name}" from wishlist?`, [
              { text: "Cancel", style: "cancel" },
              { text: "Remove", style: "destructive", onPress: () => deleteMutation.mutate() },
            ])
          }
        >
          <Text style={[styles.deleteText, { color: "#ef4444" }]}>Remove</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Title block */}
        <View style={styles.titleBlock}>
          <View style={styles.badgeRow}>
            <CategoryBadge category={item.category} size="md" />
            {(item.dealScore ?? 0) >= 60 && <DealBadge score={item.dealScore!} size="md" />}
          </View>
          <Text style={[styles.itemName, { color: colors.text }]}>{item.name}</Text>
          {item.description && (
            <Text style={[styles.itemDesc, { color: colors.textSecondary }]}>
              {item.description}
            </Text>
          )}
        </View>

        {/* Best price hero */}
        {item.bestPrice && (
          <View style={[styles.heroCard, { backgroundColor: colors.surface }]}>
            <View style={styles.heroLeft}>
              <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>Best Price</Text>
              <Text style={[styles.heroPrice, { color: colors.text }]}>
                €{item.bestPrice.price.toFixed(2)}
              </Text>
              <Text style={[styles.heroRetailer, { color: colors.textSecondary }]}>
                {RETAILERS[item.bestPrice.retailer]?.flag ?? "🌐"}{" "}
                {RETAILERS[item.bestPrice.retailer]?.name ?? item.bestPrice.retailer}
              </Text>
              {item.bestPrice.shippingCost === 0 ? (
                <Text style={styles.freeShip}>✓ Free shipping</Text>
              ) : (
                <Text style={[styles.shipCost, { color: colors.textSecondary }]}>
                  +€{item.bestPrice.shippingCost.toFixed(2)} shipping
                </Text>
              )}
            </View>

            <View style={styles.heroRight}>
              {savings > 0 && (
                <View style={styles.savingsBadge}>
                  <Text style={styles.savingsText}>-€{savings.toFixed(2)}</Text>
                  <Text style={styles.savingsLabel}>vs 90d avg</Text>
                </View>
              )}
              {item.allTimeLow != null && item.bestPrice.price <= item.allTimeLow + 0.01 && (
                <View style={styles.atlBadge}>
                  <Text style={styles.atlText}>⭐ Best Ever</Text>
                </View>
              )}
              <TouchableOpacity
                onPress={() => Linking.openURL(item.bestPrice!.url)}
                style={styles.buyButton}
              >
                <Text style={styles.buyButtonText}>View Deal →</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Price History Chart */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Price History</Text>
            <TouchableOpacity onPress={handleScanNow} disabled={scanning}>
              <Text style={[styles.scanLink, { color: "#6366f1" }]}>
                {scanning ? "Scanning..." : "Scan now"}
              </Text>
            </TouchableOpacity>
          </View>
          <PriceChart prices={priceHistory} />
        </View>

        {/* Price context */}
        {(item.avg90 != null || item.allTimeLow != null) && (
          <View style={[styles.statsRow, { backgroundColor: colors.surface }]}>
            {item.avg90 != null && (
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  €{item.avg90.toFixed(2)}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textTertiary }]}>90-day avg</Text>
              </View>
            )}
            {item.allTimeLow != null && (
              <View style={[styles.statItem, styles.statItemBorder, { borderColor: colors.border }]}>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  €{item.allTimeLow.toFixed(2)}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textTertiary }]}>All-time low</Text>
              </View>
            )}
            {item.dealScore != null && (
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.text }]}>{item.dealScore}/100</Text>
                <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Deal score</Text>
              </View>
            )}
          </View>
        )}

        {/* All retailer prices */}
        {retailerPrices.length > 0 && (
          <View style={styles.sectionBlock}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>All Prices</Text>
            <View style={[styles.retailerTable, { backgroundColor: colors.surface }]}>
              {retailerPrices.map((p, idx) => {
                const info = RETAILERS[p.retailer];
                const isFirst = idx === 0;
                return (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => Linking.openURL(p.url)}
                    activeOpacity={0.7}
                    style={[
                      styles.retailerRow,
                      { borderBottomColor: colors.border },
                      idx < retailerPrices.length - 1 && styles.retailerRowBorder,
                    ]}
                  >
                    <View style={styles.retailerLeft}>
                      <Text style={styles.retailerFlag}>{info?.flag ?? "🌐"}</Text>
                      <View>
                        <Text style={[styles.retailerName, { color: colors.text }]}>
                          {info?.name ?? p.retailer}
                        </Text>
                        <Text style={[styles.retailerMeta, { color: colors.textTertiary }]}>
                          {p.inStock ? "In Stock" : "Out of Stock"} ·{" "}
                          {p.shippingCost === 0 ? "Free shipping" : `+€${p.shippingCost.toFixed(2)}`}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.retailerRight}>
                      <Text
                        style={[
                          styles.retailerPrice,
                          { color: isFirst ? "#6366f1" : colors.text },
                          isFirst && styles.bestPrice,
                        ]}
                      >
                        €{p.price.toFixed(2)}
                      </Text>
                      {!p.inStock && (
                        <Text style={styles.oos}>Unavailable</Text>
                      )}
                      {isFirst && p.inStock && (
                        <Text style={styles.bestLabel}>Best</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backButton: { padding: 8 },
  backText: { fontSize: 16, fontWeight: "600" },
  deleteText: { fontSize: 14, fontWeight: "600", padding: 8 },
  content: { paddingHorizontal: 16, gap: 16 },
  titleBlock: { gap: 8 },
  badgeRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  itemName: { fontSize: 22, fontWeight: "800", lineHeight: 28 },
  itemDesc: { fontSize: 14, lineHeight: 20 },
  heroCard: {
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  heroLeft: { gap: 4 },
  heroLabel: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  heroPrice: { fontSize: 32, fontWeight: "800" },
  heroRetailer: { fontSize: 13 },
  freeShip: { fontSize: 11, color: "#22c55e", fontWeight: "600" },
  shipCost: { fontSize: 11 },
  heroRight: { alignItems: "flex-end", gap: 8 },
  savingsBadge: {
    backgroundColor: "#dcfce7",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: "center",
  },
  savingsText: { fontSize: 16, fontWeight: "800", color: "#16a34a" },
  savingsLabel: { fontSize: 10, color: "#166534" },
  atlBadge: {
    backgroundColor: "#fef3c7",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  atlText: { fontSize: 11, fontWeight: "700", color: "#92400e" },
  buyButton: {
    backgroundColor: "#6366f1",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 4,
  },
  buyButtonText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  sectionBlock: { gap: 12 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { fontSize: 17, fontWeight: "700" },
  scanLink: { fontSize: 13, fontWeight: "600" },
  statsRow: {
    flexDirection: "row",
    borderRadius: 16,
    overflow: "hidden",
  },
  statItem: { flex: 1, padding: 14, alignItems: "center" },
  statItemBorder: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  statValue: { fontSize: 17, fontWeight: "700" },
  statLabel: { fontSize: 11, marginTop: 2 },
  retailerTable: { borderRadius: 16, overflow: "hidden" },
  retailerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
  },
  retailerRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth },
  retailerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  retailerFlag: { fontSize: 22 },
  retailerName: { fontSize: 14, fontWeight: "600" },
  retailerMeta: { fontSize: 11, marginTop: 1 },
  retailerRight: { alignItems: "flex-end", gap: 2 },
  retailerPrice: { fontSize: 17, fontWeight: "600" },
  bestPrice: { fontWeight: "800" },
  oos: { fontSize: 10, color: "#ef4444" },
  bestLabel: { fontSize: 10, color: "#6366f1", fontWeight: "700" },
});
