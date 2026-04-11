// In dev, derive the backend host from Expo's own host URI so it works
// on a real device without manually editing IPs.
// e.g. Expo serves from 192.168.1.42:8081 → backend is 192.168.1.42:3000
function resolveApiUrl(): string {
  if (!__DEV__) return "https://your-wishwatch-backend.com/api";
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Constants = require("expo-constants").default;
    const hostUri: string | undefined =
      Constants.expoConfig?.hostUri ?? Constants.manifest?.debuggerHost;
    if (hostUri) {
      const host = hostUri.split(":")[0];
      return `http://${host}:3000/api`;
    }
  } catch {}
  // Fallback to known local IP
  return "http://192.168.0.15:3000/api";
}

export const API_BASE_URL = resolveApiUrl();

export const DEAL_SCORE_THRESHOLD = 60;
export const DEAL_SCORE_NOTIFY_THRESHOLD = 70;
export const MAX_WISHLIST_ITEMS = 20;

export const CATEGORY_CONFIG = {
  game: { label: "Game", icon: "🎮", color: "#6366f1" },
  clothing: { label: "Clothing", icon: "👕", color: "#ec4899" },
  device: { label: "Device", icon: "📱", color: "#0ea5e9" },
  book: { label: "Book", icon: "📚", color: "#f59e0b" },
  shoes: { label: "Shoes", icon: "👟", color: "#14b8a6" },
  other: { label: "Other", icon: "🛍️", color: "#8b5cf6" },
} as const;

export const COLORS = {
  primary: "#6366f1",
  primaryDark: "#4f46e5",
  secondary: "#ec4899",
  success: "#22c55e",
  warning: "#f59e0b",
  danger: "#ef4444",
  dealGold: "#f59e0b",
  dealGreen: "#22c55e",

  // Light theme
  light: {
    background: "#f8fafc",
    surface: "#ffffff",
    surfaceSecondary: "#f1f5f9",
    text: "#0f172a",
    textSecondary: "#64748b",
    textTertiary: "#94a3b8",
    border: "#e2e8f0",
    cardShadow: "rgba(0,0,0,0.06)",
  },

  // Dark theme
  dark: {
    background: "#0f172a",
    surface: "#1e293b",
    surfaceSecondary: "#334155",
    text: "#f8fafc",
    textSecondary: "#94a3b8",
    textTertiary: "#64748b",
    border: "#334155",
    cardShadow: "rgba(0,0,0,0.3)",
  },
};
