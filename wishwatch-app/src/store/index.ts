import { create } from "zustand";
import type { AppSettings, WishlistItem } from "../types";

interface AppState {
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => void;

  // Badge count for Deals tab
  dealBadgeCount: number;
  setDealBadgeCount: (count: number) => void;

  // Local optimistic state
  items: WishlistItem[];
  setItems: (items: WishlistItem[]) => void;
}

export const useAppStore = create<AppState>((set) => ({
  settings: {
    shippingDestination: "Barcelona, Spain",
    shippingCity: "Barcelona",
    shippingCountry: "ES",
    dailyScanTime: "08:00",
    theme: "system",
    notificationsEnabled: true,
  },

  updateSettings: (patch) =>
    set((state) => ({ settings: { ...state.settings, ...patch } })),

  dealBadgeCount: 0,
  setDealBadgeCount: (count) => set({ dealBadgeCount: count }),

  items: [],
  setItems: (items) => set({ items }),
}));
