import express from "express";
import { prisma } from "../db";
import { deviceIdMiddleware } from "../middleware/deviceId";
import { itemsRouter } from "../routes/items";
import { dealsRouter } from "../routes/deals";
import { scrapeRouter } from "../routes/scrape";
import { statsRouter } from "../routes/stats";

/**
 * Creates a lightweight Express app using the real production routers.
 * No rate-limiting, no helmet — keeps tests fast and simple.
 */
export function createTestApp() {
  const app = express();
  app.use(express.json());

  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

  app.use("/api", deviceIdMiddleware);
  app.use("/api/items", itemsRouter);
  app.use("/api/deals", dealsRouter);
  app.use("/api/scrape", scrapeRouter);
  app.use("/api/stats", statsRouter);

  return app;
}

/**
 * Wipes all rows from every table in reverse-dependency order.
 * Call in beforeEach to isolate each test.
 */
export async function clearDatabase() {
  await prisma.notificationLog.deleteMany();
  await prisma.priceRecord.deleteMany();
  await prisma.wishlistItem.deleteMany();
  await prisma.user.deleteMany();
}

/**
 * Disconnects the Prisma client.  Call in afterAll.
 */
export async function disconnectDb() {
  await prisma.$disconnect();
}

/** Canonical test device IDs */
export const DEVICE = {
  alice: "test-device-alice",
  bob: "test-device-bob",
} as const;
