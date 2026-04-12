/**
 * Integration tests: /api/deals
 *
 * Verifies the deals feed only surfaces items scoring ≥ DEAL_SCORE_BADGE_THRESHOLD
 * and sorts them highest-score first.
 */
import request from "supertest";
import { prisma } from "../../db";
import { createTestApp, clearDatabase, disconnectDb, DEVICE } from "../helpers";
import {
  ONEBLADE_ITEM,
  ONEBLADE_CURRENT_PRICES,
  makeHistoricalPrices,
  EXPECTED_DEAL_SCORE_MIN,
} from "../fixtures/oneblade";
import { DEAL_SCORE_BADGE_THRESHOLD } from "../../utils/constants";

const app = createTestApp();

beforeEach(async () => {
  await clearDatabase();
});

afterAll(async () => {
  await disconnectDb();
});

// ─── helpers ──────────────────────────────────────────────────────────────────

async function addOnebladeWithFullHistory(): Promise<string> {
  const res = await request(app)
    .post("/api/items")
    .set("x-device-id", DEVICE.alice)
    .send(ONEBLADE_ITEM);

  const itemId: string = res.body.id;

  await prisma.priceRecord.createMany({
    data: [
      ...makeHistoricalPrices(itemId),
      ...ONEBLADE_CURRENT_PRICES.map((p) => ({ ...p, itemId })),
    ],
  });

  return itemId;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GET /api/deals — empty wishlist", () => {
  it("returns 200 with empty array", async () => {
    const res = await request(app)
      .get("/api/deals")
      .set("x-device-id", DEVICE.alice);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe("GET /api/deals — item with no prices", () => {
  it("does not appear in deals feed", async () => {
    await request(app)
      .post("/api/items")
      .set("x-device-id", DEVICE.alice)
      .send(ONEBLADE_ITEM);

    const res = await request(app)
      .get("/api/deals")
      .set("x-device-id", DEVICE.alice);

    expect(res.body).toHaveLength(0);
  });
});

describe("GET /api/deals — Philips OneBlade with full price history", () => {
  it("appears in the deals feed", async () => {
    await addOnebladeWithFullHistory();

    const res = await request(app)
      .get("/api/deals")
      .set("x-device-id", DEVICE.alice);

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);

    const deal = res.body.find(
      (d: { name: string }) => d.name === ONEBLADE_ITEM.name
    );
    expect(deal).toBeDefined();
  });

  it("deal has score above the deal threshold", async () => {
    await addOnebladeWithFullHistory();

    const res = await request(app)
      .get("/api/deals")
      .set("x-device-id", DEVICE.alice);

    const deal = res.body[0];
    expect(deal.dealScore).toBeGreaterThanOrEqual(EXPECTED_DEAL_SCORE_MIN);
  });

  it("deal includes savings and savingsPercent", async () => {
    await addOnebladeWithFullHistory();

    const res = await request(app)
      .get("/api/deals")
      .set("x-device-id", DEVICE.alice);

    const deal = res.body[0];
    expect(deal.savings).toBeGreaterThan(0);
    expect(deal.savingsPercent).toBeGreaterThan(0);
    expect(deal.savingsPercent).toBeLessThanOrEqual(100);
  });

  it("deal includes bestPrice with retailer and URL", async () => {
    await addOnebladeWithFullHistory();

    const res = await request(app)
      .get("/api/deals")
      .set("x-device-id", DEVICE.alice);

    const deal = res.body[0];
    expect(deal.bestPrice).toBeDefined();
    expect(deal.bestPrice.retailer).toBe("amazon_es");
    expect(deal.bestPrice.url).toContain("amazon.es");
    expect(deal.bestPrice.price).toBe(24.99);
  });
});

describe("GET /api/deals — threshold filtering", () => {
  it("excludes item scoring below the badge threshold", async () => {
    // Item with prices but no history → score = 15(ship) + 15(stock) = 30 < 60
    const res1 = await request(app)
      .post("/api/items")
      .set("x-device-id", DEVICE.alice)
      .send({ name: "Low-score Item", category: "other" });

    await prisma.priceRecord.create({
      data: {
        itemId: res1.body.id,
        retailer: "amazon_es",
        price: 100,
        currency: "EUR",
        url: "https://amazon.es/test",
        inStock: true,
        shipsToSpain: true,
        shippingCost: 0,
      },
    });

    const res = await request(app)
      .get("/api/deals")
      .set("x-device-id", DEVICE.alice);

    // Score of 30 < DEAL_SCORE_BADGE_THRESHOLD (60) → should not appear
    expect(res.body).toHaveLength(0);
  });
});

describe("GET /api/deals — sorting", () => {
  it("returns deals sorted by deal score descending", async () => {
    // Add two items; OneBlade should score much higher
    await addOnebladeWithFullHistory();

    const res2 = await request(app)
      .post("/api/items")
      .set("x-device-id", DEVICE.alice)
      .send({ name: "Medium-deal Item", category: "other" });

    // Give it enough history to barely clear the threshold
    const mediumId = res2.body.id;
    const daysAgo = (n: number) => {
      const d = new Date();
      d.setDate(d.getDate() - n);
      return d;
    };
    await prisma.priceRecord.createMany({
      data: [
        { itemId: mediumId, retailer: "amazon_es", price: 80, currency: "EUR", url: "https://amazon.es/medium", inStock: true, shipsToSpain: true, shippingCost: 0, recordedAt: daysAgo(60) },
        { itemId: mediumId, retailer: "amazon_es", price: 50, currency: "EUR", url: "https://amazon.es/medium", inStock: true, shipsToSpain: true, shippingCost: 0, recordedAt: daysAgo(0) },
      ],
    });

    const res = await request(app)
      .get("/api/deals")
      .set("x-device-id", DEVICE.alice);

    const scores = res.body.map((d: { dealScore: number }) => d.dealScore);
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeLessThanOrEqual(scores[i - 1]);
    }
  });
});

describe("GET /api/deals — device isolation", () => {
  it("Bob cannot see Alice's deals", async () => {
    await addOnebladeWithFullHistory();

    const res = await request(app)
      .get("/api/deals")
      .set("x-device-id", DEVICE.bob);

    expect(res.body).toHaveLength(0);
  });
});
