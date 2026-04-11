export interface ScrapeResult {
  retailer: string;
  productName: string;
  price: number;
  originalPrice?: number;
  currency: string;
  url: string;
  imageUrl?: string;
  inStock: boolean;
  shipsToSpain: boolean;
  shippingCost: number;
}

export interface ScraperOptions {
  query: string;
  maxResults?: number;
}
