import { Router } from "express";
import { prisma } from "../db";
import { computeAvg90, computeAllTimeLow, computeDealScore } from "../utils/dealScore";
import { DEAL_SCORE_BADGE_THRESHOLD } from "../utils/constants";
import type { Request, Response } from "express";

export const dealsRouter = Router();

/** GET /api/deals — all items with their deal score, sorted by score desc */
dealsRouter.get("/", async (req: Request, res: Response) => {
  const items = await prisma.wishlistItem.findMany({
    where: { userId: req.userId },
    include: {
      prices: {
        orderBy: { recordedAt: "desc" },
        take: 200,
      },
    },
  });

  const deals = items
    .map((item) => {
      const prices = item.prices;

      const latestByRetailer = new Map<string, (typeof prices)[0]>();
      for (const p of prices) {
        if (!latestByRetailer.has(p.retailer)) latestByRetailer.set(p.retailer, p);
      }
      const latestPrices = [...latestByRetailer.values()];

      const avg90 = computeAvg90(prices);
      const allTimeLow = computeAllTimeLow(prices);

      const inStockPrices = latestPrices
        .filter((p) => p.inStock && p.shipsToSpain)
        .sort((a, b) => a.price + a.shippingCost - (b.price + b.shippingCost));

      const bestPrice = inStockPrices[0] ?? latestPrices[0] ?? null;
      if (!bestPrice) return null;

      const dealScore = computeDealScore(bestPrice, { avg90, allTimeLow });

      const savings = avg90 ? Math.max(0, avg90 - bestPrice.price) : 0;
      const savingsPercent = avg90 && avg90 > 0 ? (savings / avg90) * 100 : 0;

      return {
        ...item,
        prices: undefined,
        latestPrices,
        bestPrice,
        dealScore,
        avg90,
        allTimeLow,
        savings,
        savingsPercent,
      };
    })
    .filter(
      (d): d is NonNullable<typeof d> =>
        d !== null && d.dealScore >= DEAL_SCORE_BADGE_THRESHOLD
    )
    .sort((a, b) => b.dealScore - a.dealScore);

  res.json(deals);
});
