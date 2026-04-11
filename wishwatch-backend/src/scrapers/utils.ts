import axios from "axios";

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
];

export function randomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function randomDelay(minMs = 1500, maxMs = 4000): Promise<void> {
  return delay(minMs + Math.random() * (maxMs - minMs));
}

export const httpClient = axios.create({
  timeout: 15000,
  headers: {
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    Connection: "keep-alive",
    "Upgrade-Insecure-Requests": "1",
  },
});

/** Parse a price string like "€ 29,99" or "29.99" → number */
export function parsePrice(raw: string): number | null {
  if (!raw) return null;
  // Remove currency symbols, keep digits, commas, dots
  const cleaned = raw.replace(/[^0-9,\.]/g, "").trim();
  // Handle European format: 1.299,99 → 1299.99
  let normalised = cleaned;
  if (/\d+\.\d{3}/.test(cleaned)) {
    normalised = cleaned.replace(/\./g, "").replace(",", ".");
  } else {
    normalised = cleaned.replace(",", ".");
  }
  const value = parseFloat(normalised);
  return isNaN(value) ? null : value;
}

/** Convert GBP to EUR (approximate fallback rate) */
export function gbpToEur(gbp: number): number {
  const rate = 1.17; // approximate — in production, fetch live rate
  return Math.round(gbp * rate * 100) / 100;
}
