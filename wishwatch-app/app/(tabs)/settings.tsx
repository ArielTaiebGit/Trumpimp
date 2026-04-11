import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "../../src/hooks/useTheme";
import { useAppStore } from "../../src/store";
import { api } from "../../src/services/api";
import type { AppSettings } from "../../src/types";

type ThemeOption = AppSettings["theme"];

const THEME_OPTIONS: { value: ThemeOption; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { settings, updateSettings } = useAppStore();
  const queryClient = useQueryClient();

  const scanAllMutation = useMutation({
    mutationFn: api.triggerScrapeAll,
    onSuccess: () => {
      Alert.alert("Scan Started", "Full price scan started across all items and retailers.");
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ["items"] }), 15000);
    },
    onError: () => Alert.alert("Error", "Could not start scan. Is the backend running?"),
  });

  const Row = ({
    label,
    children,
    subtitle,
  }: {
    label: string;
    children: React.ReactNode;
    subtitle?: string;
  }) => (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <View style={styles.rowLabel}>
        <Text style={[styles.rowLabelText, { color: colors.text }]}>{label}</Text>
        {subtitle && <Text style={[styles.rowSubtitle, { color: colors.textTertiary }]}>{subtitle}</Text>}
      </View>
      {children}
    </View>
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: 60 }}
    >
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>
      </View>

      {/* Shipping */}
      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>SHIPPING</Text>
        <Row label="Destination" subtitle="Used for shipping availability checks">
          <Text style={[styles.valueText, { color: colors.textSecondary }]}>
            🇪🇸 {settings.shippingDestination}
          </Text>
        </Row>
      </View>

      {/* Appearance */}
      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>APPEARANCE</Text>
        <Row label="Theme">
          <View style={styles.themeOptions}>
            {THEME_OPTIONS.map(({ value, label }) => (
              <TouchableOpacity
                key={value}
                onPress={() => updateSettings({ theme: value })}
                style={[
                  styles.themeOption,
                  {
                    backgroundColor:
                      settings.theme === value ? "#6366f1" : colors.surfaceSecondary,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.themeOptionText,
                    { color: settings.theme === value ? "#fff" : colors.textSecondary },
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Row>
      </View>

      {/* Notifications */}
      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>NOTIFICATIONS</Text>
        <Row label="Price Drop Alerts" subtitle="Notify when deal score ≥ 70">
          <Switch
            value={settings.notificationsEnabled}
            onValueChange={(val) => updateSettings({ notificationsEnabled: val })}
            trackColor={{ false: colors.border, true: "#6366f1" }}
            thumbColor="#fff"
          />
        </Row>
      </View>

      {/* Scan */}
      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>PRICE SCANNING</Text>
        <Row label="Daily Scan Time" subtitle="Runs automatically in the background">
          <Text style={[styles.valueText, { color: colors.textSecondary }]}>
            🕗 {settings.dailyScanTime} CET
          </Text>
        </Row>
        <View style={[styles.row, { borderBottomColor: colors.border }]}>
          <View style={styles.rowLabel}>
            <Text style={[styles.rowLabelText, { color: colors.text }]}>Manual Scan</Text>
            <Text style={[styles.rowSubtitle, { color: colors.textTertiary }]}>
              Trigger a full scan right now
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => scanAllMutation.mutate()}
            disabled={scanAllMutation.isPending}
            style={[styles.scanButton, { backgroundColor: "#6366f1" }]}
          >
            <Text style={styles.scanButtonText}>
              {scanAllMutation.isPending ? "Scanning..." : "Scan Now"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Retailers */}
      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>RETAILERS TRACKED</Text>
        {[
          "🇪🇸 Amazon.es · Amazon.de · Amazon.fr · Amazon.it",
          "🇬🇧 Amazon.co.uk",
          "🇪🇸 MediaMarkt · PCComponentes · Fnac.es",
          "🇪🇸 Zalando.es · ASOS",
          "🇪🇸 GAME.es · El Corte Inglés · Worten.es",
        ].map((line, i) => (
          <View key={i} style={[styles.retailerRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.retailerText, { color: colors.textSecondary }]}>{line}</Text>
          </View>
        ))}
      </View>

      {/* About */}
      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>ABOUT</Text>
        <Row label="Version">
          <Text style={[styles.valueText, { color: colors.textTertiary }]}>1.0.0</Text>
        </Row>
        <Row label="Built with">
          <Text style={[styles.valueText, { color: colors.textTertiary }]}>BMAD + Claude</Text>
        </Row>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerTitle: { fontSize: 26, fontWeight: "800", letterSpacing: -0.5 },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    overflow: "hidden",
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: { flex: 1, marginRight: 12 },
  rowLabelText: { fontSize: 15, fontWeight: "500" },
  rowSubtitle: { fontSize: 11, marginTop: 2 },
  valueText: { fontSize: 14 },
  themeOptions: { flexDirection: "row", gap: 6 },
  themeOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  themeOptionText: { fontSize: 12, fontWeight: "600" },
  scanButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  scanButtonText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  retailerRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  retailerText: { fontSize: 13 },
});
