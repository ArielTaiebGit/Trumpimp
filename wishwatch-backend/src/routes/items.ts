import { Router } from "express";
import { body, validationResult } from "express-validator";
import { prisma } from "../db";
import { computeAvg90, computeAllTimeLow, computeDealScore } from "../utils/dealScore";
import { MAX_ITEMS } from "../utils/constants";
import type { Request, Response } from "express";

export const itemsRouter = Router();

/** GET /api/items — list all wishlist items with enriched price data */
itemsRouter.get("/", async (req: Request, res: Response) => {
  const items = await prisma.wishlistItem.findMany({
    where: { userId: req.userId },
    orderBy: [{ sortOrder: "asc" }, { addedAt: "desc" }],
    include: {
      prices: {
        orderBy: { recordedAt: "desc" },
        take: 200, // last 200 records for stats
      },
    },
  });

  const enriched = items.map((item) => {
    const prices = item.prices;

    // Latest price per retailer
    const latestByRetailer = new Map<string, (typeof prices)[0]>();
    for (const p of prices) {
      if (!latestByRetailer.has(p.retailer)) {
        latestByRetailer.set(p.retailer, p);
      }
    }
    const latestPrices = [...latestByRetailer.values()];

    // Stats
    const avg90 = computeAvg90(prices);
    const allTimeLow = computeAllTimeLow(prices);

    // Best current price (in-stock, ships to Spain, lowest total cost)
    const inStockPrices = latestPrices.filter((p) => p.inStock && p.shipsToSpain);
    const bestPrice = inStockPrices.sort(
      (a, b) => a.price + a.shippingCost - (b.price + b.shippingCost)
    )[0] ?? latestPrices[0] ?? null;

    // Deal score from best price
    const dealScore = bestPrice
      ? computeDealScore(bestPrice, { avg90, allTimeLow })
      : 0;

    return {
      ...item,
      prices: undefined, // don't send all history in list view
      latestPrices,
      bestPrice,
      dealScore,
      avg90,
      allTimeLow,
    };
  });

  res.json(enriched);
});

/** POST /api/items — add new wishlist item */
itemsRouter.post(
  "/",
  [
    body("name").trim().notEmpty().withMessage("name is required").isLength({ max: 200 }),
    body("category")
      .optional()
      .isIn(["game", "clothing", "device", "book", "shoes", "other"]),
    body("description").optional().isLength({ max: 500 }),
    body("searchQuery").optional().isLength({ max: 200 }),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    // Enforce max items
    const count = await prisma.wishlistItem.count({ where: { userId: req.userId } });
    if (count >= MAX_ITEMS) {
      res.status(400).json({ error: `Wishlist is full (max ${MAX_ITEMS} items)` });
      return;
    }

    const { name, category = "other", description, imageUrl, searchQuery } = req.body;

    const maxOrder = await prisma.wishlistItem.aggregate({
      where: { userId: req.userId },
      _max: { sortOrder: true },
    });

    const item = await prisma.wishlistItem.create({
      data: {
        userId: req.userId,
        name,
        category,
        description,
        imageUrl,
        searchQuery: searchQuery || name,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      },
    });

    res.status(201).json(item);
  }
);

/** PATCH /api/items/:id — update item */
itemsRouter.patch("/:id", async (req: Request, res: Response) => {
  const item = await prisma.wishlistItem.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });

  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }

  const { name, sortOrder, notifyEnabled } = req.body;
  const updated = await prisma.wishlistItem.update({
    where: { id: item.id },
    data: {
      ...(name !== undefined && { name }),
      ...(sortOrder !== undefined && { sortOrder }),
      ...(notifyEnabled !== undefined && { notifyEnabled }),
    },
  });

  res.json(updated);
});

/** DELETE /api/items/:id */
itemsRouter.delete("/:id", async (req: Request, res: Response) => {
  const item = await prisma.wishlistItem.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });

  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }

  await prisma.wishlistItem.delete({ where: { id: item.id } });
  res.json({ success: true });
});

/** GET /api/items/:id/prices — price history */
itemsRouter.get("/:id/prices", async (req: Request, res: Response) => {
  const item = await prisma.wishlistItem.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });

  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }

  const since = new Date();
  since.setDate(since.getDate() - 90);

  const prices = await prisma.priceRecord.findMany({
    where: { itemId: item.id, recordedAt: { gte: since } },
    orderBy: { recordedAt: "asc" },
  });

  res.json(prices);
});
