import type { PriceRecord } from "@prisma/client";

interface PriceStats {
  avg90: number | null;
  allTimeLow: number | null;
}

/**
 * Compute deal score (0–100) for a given price record.
 *
 * Components:
 *  - 40pts: How far below 90-day average (capped at 40)
 *  - 30pts: Price is at or below all-time low
 *  - 15pts: Free or cheap shipping (≤3 EUR)
 *  - 15pts: In stock
 */
export function computeDealScore(
  record: Pick<PriceRecord, "price" | "shippingCost" | "inStock">,
  stats: PriceStats
): number {
  let score = 0;

  if (stats.avg90 != null && stats.avg90 > 0) {
    const pct = (stats.avg90 - record.price) / stats.avg90;
    if (pct > 0) {
      score += Math.min(pct * 200, 40); // e.g. 20% below avg → 40pts
    }
  }

  if (stats.allTimeLow != null && record.price <= stats.allTimeLow + 0.01) {
    score += 30;
  }

  if (record.shippingCost <= 3) {
    score += 15;
  }

  if (record.inStock) {
    score += 15;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Compute 90-day average price from an array of price records.
 */
export function computeAvg90(records: PriceRecord[]): number | null {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);

  const recent = records.filter((r) => new Date(r.recordedAt) >= cutoff);
  if (recent.length === 0) return null;

  const total = recent.reduce((sum, r) => sum + r.price, 0);
  return total / recent.length;
}

/**
 * Find all-time low price from an array of price records.
 */
export function computeAllTimeLow(records: PriceRecord[]): number | null {
  if (records.length === 0) return null;
  return Math.min(...records.map((r) => r.price));
}
