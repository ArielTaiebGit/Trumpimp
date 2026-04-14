import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "../hooks/useTheme";
import { DealBadge } from "./DealBadge";
import { CategoryBadge } from "./CategoryBadge";
import { RETAILERS } from "../types";
import type { WishlistItem } from "../types";

interface Props {
  item: WishlistItem;
}

export function WishlistCard({ item }: Props) {
  const router = useRouter();
  const { colors } = useTheme();

  const best = item.bestPrice;
  const dealScore = item.dealScore ?? 0;
  const shopCount = item.shopCount ?? item.latestPrices?.length ?? 0;
  const isScanning = item.isScanning ?? false;
  const hasNoPrices = shopCount === 0;

  // Pulsing animation while scanning
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (isScanning || hasNoPrices) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.35, duration: 650, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 650, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isScanning, hasNoPrices]);

  const handlePress = () => router.push(`/item/${item.id}`);

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.85}
      style={[styles.card, { backgroundColor: colors.surface, shadowColor: colors.cardShadow }]}
    >
      {/* Image */}
      <View style={[styles.imageContainer, { backgroundColor: colors.surfaceSecondary }]}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.image} />
        ) : (
          <Text style={styles.imagePlaceholder}>
            {item.category === "game" ? "🎮" :
             item.category === "clothing" ? "👕" :
             item.category === "device" ? "📱" :
             item.category === "book" ? "📚" :
             item.category === "shoes" ? "👟" : "🛍️"}
          </Text>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.topRow}>
          <CategoryBadge category={item.category} />
          {dealScore >= 60 && <DealBadge score={dealScore} size="sm" />}
        </View>

        <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
          {item.name}
        </Text>

        {best ? (
          <View style={styles.priceRow}>
            <View>
              <Text style={[styles.price, { color: colors.text }]}>
                €{best.price.toFixed(2)}
              </Text>
              <Text style={[styles.retailer, { color: colors.textSecondary }]}>
                {RETAILERS[best.retailer]?.flag ?? "🌐"} {RETAILERS[best.retailer]?.name ?? best.retailer}
              </Text>
            </View>

            <View style={styles.priceInfo}>
              {best.shippingCost === 0 ? (
                <Text style={styles.freeShipping}>Free shipping</Text>
              ) : (
                <Text style={[styles.shippingCost, { color: colors.textSecondary }]}>
                  +€{best.shippingCost.toFixed(2)} ship
                </Text>
              )}
              {!best.inStock && (
                <Text style={styles.outOfStock}>Out of stock</Text>
              )}
            </View>
          </View>
        ) : (
          <Animated.View style={{ opacity: pulseAnim }}>
            <Text style={[styles.scanning, { color: colors.textTertiary }]}>
              {isScanning ? "🔍 Scanning prices…" : "⏳ Waiting to scan…"}
            </Text>
          </Animated.View>
        )}

        {/* Bottom row: ATL badge + shop count */}
        <View style={styles.bottomRow}>
          {item.allTimeLow != null && best && best.price <= item.allTimeLow + 0.01 && (
            <View style={styles.atlBadge}>
              <Text style={styles.atlText}>⭐ Best Price Ever</Text>
            </View>
          )}
          {shopCount > 0 && (
            <View style={[styles.shopBadge, { backgroundColor: colors.surfaceSecondary }]}>
              <Text style={[styles.shopText, { color: colors.textSecondary }]}>
                🏪 {shopCount} {shopCount === 1 ? "shop" : "shops"}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={[styles.chevron]}>
        <Text style={[styles.chevronText, { color: colors.textTertiary }]}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 12,
    alignItems: "center",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  imageContainer: {
    width: 72,
    height: 72,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  image: {
    width: 72,
    height: 72,
    resizeMode: "cover",
  },
  imagePlaceholder: {
    fontSize: 32,
  },
  content: {
    flex: 1,
    marginLeft: 12,
    gap: 4,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  name: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 19,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  price: {
    fontSize: 18,
    fontWeight: "700",
  },
  retailer: {
    fontSize: 11,
    marginTop: 1,
  },
  priceInfo: {
    alignItems: "flex-end",
    gap: 2,
  },
  freeShipping: {
    fontSize: 10,
    color: "#22c55e",
    fontWeight: "600",
  },
  shippingCost: {
    fontSize: 10,
  },
  outOfStock: {
    fontSize: 10,
    color: "#ef4444",
    fontWeight: "600",
  },
  scanning: {
    fontSize: 12,
    fontStyle: "italic",
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  atlBadge: {
    backgroundColor: "#fef3c7",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  atlText: {
    fontSize: 10,
    color: "#92400e",
    fontWeight: "600",
  },
  shopBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  shopText: {
    fontSize: 10,
    fontWeight: "500",
  },
  chevron: {
    paddingLeft: 8,
  },
  chevronText: {
    fontSize: 24,
    fontWeight: "300",
  },
});
