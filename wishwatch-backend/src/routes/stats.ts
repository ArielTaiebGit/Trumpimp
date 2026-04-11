import { Router } from "express";
import { prisma } from "../db";
import { computeAvg90, computeAllTimeLow, computeDealScore } from "../utils/dealScore";
import { DEAL_SCORE_BADGE_THRESHOLD } from "../utils/constants";
import type { Request, Response } from "express";

export const statsRouter = Router();

statsRouter.get("/", async (req: Request, res: Response) => {
  const items = await prisma.wishlistItem.findMany({
    where: { userId: req.userId },
    include: {
      prices: {
        orderBy: { recordedAt: "desc" },
        take: 200,
      },
    },
  });

  let activeDeals = 0;
  let totalSavings = 0;

  for (const item of items) {
    const prices = item.prices;
    const latestByRetailer = new Map<string, (typeof prices)[0]>();
    for (const p of prices) {
      if (!latestByRetailer.has(p.retailer)) latestByRetailer.set(p.retailer, p);
    }
    const latestPrices = [...latestByRetailer.values()];
    const avg90 = computeAvg90(prices);
    const allTimeLow = computeAllTimeLow(prices);
    const bestPrice = latestPrices.filter((p) => p.inStock && p.shipsToSpain)
      .sort((a, b) => a.price + a.shippingCost - (b.price + b.shippingCost))[0] ?? null;

    if (bestPrice) {
      const score = computeDealScore(bestPrice, { avg90, allTimeLow });
      if (score >= DEAL_SCORE_BADGE_THRESHOLD) {
        activeDeals++;
        if (avg90) totalSavings += Math.max(0, avg90 - bestPrice.price);
      }
    }
  }

  const lastScan = await prisma.wishlistItem.findFirst({
    where: { userId: req.userId, lastScannedAt: { not: null } },
    orderBy: { lastScannedAt: "desc" },
    select: { lastScannedAt: true },
  });

  res.json({
    totalItems: items.length,
    activeDeals,
    totalSavings: Math.round(totalSavings * 100) / 100,
    lastScanAt: lastScan?.lastScannedAt ?? null,
  });
});
