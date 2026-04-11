import React from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
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
          <Text style={[styles.noPrice, { color: colors.textTertiary }]}>
            Scanning prices...
          </Text>
        )}

        {item.allTimeLow != null && best && best.price <= item.allTimeLow + 0.01 && (
          <View style={styles.atlBadge}>
            <Text style={styles.atlText}>⭐ Best Price Ever</Text>
          </View>
        )}
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
  noPrice: {
    fontSize: 12,
    fontStyle: "italic",
  },
  atlBadge: {
    backgroundColor: "#fef3c7",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: "flex-start",
  },
  atlText: {
    fontSize: 10,
    color: "#92400e",
    fontWeight: "600",
  },
  chevron: {
    paddingLeft: 8,
  },
  chevronText: {
    fontSize: 24,
    fontWeight: "300",
  },
});
