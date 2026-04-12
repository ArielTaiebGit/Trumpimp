/**
 * Integration tests: /api/stats
 */
import request from "supertest";
import { prisma } from "../../db";
import { createTestApp, clearDatabase, disconnectDb, DEVICE } from "../helpers";
import {
  ONEBLADE_ITEM,
  ONEBLADE_CURRENT_PRICES,
  makeHistoricalPrices,
} from "../fixtures/oneblade";

const app = createTestApp();

beforeEach(async () => {
  await clearDatabase();
});

afterAll(async () => {
  await disconnectDb();
});

describe("GET /api/stats — empty wishlist", () => {
  it("returns zero counts", async () => {
    const res = await request(app)
      .get("/api/stats")
      .set("x-device-id", DEVICE.alice);

    expect(res.status).toBe(200);
    expect(res.body.totalItems).toBe(0);
    expect(res.body.activeDeals).toBe(0);
    expect(res.body.totalSavings).toBe(0);
    expect(res.body.lastScanAt).toBeNull();
  });
});

describe("GET /api/stats — item with no prices", () => {
  it("counts the item but 0 active deals", async () => {
    await request(app)
      .post("/api/items")
      .set("x-device-id", DEVICE.alice)
      .send(ONEBLADE_ITEM);

    const res = await request(app)
      .get("/api/stats")
      .set("x-device-id", DEVICE.alice);

    expect(res.body.totalItems).toBe(1);
    expect(res.body.activeDeals).toBe(0);
    expect(res.body.lastScanAt).toBeNull();
  });
});

describe("GET /api/stats — Philips OneBlade with full history", () => {
  let itemId: string;

  beforeEach(async () => {
    const res = await request(app)
      .post("/api/items")
      .set("x-device-id", DEVICE.alice)
      .send(ONEBLADE_ITEM);
    itemId = res.body.id;

    await prisma.priceRecord.createMany({
      data: [
        ...makeHistoricalPrices(itemId),
        ...ONEBLADE_CURRENT_PRICES.map((p) => ({ ...p, itemId })),
      ],
    });
  });

  it("reports 1 active deal", async () => {
    const res = await request(app)
      .get("/api/stats")
      .set("x-device-id", DEVICE.alice);

    expect(res.body.totalItems).toBe(1);
    expect(res.body.activeDeals).toBe(1);
  });

  it("totalSavings is positive (current price below historical avg)", async () => {
    const res = await request(app)
      .get("/api/stats")
      .set("x-device-id", DEVICE.alice);

    expect(res.body.totalSavings).toBeGreaterThan(0);
    // Avg ≈ €30.99, best price €24.99 → savings ≈ €6
    expect(res.body.totalSavings).toBeCloseTo(6, 0);
  });

  it("lastScanAt updates when item is scanned", async () => {
    // Manually set lastScannedAt on the item
    const scanTime = new Date();
    await prisma.wishlistItem.update({
      where: { id: itemId },
      data: { lastScannedAt: scanTime },
    });

    const res = await request(app)
      .get("/api/stats")
      .set("x-device-id", DEVICE.alice);

    expect(res.body.lastScanAt).not.toBeNull();
    expect(new Date(res.body.lastScanAt).getTime()).toBeCloseTo(
      scanTime.getTime(),
      -3
    );
  });
});

describe("GET /api/stats — device isolation", () => {
  it("Bob's stats are independent of Alice's wishlist", async () => {
    // Alice adds a high-scoring item
    const res1 = await request(app)
      .post("/api/items")
      .set("x-device-id", DEVICE.alice)
      .send(ONEBLADE_ITEM);

    await prisma.priceRecord.createMany({
      data: [
        ...makeHistoricalPrices(res1.body.id),
        ...ONEBLADE_CURRENT_PRICES.map((p) => ({ ...p, itemId: res1.body.id })),
      ],
    });

    // Bob's stats should be untouched
    const res = await request(app)
      .get("/api/stats")
      .set("x-device-id", DEVICE.bob);

    expect(res.body.totalItems).toBe(0);
    expect(res.body.activeDeals).toBe(0);
  });
});
