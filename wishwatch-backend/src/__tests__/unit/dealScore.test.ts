import {
  computeDealScore,
  computeAvg90,
  computeAllTimeLow,
} from "../../utils/dealScore";
import type { PriceRecord } from "@prisma/client";
import {
  ONEBLADE_CURRENT_PRICES,
  makeHistoricalPrices,
  EXPECTED_AVG90,
  EXPECTED_ATL,
  EXPECTED_DEAL_SCORE_MIN,
} from "../fixtures/oneblade";

// ─── helpers ──────────────────────────────────────────────────────────────────

const FAKE_ID = "fake-item-id";

function makeRecord(
  overrides: Partial<PriceRecord> & { price: number }
): PriceRecord {
  return {
    id: "r1",
    itemId: FAKE_ID,
    retailer: "amazon_es",
    originalPrice: null,
    currency: "EUR",
    url: "https://example.com",
    // Defaults are "worst case" so each test only scores the component under test
    inStock: false,
    shipsToSpain: true,
    shippingCost: 9.99,
    recordedAt: new Date(),
    ...overrides,
  };
}

function makePriceRecords(
  entries: Array<{ price: number; daysAgo: number; retailer?: string }>
): PriceRecord[] {
  return entries.map(({ price, daysAgo, retailer = "amazon_es" }, i) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return makeRecord({ id: `r${i}`, price, retailer, recordedAt: d });
  });
}

// ─── computeDealScore ─────────────────────────────────────────────────────────

describe("computeDealScore", () => {
  describe("average-below component (max 40pts)", () => {
    it("gives 0 pts when no avg90 is available", () => {
      const score = computeDealScore(makeRecord({ price: 20 }), {
        avg90: null,
        allTimeLow: null,
      });
      expect(score).toBe(0);
    });

    it("gives 0 pts when price equals avg90", () => {
      const score = computeDealScore(makeRecord({ price: 30 }), {
        avg90: 30,
        allTimeLow: null,
      });
      expect(score).toBe(0);
    });

    it("gives 0 pts when price is above avg90", () => {
      const score = computeDealScore(makeRecord({ price: 35 }), {
        avg90: 30,
        allTimeLow: null,
      });
      expect(score).toBe(0);
    });

    it("gives proportional pts when price is 10% below avg90", () => {
      // 10% below → pct=0.10 → 0.10*200=20pts
      const score = computeDealScore(makeRecord({ price: 27 }), {
        avg90: 30,
        allTimeLow: null,
      });
      expect(score).toBe(20);
    });

    it("caps avg component at 40 pts (20%+ below avg)", () => {
      // 25% below → pct=0.25 → 0.25*200=50 → capped at 40
      const score = computeDealScore(makeRecord({ price: 22.5 }), {
        avg90: 30,
        allTimeLow: null,
      });
      expect(score).toBe(40);
    });
  });

  describe("all-time-low component (30 pts)", () => {
    it("gives 30 pts when price exactly equals ATL", () => {
      const score = computeDealScore(makeRecord({ price: 24.99 }), {
        avg90: null,
        allTimeLow: 24.99,
      });
      expect(score).toBe(30);
    });

    it("gives 30 pts when price is within €0.01 of ATL", () => {
      const score = computeDealScore(makeRecord({ price: 25.0 }), {
        avg90: null,
        allTimeLow: 24.99,
      });
      expect(score).toBe(30);
    });

    it("gives 0 pts when price is €0.02 above ATL", () => {
      const score = computeDealScore(makeRecord({ price: 25.01 }), {
        avg90: null,
        allTimeLow: 24.99,
      });
      expect(score).toBe(0);
    });

    it("gives 0 pts when ATL is null", () => {
      const score = computeDealScore(makeRecord({ price: 10 }), {
        avg90: null,
        allTimeLow: null,
      });
      expect(score).toBe(0);
    });
  });

  describe("shipping component (15 pts)", () => {
    it("gives 15 pts for free shipping", () => {
      const score = computeDealScore(
        makeRecord({ price: 100, shippingCost: 0 }),
        { avg90: null, allTimeLow: null }
      );
      expect(score).toBe(15);
    });

    it("gives 15 pts for shipping exactly €3", () => {
      const score = computeDealScore(
        makeRecord({ price: 100, shippingCost: 3 }),
        { avg90: null, allTimeLow: null }
      );
      expect(score).toBe(15);
    });

    it("gives 0 pts for shipping of €3.01", () => {
      const score = computeDealScore(
        makeRecord({ price: 100, shippingCost: 3.01 }),
        { avg90: null, allTimeLow: null }
      );
      expect(score).toBe(0);
    });

    it("gives 0 pts for expensive shipping", () => {
      const score = computeDealScore(
        makeRecord({ price: 100, shippingCost: 9.99 }),
        { avg90: null, allTimeLow: null }
      );
      expect(score).toBe(0);
    });
  });

  describe("in-stock component (15 pts)", () => {
    it("gives 15 pts when in stock", () => {
      const score = computeDealScore(
        makeRecord({ price: 100, shippingCost: 9, inStock: true }),
        { avg90: null, allTimeLow: null }
      );
      expect(score).toBe(15);
    });

    it("gives 0 pts when out of stock", () => {
      const score = computeDealScore(
        makeRecord({ price: 100, inStock: false }),
        { avg90: null, allTimeLow: null }
      );
      expect(score).toBe(0);
    });
  });

  describe("combined score", () => {
    it("scores 100 (capped) for a perfect deal", () => {
      // All four components: 40+30+15+15=100
      const score = computeDealScore(
        makeRecord({ price: 15, shippingCost: 0, inStock: true }),
        { avg90: 30, allTimeLow: 15 }
      );
      expect(score).toBe(100);
    });

    it("scores 0 for a new item with no history, paid shipping, out of stock", () => {
      const score = computeDealScore(
        makeRecord({ price: 50, shippingCost: 9.99, inStock: false }),
        { avg90: null, allTimeLow: null }
      );
      expect(score).toBe(0);
    });

    it("Philips OneBlade QP1424 scores above the deal threshold", () => {
      // amazon_es today: €24.99, free ship, in stock
      const best = ONEBLADE_CURRENT_PRICES.find((p) => p.retailer === "amazon_es")!;
      const historicalRecords = makePriceRecords([
        { price: 34.99, daysAgo: 80 },
        { price: 32.99, daysAgo: 60 },
        { price: 30.99, daysAgo: 30 },
        { price: best.price, daysAgo: 0 },
      ]);

      const avg90 = computeAvg90(historicalRecords);
      const allTimeLow = computeAllTimeLow(historicalRecords);

      const score = computeDealScore(
        makeRecord({
          price: best.price,
          shippingCost: best.shippingCost,
          inStock: best.inStock,
        }),
        { avg90, allTimeLow }
      );

      expect(score).toBeGreaterThanOrEqual(EXPECTED_DEAL_SCORE_MIN);
    });

    it("result is always an integer in [0, 100]", () => {
      for (const price of [0.01, 10, 25, 50, 100, 999]) {
        const score = computeDealScore(makeRecord({ price }), {
          avg90: 30,
          allTimeLow: 10,
        });
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
        expect(Number.isInteger(score)).toBe(true);
      }
    });
  });
});

// ─── computeAvg90 ─────────────────────────────────────────────────────────────

describe("computeAvg90", () => {
  it("returns null for empty records", () => {
    expect(computeAvg90([])).toBeNull();
  });

  it("returns null when all records are older than 90 days", () => {
    const old = makePriceRecords([{ price: 30, daysAgo: 91 }]);
    expect(computeAvg90(old)).toBeNull();
  });

  it("includes records exactly 90 days old", () => {
    const records = makePriceRecords([{ price: 30, daysAgo: 90 }]);
    const avg = computeAvg90(records);
    expect(avg).toBeCloseTo(30, 2);
  });

  it("excludes records older than 90 days from the average", () => {
    const records = makePriceRecords([
      { price: 100, daysAgo: 120 }, // older — excluded
      { price: 30, daysAgo: 10 },   // included
      { price: 20, daysAgo: 5 },    // included
    ]);
    expect(computeAvg90(records)).toBeCloseTo(25, 2);
  });

  it("computes correct avg for Philips OneBlade history", () => {
    const historicalRecords = makePriceRecords([
      { price: 34.99, daysAgo: 80 },
      { price: 32.99, daysAgo: 60 },
      { price: 30.99, daysAgo: 30 },
      { price: 24.99, daysAgo: 0 },
    ]);
    const avg = computeAvg90(historicalRecords);
    expect(avg).toBeCloseTo(EXPECTED_AVG90, 1);
  });

  it("handles a single record correctly", () => {
    const records = makePriceRecords([{ price: 29.99, daysAgo: 1 }]);
    expect(computeAvg90(records)).toBeCloseTo(29.99, 2);
  });
});

// ─── computeAllTimeLow ────────────────────────────────────────────────────────

describe("computeAllTimeLow", () => {
  it("returns null for empty records", () => {
    expect(computeAllTimeLow([])).toBeNull();
  });

  it("returns the single record price", () => {
    const records = makePriceRecords([{ price: 24.99, daysAgo: 0 }]);
    expect(computeAllTimeLow(records)).toBe(24.99);
  });

  it("returns the lowest across multiple retailers and dates", () => {
    const records = [
      makeRecord({ id: "a", price: 34.99, retailer: "amazon_es" }),
      makeRecord({ id: "b", price: 24.99, retailer: "mediamarkt" }),
      makeRecord({ id: "c", price: 29.99, retailer: "fnac" }),
    ];
    expect(computeAllTimeLow(records)).toBe(24.99);
  });

  it("includes records older than 90 days (all-time means all-time)", () => {
    const records = makePriceRecords([
      { price: 18.99, daysAgo: 200 }, // old flash sale — still ATL
      { price: 29.99, daysAgo: 10 },
    ]);
    expect(computeAllTimeLow(records)).toBe(18.99);
  });

  it("Philips OneBlade ATL matches expected", () => {
    const records = makeHistoricalPrices(FAKE_ID).concat([
      makeRecord({ price: EXPECTED_ATL, recordedAt: new Date() }),
    ]);
    expect(computeAllTimeLow(records as PriceRecord[])).toBe(EXPECTED_ATL);
  });
});
