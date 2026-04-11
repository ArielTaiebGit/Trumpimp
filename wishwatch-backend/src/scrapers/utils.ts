export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function randomDelay(minMs = 1500, maxMs = 4000): Promise<void> {
  return delay(minMs + Math.random() * (maxMs - minMs));
}

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
