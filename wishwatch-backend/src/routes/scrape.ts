import { Router } from "express";
import { prisma } from "../db";
import { scrapeAll } from "../scrapers";
import { sendDealNotifications } from "../jobs/notifications";
import { logger } from "../utils/logger";
import type { Request, Response } from "express";

export const scrapeRouter = Router();

export const scrapeQueue = new Set<string>(); // simple in-memory dedup

/** POST /api/scrape/item/:id — trigger immediate scrape for one item */
scrapeRouter.post("/item/:id", async (req: Request, res: Response) => {
  const item = await prisma.wishlistItem.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });

  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }

  if (scrapeQueue.has(item.id)) {
    res.json({ message: "Already queued", queued: true });
    return;
  }

  scrapeQueue.add(item.id);
  res.json({ message: "Scrape started", queued: false });

  // Run in background
  setImmediate(async () => {
    try {
      await scrapeItem(item.id, item.searchQuery || item.name);
    } finally {
      scrapeQueue.delete(item.id);
    }
  });
});

/** POST /api/scrape/all — trigger full scrape for all items */
scrapeRouter.post("/all", async (req: Request, res: Response) => {
  const items = await prisma.wishlistItem.findMany({
    where: { userId: req.userId },
  });

  res.json({ message: `Scraping ${items.length} items`, count: items.length });

  setImmediate(async () => {
    for (const item of items) {
      if (!scrapeQueue.has(item.id)) {
        scrapeQueue.add(item.id);
        try {
          await scrapeItem(item.id, item.searchQuery || item.name);
        } finally {
          scrapeQueue.delete(item.id);
        }
      }
    }

    // Send notifications after full scan
    try {
      await sendDealNotifications(req.userId);
    } catch (err) {
      logger.error("Notification dispatch failed", err);
    }
  });
});

export async function scrapeItem(itemId: string, query: string): Promise<void> {
  logger.info(`Starting scrape for item ${itemId}: "${query}"`);

  const results = await scrapeAll({ query });

  if (results.length === 0) {
    logger.warn(`No results for item ${itemId}`);
    return;
  }

  // Persist results
  await prisma.$transaction(
    results.map((r) =>
      prisma.priceRecord.create({
        data: {
          itemId,
          retailer: r.retailer,
          price: r.price,
          originalPrice: r.originalPrice,
          currency: r.currency,
          url: r.url,
          inStock: r.inStock,
          shipsToSpain: r.shipsToSpain,
          shippingCost: r.shippingCost,
        },
      })
    )
  );

  await prisma.wishlistItem.update({
    where: { id: itemId },
    data: {
      lastScannedAt: new Date(),
      // Use first result image if item has no image
    },
  });

  logger.info(`Scrape complete for item ${itemId}: ${results.length} prices saved`);
}
