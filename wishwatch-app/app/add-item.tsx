import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useTheme } from "../src/hooks/useTheme";
import { CATEGORY_CONFIG, MAX_WISHLIST_ITEMS } from "../src/constants";
import { api } from "../src/services/api";
import type { Category } from "../src/types";

const CATEGORIES = Object.entries(CATEGORY_CONFIG) as [
  Category,
  typeof CATEGORY_CONFIG[Category]
][];

export default function AddItemScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category>("other");
  const [searchQuery, setSearchQuery] = useState("");
  const [manualUrl, setManualUrl] = useState("");

  const { data: items = [] } = useQuery({
    queryKey: ["items"],
    queryFn: async () => (await api.getItems()).data,
  });

  const addMutation = useMutation({
    mutationFn: api.addItem,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
      router.back();
      // Trigger a scan for the new item after a small delay
      setTimeout(() => api.triggerScrapeItem(res.data.id).catch(() => {}), 2000);
    },
    onError: () => {
      Alert.alert("Error", "Could not add item. Make sure the backend is running.");
    },
  });

  const handleAdd = useCallback(() => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert("Name required", "Please enter a product name.");
      return;
    }
    if (items.length >= MAX_WISHLIST_ITEMS) {
      Alert.alert("Wishlist full", `You can only track up to ${MAX_WISHLIST_ITEMS} items.`);
      return;
    }

    addMutation.mutate({
      name: trimmedName,
      category,
      description: description.trim() || undefined,
      searchQuery: (searchQuery.trim() || trimmedName) || undefined,
    });
  }, [name, description, category, searchQuery, items.length, addMutation]);

  const inputStyle = [styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Add Item</Text>
          <TouchableOpacity
            onPress={handleAdd}
            disabled={addMutation.isPending || !name.trim()}
          >
            {addMutation.isPending ? (
              <ActivityIndicator color="#6366f1" />
            ) : (
              <Text
                style={[
                  styles.addText,
                  { color: name.trim() ? "#6366f1" : colors.textTertiary },
                ]}
              >
                Add
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.form}
          keyboardShouldPersistTaps="handled"
        >
          {/* Product name */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              PRODUCT NAME *
            </Text>
            <TextInput
              style={inputStyle}
              value={name}
              onChangeText={setName}
              placeholder="e.g. PlayStation 5, Nike Air Max 97, iPhone 16 Pro..."
              placeholderTextColor={colors.textTertiary}
              returnKeyType="next"
              autoFocus
            />
          </View>

          {/* Category */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>CATEGORY</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.categoryRow}>
                {CATEGORIES.map(([id, config]) => (
                  <TouchableOpacity
                    key={id}
                    onPress={() => setCategory(id)}
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor:
                          category === id ? config.color : colors.surface,
                        borderColor: category === id ? config.color : colors.border,
                      },
                    ]}
                  >
                    <Text style={styles.categoryIcon}>{config.icon}</Text>
                    <Text
                      style={[
                        styles.categoryLabel,
                        { color: category === id ? "#fff" : colors.textSecondary },
                      ]}
                    >
                      {config.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Description */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              NOTES (optional)
            </Text>
            <TextInput
              style={[inputStyle, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="e.g. Blue, size 42, disc edition..."
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Search hint */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              SEARCH KEYWORDS (optional)
            </Text>
            <TextInput
              style={inputStyle}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Leave blank to use product name"
              placeholderTextColor={colors.textTertiary}
              returnKeyType="done"
            />
            <Text style={[styles.fieldHint, { color: colors.textTertiary }]}>
              Used to search retailers. More specific = better results.
            </Text>
          </View>

          {/* Info box */}
          <View style={[styles.infoBox, { backgroundColor: "#6366f1" + "15", borderColor: "#6366f1" + "40" }]}>
            <Text style={[styles.infoTitle, { color: "#6366f1" }]}>What happens next?</Text>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              We'll immediately scan Amazon.es, Amazon.de/fr/it, MediaMarkt, Zalando, PCComponentes, Fnac, ASOS and more for the best current price.
            </Text>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Prices are then tracked daily. You'll get notified when we find a deal score ≥ 70/100.
            </Text>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTitle: { fontSize: 17, fontWeight: "700" },
  cancelText: { fontSize: 16 },
  addText: { fontSize: 16, fontWeight: "700" },
  form: { padding: 20, gap: 20, paddingBottom: 60 },
  field: { gap: 8 },
  label: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  fieldHint: { fontSize: 11 },
  categoryRow: { flexDirection: "row", gap: 8 },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 22,
    borderWidth: 1,
  },
  categoryIcon: { fontSize: 16 },
  categoryLabel: { fontSize: 13, fontWeight: "600" },
  infoBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 6,
  },
  infoTitle: { fontSize: 13, fontWeight: "700" },
  infoText: { fontSize: 12, lineHeight: 18 },
});
