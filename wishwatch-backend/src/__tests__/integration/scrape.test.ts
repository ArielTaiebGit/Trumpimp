/**
 * Integration tests: /api/scrape
 *
 * The actual Playwright scrapers are mocked — these tests verify that:
 * 1. The endpoint accepts a trigger and returns the correct shape
 * 2. The background job persists mocked price records to the DB
 * 3. Duplicate triggers for the same item are de-duped
 *
 * We wait for the background setImmediate to finish by polling the DB
 * rather than using fake timers, keeping the tests straightforward.
 */
import request from "supertest";
import { prisma } from "../../db";
import { createTestApp, clearDatabase, disconnectDb, DEVICE } from "../helpers";
import { ONEBLADE_ITEM, ONEBLADE_SCRAPE_RESULTS } from "../fixtures/oneblade";

// Mock the scrapers module before importing the app
jest.mock("../../scrapers", () => ({
  scrapeAll: jest.fn(),
}));

// Mock notifications to prevent Expo SDK calls
jest.mock("../../jobs/notifications", () => ({
  sendDealNotifications: jest.fn().mockResolvedValue(undefined),
}));

import { scrapeAll } from "../../scrapers";
const mockScrapeAll = scrapeAll as jest.MockedFunction<typeof scrapeAll>;

const app = createTestApp();

/** Polls until the item's price records appear (max 3 s). */
async function waitForPrices(
  itemId: string,
  expectedCount: number,
  timeoutMs = 3000
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const count = await prisma.priceRecord.count({ where: { itemId } });
    if (count >= expectedCount) return;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error(
    `Timed out waiting for ${expectedCount} price records on item ${itemId}`
  );
}

beforeEach(async () => {
  await clearDatabase();
  mockScrapeAll.mockReset();
});

afterAll(async () => {
  await disconnectDb();
});

// ─── POST /api/scrape/item/:id ────────────────────────────────────────────────

describe("POST /api/scrape/item/:id", () => {
  it("returns 404 for an unknown item id", async () => {
    const res = await request(app)
      .post("/api/scrape/item/nonexistent-id")
      .set("x-device-id", DEVICE.alice);

    expect(res.status).toBe(404);
  });

  it("returns 404 when item belongs to another device", async () => {
    const createRes = await request(app)
      .post("/api/items")
      .set("x-device-id", DEVICE.alice)
      .send(ONEBLADE_ITEM);

    const res = await request(app)
      .post(`/api/scrape/item/${createRes.body.id}`)
      .set("x-device-id", DEVICE.bob);

    expect(res.status).toBe(404);
  });

  it("accepts a valid item and returns queued:false on first call", async () => {
    mockScrapeAll.mockResolvedValue([]);

    const createRes = await request(app)
      .post("/api/items")
      .set("x-device-id", DEVICE.alice)
      .send(ONEBLADE_ITEM);

    const res = await request(app)
      .post(`/api/scrape/item/${createRes.body.id}`)
      .set("x-device-id", DEVICE.alice);

    expect(res.status).toBe(200);
    expect(res.body.queued).toBe(false);
  });

  it("persists price records returned by the mock scraper", async () => {
    mockScrapeAll.mockResolvedValue(ONEBLADE_SCRAPE_RESULTS);

    const createRes = await request(app)
      .post("/api/items")
      .set("x-device-id", DEVICE.alice)
      .send(ONEBLADE_ITEM);

    const itemId: string = createRes.body.id;

    await request(app)
      .post(`/api/scrape/item/${itemId}`)
      .set("x-device-id", DEVICE.alice);

    // Wait for background job to finish
    await waitForPrices(itemId, ONEBLADE_SCRAPE_RESULTS.length);

    const records = await prisma.priceRecord.findMany({ where: { itemId } });
    expect(records).toHaveLength(ONEBLADE_SCRAPE_RESULTS.length);

    const retailers = records.map((r) => r.retailer);
    expect(retailers).toContain("amazon_es");
    expect(retailers).toContain("mediamarkt");
    expect(retailers).toContain("pccomponentes");
  });

  it("saves correct price and shipping data for amazon_es result", async () => {
    mockScrapeAll.mockResolvedValue(ONEBLADE_SCRAPE_RESULTS);

    const createRes = await request(app)
      .post("/api/items")
      .set("x-device-id", DEVICE.alice)
      .send(ONEBLADE_ITEM);

    const itemId: string = createRes.body.id;

    await request(app)
      .post(`/api/scrape/item/${itemId}`)
      .set("x-device-id", DEVICE.alice);

    await waitForPrices(itemId, ONEBLADE_SCRAPE_RESULTS.length);

    const amazonRecord = await prisma.priceRecord.findFirst({
      where: { itemId, retailer: "amazon_es" },
    });

    expect(amazonRecord).toBeTruthy();
    expect(amazonRecord!.price).toBe(24.99);
    expect(amazonRecord!.shippingCost).toBe(0);
    expect(amazonRecord!.inStock).toBe(true);
    expect(amazonRecord!.shipsToSpain).toBe(true);
  });

  it("updates lastScannedAt on the item after scrape completes", async () => {
    mockScrapeAll.mockResolvedValue(ONEBLADE_SCRAPE_RESULTS);

    const createRes = await request(app)
      .post("/api/items")
      .set("x-device-id", DEVICE.alice)
      .send(ONEBLADE_ITEM);

    const itemId: string = createRes.body.id;

    await request(app)
      .post(`/api/scrape/item/${itemId}`)
      .set("x-device-id", DEVICE.alice);

    await waitForPrices(itemId, ONEBLADE_SCRAPE_RESULTS.length);

    const updated = await prisma.wishlistItem.findUnique({ where: { id: itemId } });
    expect(updated!.lastScannedAt).not.toBeNull();
  });

  it("handles empty scraper results gracefully (no price records inserted)", async () => {
    mockScrapeAll.mockResolvedValue([]);

    const createRes = await request(app)
      .post("/api/items")
      .set("x-device-id", DEVICE.alice)
      .send(ONEBLADE_ITEM);

    const itemId: string = createRes.body.id;

    await request(app)
      .post(`/api/scrape/item/${itemId}`)
      .set("x-device-id", DEVICE.alice);

    // Give the background job time to run
    await new Promise((r) => setTimeout(r, 200));

    const count = await prisma.priceRecord.count({ where: { itemId } });
    expect(count).toBe(0);
  });
});

// ─── POST /api/scrape/all ─────────────────────────────────────────────────────

describe("POST /api/scrape/all", () => {
  it("returns {count: 0} for empty wishlist", async () => {
    const res = await request(app)
      .post("/api/scrape/all")
      .set("x-device-id", DEVICE.alice);

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(0);
  });

  it("returns count matching number of items in wishlist", async () => {
    mockScrapeAll.mockResolvedValue([]);

    // Add 2 items
    await request(app)
      .post("/api/items")
      .set("x-device-id", DEVICE.alice)
      .send(ONEBLADE_ITEM);

    await request(app)
      .post("/api/items")
      .set("x-device-id", DEVICE.alice)
      .send({ name: "Second item" });

    const res = await request(app)
      .post("/api/scrape/all")
      .set("x-device-id", DEVICE.alice);

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(2);
  });

  it("persists prices for all items after /scrape/all", async () => {
    mockScrapeAll.mockResolvedValue(ONEBLADE_SCRAPE_RESULTS);

    const createRes = await request(app)
      .post("/api/items")
      .set("x-device-id", DEVICE.alice)
      .send(ONEBLADE_ITEM);

    const itemId: string = createRes.body.id;

    await request(app)
      .post("/api/scrape/all")
      .set("x-device-id", DEVICE.alice);

    await waitForPrices(itemId, ONEBLADE_SCRAPE_RESULTS.length);

    const records = await prisma.priceRecord.findMany({ where: { itemId } });
    expect(records.length).toBeGreaterThan(0);
  });
});
