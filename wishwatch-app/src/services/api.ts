import axios from "axios";
import { API_BASE_URL } from "../constants";
import type { WishlistItem, PriceRecord, DealItem, Stats } from "../types";

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

// Attach device ID to every request
client.interceptors.request.use(async (config) => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const SecureStore = require("expo-secure-store");
    const deviceId = await SecureStore.getItemAsync("device_id");
    if (deviceId) config.headers["x-device-id"] = deviceId;
  } catch {}
  return config;
});

export const api = {
  // Health
  health: () => client.get<{ status: string; timestamp: string }>("/health"),

  // Stats
  getStats: () => client.get<Stats>("/stats"),

  // Wishlist
  getItems: () => client.get<WishlistItem[]>("/items"),

  addItem: (data: {
    name: string;
    category: string;
    description?: string;
    imageUrl?: string;
    searchQuery?: string;
  }) => client.post<WishlistItem>("/items", data),

  updateItem: (
    id: string,
    data: Partial<Pick<WishlistItem, "name" | "sortOrder" | "notifyEnabled">>
  ) => client.patch<WishlistItem>(`/items/${id}`, data),

  deleteItem: (id: string) => client.delete(`/items/${id}`),

  // Prices
  getItemPrices: (id: string) =>
    client.get<PriceRecord[]>(`/items/${id}/prices`),

  // Deals
  getDeals: () => client.get<DealItem[]>("/deals"),

  // Scraping
  triggerScrapeItem: (id: string) =>
    client.post<{ message: string; queued: boolean }>(`/scrape/item/${id}`),

  triggerScrapeAll: () =>
    client.post<{ message: string }>("/scrape/all"),

  // Search (product search to help add items)
  searchProducts: (query: string) =>
    client.get<{ name: string; imageUrl: string; retailer: string; price: number; url: string }[]>(
      `/search?q=${encodeURIComponent(query)}`
    ),

  // Notifications
  registerPushToken: (token: string) =>
    client.post("/notifications/register", { token }),
};
