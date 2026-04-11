import { create } from "zustand";
import type { AppSettings, WishlistItem } from "../types";

interface AppState {
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => void;

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

  items: [],
  setItems: (items) => set({ items }),
}));
