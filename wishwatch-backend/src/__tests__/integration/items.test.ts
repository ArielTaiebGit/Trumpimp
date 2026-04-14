/**
 * Integration tests: /api/items
 *
 * Simulates a user adding the Philips OneBlade Face QP1424/10 to their
 * wishlist, updating it, viewing enriched data, and removing it.
 *
 * The test database is created once in globalSetup and wiped between tests.
 */
import request from "supertest";
import { prisma } from "../../db";
import {
  createTestApp,
  clearDatabase,
  disconnectDb,
  DEVICE,
} from "../helpers";
import {
  ONEBLADE_ITEM,
  ONEBLADE_CURRENT_PRICES,
  makeHistoricalPrices,
  EXPECTED_DEAL_SCORE_MIN,
} from "../fixtures/oneblade";

const app = createTestApp();

beforeEach(async () => {
  await clearDatabase();
});

afterAll(async () => {
  await disconnectDb();
});

// ─── Wishlist CRUD ────────────────────────────────────────────────────────────

describe("GET /api/items — empty wishlist", () => {
  it("returns 200 with an empty array", async () => {
    const res = await request(app)
      .get("/api/items")
      .set("x-device-id", DEVICE.alice);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("devices are isolated: Bob cannot see Alice's items", async () => {
    // Alice adds an item
    await request(app)
      .post("/api/items")
      .set("x-device-id", DEVICE.alice)
      .send(ONEBLADE_ITEM);

    // Bob should see nothing
    const res = await request(app)
      .get("/api/items")
      .set("x-device-id", DEVICE.bob);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });
});

describe("POST /api/items — adding Philips OneBlade QP1424/10", () => {
  it("creates item and returns 201 with full item object", async () => {
    const res = await request(app)
      .post("/api/items")
      .set("x-device-id", DEVICE.alice)
      .send(ONEBLADE_ITEM);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      name: ONEBLADE_ITEM.name,
      category: ONEBLADE_ITEM.category,
      searchQuery: ONEBLADE_ITEM.searchQuery,
      description: ONEBLADE_ITEM.description,
    });
    expect(res.body.id).toBeDefined();
    expect(res.body.addedAt).toBeDefined();
  });

  it("item shows in GET /api/items immediately after creation", async () => {
    await request(app)
      .post("/api/items")
      .set("x-device-id", DEVICE.alice)
      .send(ONEBLADE_ITEM);

    const res = await request(app)
      .get("/api/items")
      .set("x-device-id", DEVICE.alice);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe(ONEBLADE_ITEM.name);
  });

  it("newly-added item has no prices yet (shows as scanning)", async () => {
    await request(app)
      .post("/api/items")
      .set("x-device-id", DEVICE.alice)
      .send(ONEBLADE_ITEM);

    const res = await request(app)
      .get("/api/items")
      .set("x-device-id", DEVICE.alice);

    const item = res.body[0];
    expect(item.latestPrices).toHaveLength(0);
    expect(item.bestPrice).toBeNull();
    expect(item.dealScore).toBe(0);
    expect(item.avg90).toBeNull();
    expect(item.allTimeLow).toBeNull();
  });

  it("defaults category to 'other' when not provided", async () => {
    const res = await request(app)
      .post("/api/items")
      .set("x-device-id", DEVICE.alice)
      .send({ name: "No-category item" });

    expect(res.status).toBe(201);
    expect(res.body.category).toBe("other");
  });

  it("uses name as searchQuery when searchQuery is omitted", async () => {
    const res = await request(app)
      .post("/api/items")
      .set("x-device-id", DEVICE.alice)
      .send({ name: "Fallback Query Item" });

    expect(res.status).toBe(201);
    expect(res.body.searchQuery).toBe("Fallback Query Item");
  });

  it("rejects empty name with 400", async () => {
    const res = await request(app)
      .post("/api/items")
      .set("x-device-id", DEVICE.alice)
      .send({ name: "" });

    expect(res.status).toBe(400);
  });

  it("rejects invalid category with 400", async () => {
    const res = await request(app)
      .post("/api/items")
      .set("x-device-id", DEVICE.alice)
      .send({ name: "Widget", category: "spaceship" });

    expect(res.status).toBe(400);
  });

  it("enforces 20-item wishlist cap", async () => {
    // Fill to the limit
    for (let i = 1; i <= 20; i++) {
      await request(app)
        .post("/api/items")
        .set("x-device-id", DEVICE.alice)
        .send({ name: `Item ${i}` });
    }

    const res = await request(app)
      .post("/api/items")
      .set("x-device-id", DEVICE.alice)
      .send({ name: "Item 21 — over the limit" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/full/i);
  });
});

describe("PATCH /api/items/:id", () => {
  let itemId: string;

  beforeEach(async () => {
    const res = await request(app)
      .post("/api/items")
      .set("x-device-id", DEVICE.alice)
      .send(ONEBLADE_ITEM);
    itemId = res.body.id;
  });

  it("updates item name", async () => {
    const res = await request(app)
      .patch(`/api/items/${itemId}`)
      .set("x-device-id", DEVICE.alice)
      .send({ name: "Philips OneBlade Face QP1424/10 (updated)" });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Philips OneBlade Face QP1424/10 (updated)");
  });

  it("updates notifyEnabled", async () => {
    const res = await request(app)
      .patch(`/api/items/${itemId}`)
      .set("x-device-id", DEVICE.alice)
      .send({ notifyEnabled: false });

    expect(res.status).toBe(200);
    expect(res.body.notifyEnabled).toBe(false);
  });

  it("returns 404 for unknown id", async () => {
    const res = await request(app)
      .patch("/api/items/nonexistent-id")
      .set("x-device-id", DEVICE.alice)
      .send({ name: "Ghost" });

    expect(res.status).toBe(404);
  });

  it("Bob cannot update Alice's item", async () => {
    const res = await request(app)
      .patch(`/api/items/${itemId}`)
      .set("x-device-id", DEVICE.bob)
      .send({ name: "Hijacked" });

    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/items/:id", () => {
  let itemId: string;

  beforeEach(async () => {
    const res = await request(app)
      .post("/api/items")
      .set("x-device-id", DEVICE.alice)
      .send(ONEBLADE_ITEM);
    itemId = res.body.id;
  });

  it("deletes the item and returns {success:true}", async () => {
    const res = await request(app)
      .delete(`/api/items/${itemId}`)
      .set("x-device-id", DEVICE.alice);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("item no longer appears in GET /api/items after deletion", async () => {
    await request(app)
      .delete(`/api/items/${itemId}`)
      .set("x-device-id", DEVICE.alice);

    const res = await request(app)
      .get("/api/items")
      .set("x-device-id", DEVICE.alice);

    expect(res.body).toHaveLength(0);
  });

  it("associated price records are cascade-deleted", async () => {
    // Insert a price record
    await prisma.priceRecord.create({
      data: {
        itemId,
        retailer: "amazon_es",
        price: 24.99,
        currency: "EUR",
        url: "https://amazon.es/test",
        inStock: true,
        shipsToSpain: true,
        shippingCost: 0,
      },
    });

    await request(app)
      .delete(`/api/items/${itemId}`)
      .set("x-device-id", DEVICE.alice);

    const records = await prisma.priceRecord.findMany({ where: { itemId } });
    expect(records).toHaveLength(0);
  });

  it("returns 404 for unknown id", async () => {
    const res = await request(app)
      .delete("/api/items/nonexistent-id")
      .set("x-device-id", DEVICE.alice);

    expect(res.status).toBe(404);
  });
});

// ─── Enriched data after scrape ───────────────────────────────────────────────

describe("GET /api/items — enriched price data", () => {
  let itemId: string;

  beforeEach(async () => {
    const createRes = await request(app)
      .post("/api/items")
      .set("x-device-id", DEVICE.alice)
      .send(ONEBLADE_ITEM);
    itemId = createRes.body.id;

    // Seed current prices directly into DB (simulates post-scrape state)
    // Strip imageUrl — it's a scraper field not present in PriceRecord schema
    await prisma.priceRecord.createMany({
      data: ONEBLADE_CURRENT_PRICES.map(({ imageUrl: _img, ...p }) => ({ ...p, itemId })),
    });
  });

  it("returns latestPrices with one record per retailer", async () => {
    const res = await request(app)
      .get("/api/items")
      .set("x-device-id", DEVICE.alice);

    const item = res.body[0];
    expect(item.latestPrices).toHaveLength(3);

    const retailers = item.latestPrices.map((p: { retailer: string }) => p.retailer);
    expect(retailers).toContain("amazon_es");
    expect(retailers).toContain("mediamarkt");
    expect(retailers).toContain("pccomponentes");
  });

  it("bestPrice is the cheapest in-stock option shipping to Spain", async () => {
    const res = await request(app)
      .get("/api/items")
      .set("x-device-id", DEVICE.alice);

    const item = res.body[0];
    // amazon_es: €24.99 free ship in-stock → winner
    // pccomponentes: €27.50 but out-of-stock → excluded from best
    // mediamarkt: €29.99 free ship → second-best
    expect(item.bestPrice.retailer).toBe("amazon_es");
    expect(item.bestPrice.price).toBe(24.99);
    expect(item.bestPrice.shippingCost).toBe(0);
  });

  it("dealScore increases when historical prices are added", async () => {
    // With no history, score is based only on shipping + stock
    const resBefore = await request(app)
      .get("/api/items")
      .set("x-device-id", DEVICE.alice);
    const scoreBefore = resBefore.body[0].dealScore;

    // Add 80 days of historical (higher) prices
    await prisma.priceRecord.createMany({
      data: makeHistoricalPrices(itemId),
    });

    const resAfter = await request(app)
      .get("/api/items")
      .set("x-device-id", DEVICE.alice);
    const scoreAfter = resAfter.body[0].dealScore;

    expect(scoreAfter).toBeGreaterThan(scoreBefore);
    expect(scoreAfter).toBeGreaterThanOrEqual(EXPECTED_DEAL_SCORE_MIN);
  });

  it("allTimeLow equals the lowest price ever recorded", async () => {
    const res = await request(app)
      .get("/api/items")
      .set("x-device-id", DEVICE.alice);

    // Current prices: 24.99, 27.50, 29.99 → ATL = 24.99
    expect(res.body[0].allTimeLow).toBe(24.99);
  });
});

// ─── Price history endpoint ───────────────────────────────────────────────────

describe("GET /api/items/:id/prices — price history", () => {
  let itemId: string;

  beforeEach(async () => {
    const createRes = await request(app)
      .post("/api/items")
      .set("x-device-id", DEVICE.alice)
      .send(ONEBLADE_ITEM);
    itemId = createRes.body.id;

    await prisma.priceRecord.createMany({
      data: [
        ...makeHistoricalPrices(itemId),
        ...ONEBLADE_CURRENT_PRICES.map(({ imageUrl: _img, ...p }) => ({ ...p, itemId })),
      ],
    });
  });

  it("returns price records sorted by date ascending", async () => {
    const res = await request(app)
      .get(`/api/items/${itemId}/prices`)
      .set("x-device-id", DEVICE.alice);

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);

    const dates = res.body.map((r: { recordedAt: string }) =>
      new Date(r.recordedAt).getTime()
    );
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i]).toBeGreaterThanOrEqual(dates[i - 1]);
    }
  });

  it("each record has required fields", async () => {
    const res = await request(app)
      .get(`/api/items/${itemId}/prices`)
      .set("x-device-id", DEVICE.alice);

    for (const record of res.body) {
      expect(record).toHaveProperty("id");
      expect(record).toHaveProperty("retailer");
      expect(record).toHaveProperty("price");
      expect(record).toHaveProperty("currency");
      expect(record).toHaveProperty("inStock");
      expect(record).toHaveProperty("recordedAt");
    }
  });

  it("returns 404 for item not belonging to the requesting device", async () => {
    const res = await request(app)
      .get(`/api/items/${itemId}/prices`)
      .set("x-device-id", DEVICE.bob);

    expect(res.status).toBe(404);
  });
});
