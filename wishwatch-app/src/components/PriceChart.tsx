import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from "react-native";
import { useTheme } from "../hooks/useTheme";
import { RETAILERS } from "../types";
import type { PriceRecord, RetailerId } from "../types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CHART_WIDTH = SCREEN_WIDTH - 48;
const CHART_HEIGHT = 160;
const PADDING = { top: 16, bottom: 32, left: 44, right: 16 };

interface Props {
  prices: PriceRecord[];
}

export function PriceChart({ prices }: Props) {
  const { colors } = useTheme();

  const retailers = useMemo(() => {
    const ids = [...new Set(prices.map((p) => p.retailer))];
    return ids.slice(0, 4); // show max 4 retailers
  }, [prices]);

  const [selectedRetailers, setSelectedRetailers] = useState<Set<RetailerId>>(
    new Set(retailers)
  );

  const chartData = useMemo(() => {
    const filtered = prices.filter((p) => selectedRetailers.has(p.retailer));
    if (filtered.length < 2) return null;

    const sorted = [...filtered].sort(
      (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
    );

    const minPrice = Math.min(...sorted.map((p) => p.price));
    const maxPrice = Math.max(...sorted.map((p) => p.price));
    const priceRange = maxPrice - minPrice || 1;

    const innerW = CHART_WIDTH - PADDING.left - PADDING.right;
    const innerH = CHART_HEIGHT - PADDING.top - PADDING.bottom;

    const minTime = new Date(sorted[0].recordedAt).getTime();
    const maxTime = new Date(sorted[sorted.length - 1].recordedAt).getTime();
    const timeRange = maxTime - minTime || 1;

    const byRetailer: Record<string, { x: number; y: number; price: number; date: string }[]> = {};

    for (const p of sorted) {
      const t = new Date(p.recordedAt).getTime();
      const x = PADDING.left + ((t - minTime) / timeRange) * innerW;
      const y = PADDING.top + ((maxPrice - p.price) / priceRange) * innerH;
      if (!byRetailer[p.retailer]) byRetailer[p.retailer] = [];
      byRetailer[p.retailer].push({ x, y, price: p.price, date: p.recordedAt });
    }

    return {
      byRetailer,
      minPrice,
      maxPrice,
      minTime: sorted[0].recordedAt,
      maxTime: sorted[sorted.length - 1].recordedAt,
    };
  }, [prices, selectedRetailers]);

  const retailerColors = ["#6366f1", "#ec4899", "#f59e0b", "#22c55e"];

  const toggleRetailer = (id: RetailerId) => {
    setSelectedRetailers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size > 1) next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (prices.length < 2) {
    return (
      <View style={[styles.empty, { borderColor: colors.border }]}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          Price history will appear after the second daily scan.
        </Text>
      </View>
    );
  }

  return (
    <View>
      {/* Retailer toggles */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.toggleRow}>
        {retailers.map((rid, i) => {
          const info = RETAILERS[rid];
          const active = selectedRetailers.has(rid);
          const color = retailerColors[i % retailerColors.length];
          return (
            <TouchableOpacity
              key={rid}
              onPress={() => toggleRetailer(rid)}
              style={[
                styles.toggle,
                { borderColor: color, backgroundColor: active ? color + "22" : "transparent" },
              ]}
            >
              <View style={[styles.dot, { backgroundColor: active ? color : colors.border }]} />
              <Text style={[styles.toggleText, { color: active ? color : colors.textTertiary }]}>
                {info?.flag} {info?.name ?? rid}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* SVG-like chart using absolute positioning */}
      {chartData ? (
        <View style={[styles.chartContainer, { borderColor: colors.border }]}>
          <View style={{ width: CHART_WIDTH, height: CHART_HEIGHT }}>
            {/* Y-axis labels */}
            {[0, 0.5, 1].map((t) => {
              const price = chartData.minPrice + t * (chartData.maxPrice - chartData.minPrice);
              const y = PADDING.top + (1 - t) * (CHART_HEIGHT - PADDING.top - PADDING.bottom);
              return (
                <View key={t} style={[styles.gridLine, { top: y, left: PADDING.left, right: PADDING.right }]}>
                  <View style={[styles.gridLineBar, { borderColor: colors.border }]} />
                  <Text style={[styles.yLabel, { color: colors.textTertiary, top: -8 }]}>
                    €{price.toFixed(0)}
                  </Text>
                </View>
              );
            })}

            {/* Lines per retailer */}
            {Object.entries(chartData.byRetailer).map(([rid, points], i) => {
              const color = retailerColors[i % retailerColors.length];
              return points.map((pt, idx) => {
                if (idx === 0) return null;
                const prev = points[idx - 1];
                // Draw a simple dot for each data point
                return (
                  <View
                    key={`${rid}-${idx}`}
                    style={[styles.dataDot, { left: pt.x - 4, top: pt.y - 4, backgroundColor: color }]}
                  />
                );
              });
            })}

            {/* X-axis dates */}
            <Text style={[styles.xLabel, { color: colors.textTertiary, left: PADDING.left }]}>
              {new Date(chartData.minTime).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
            </Text>
            <Text style={[styles.xLabel, styles.xLabelRight, { color: colors.textTertiary, right: PADDING.right }]}>
              {new Date(chartData.maxTime).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    marginVertical: 8,
  },
  emptyText: {
    fontSize: 13,
    textAlign: "center",
  },
  toggleRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  toggle: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 8,
    gap: 5,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  toggleText: {
    fontSize: 11,
    fontWeight: "600",
  },
  chartContainer: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  gridLine: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
  },
  gridLineBar: {
    flex: 1,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderStyle: "dashed",
  },
  yLabel: {
    position: "absolute",
    left: -42,
    fontSize: 10,
    width: 38,
    textAlign: "right",
  },
  dataDot: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  xLabel: {
    position: "absolute",
    bottom: 6,
    fontSize: 10,
  },
  xLabelRight: {
    left: undefined,
  },
});
