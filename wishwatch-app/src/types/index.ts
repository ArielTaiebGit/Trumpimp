export type Category =
  | "game"
  | "clothing"
  | "device"
  | "book"
  | "shoes"
  | "other";

export interface WishlistItem {
  id: string;
  userId: string;
  name: string;
  description?: string;
  imageUrl?: string;
  category: Category;
  searchQuery?: string;
  addedAt: string;
  sortOrder: number;
  notifyEnabled: boolean;
  latestPrices?: PriceRecord[];
  bestPrice?: PriceRecord | null;
  dealScore?: number;
  allTimeLow?: number;
  avg90?: number;
}

export interface PriceRecord {
  id: string;
  itemId: string;
  retailer: RetailerId;
  price: number;
  currency: string;
  url: string;
  inStock: boolean;
  shipsToSpain: boolean;
  shippingCost: number;
  recordedAt: string;
}

export type RetailerId =
  | "amazon_es"
  | "amazon_de"
  | "amazon_fr"
  | "amazon_it"
  | "amazon_uk"
  | "zalando_es"
  | "mediamarkt_es"
  | "pccomponentes"
  | "fnac_es"
  | "asos"
  | "game_es"
  | "elcorteingles"
  | "worten_es"
  | "unknown";

export interface RetailerInfo {
  id: RetailerId;
  name: string;
  flag: string;
  color: string;
}

export const RETAILERS: Record<RetailerId, RetailerInfo> = {
  amazon_es: { id: "amazon_es", name: "Amazon.es", flag: "🇪🇸", color: "#FF9900" },
  amazon_de: { id: "amazon_de", name: "Amazon.de", flag: "🇩🇪", color: "#FF9900" },
  amazon_fr: { id: "amazon_fr", name: "Amazon.fr", flag: "🇫🇷", color: "#FF9900" },
  amazon_it: { id: "amazon_it", name: "Amazon.it", flag: "🇮🇹", color: "#FF9900" },
  amazon_uk: { id: "amazon_uk", name: "Amazon.co.uk", flag: "🇬🇧", color: "#FF9900" },
  zalando_es: { id: "zalando_es", name: "Zalando.es", flag: "🇪🇸", color: "#FF6900" },
  mediamarkt_es: { id: "mediamarkt_es", name: "MediaMarkt", flag: "🇪🇸", color: "#CC0000" },
  pccomponentes: { id: "pccomponentes", name: "PCComponentes", flag: "🇪🇸", color: "#E30613" },
  fnac_es: { id: "fnac_es", name: "Fnac.es", flag: "🇪🇸", color: "#F5A623" },
  asos: { id: "asos", name: "ASOS", flag: "🌐", color: "#2D2D2D" },
  game_es: { id: "game_es", name: "GAME.es", flag: "🇪🇸", color: "#E4002B" },
  elcorteingles: { id: "elcorteingles", name: "El Corte Inglés", flag: "🇪🇸", color: "#006600" },
  worten_es: { id: "worten_es", name: "Worten.es", flag: "🇪🇸", color: "#FF0000" },
  unknown: { id: "unknown", name: "Unknown", flag: "🌐", color: "#888888" },
};

export interface DealItem extends WishlistItem {
  dealScore: number;
  bestPrice: PriceRecord;
  savings: number;
  savingsPercent: number;
}

export interface AppSettings {
  shippingDestination: string;
  shippingCity: string;
  shippingCountry: string;
  dailyScanTime: string;
  theme: "light" | "dark" | "system";
  notificationsEnabled: boolean;
}

export interface Stats {
  totalItems: number;
  activeDeals: number;
  totalSavings: number;
  lastScanAt: string | null;
}
