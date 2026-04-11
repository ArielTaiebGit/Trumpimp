import { Expo } from "expo-server-sdk";
import { prisma } from "../db";
import { computeAvg90, computeAllTimeLow, computeDealScore } from "../utils/dealScore";
import { DEAL_SCORE_NOTIFY_THRESHOLD } from "../utils/constants";
import { logger } from "../utils/logger";

const expo = new Expo();

/**
 * After a scrape completes, evaluate deal scores for all of a user's items
 * and fire push notifications for items whose score just crossed the threshold.
 */
export async function sendDealNotifications(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.pushToken) return;

  const token = user.pushToken;
  if (!Expo.isExpoPushToken(token)) {
    logger.warn(`Invalid Expo push token for user ${userId}`);
    return;
  }

  const items = await prisma.wishlistItem.findMany({
    where: { userId, notifyEnabled: true },
    include: {
      prices: {
        orderBy: { recordedAt: "desc" },
        take: 200,
      },
    },
  });

  const messages: { token: string; title: string; body: string; data: Record<string, unknown> }[] = [];

  for (const item of items) {
    const prices = item.prices;
    if (prices.length === 0) continue;

    const latestByRetailer = new Map<string, (typeof prices)[0]>();
    for (const p of prices) {
      if (!latestByRetailer.has(p.retailer)) latestByRetailer.set(p.retailer, p);
    }
    const latestPrices = [...latestByRetailer.values()];

    const avg90 = computeAvg90(prices);
    const allTimeLow = computeAllTimeLow(prices);

    const bestPrice = latestPrices
      .filter((p) => p.inStock && p.shipsToSpain)
      .sort((a, b) => a.price + a.shippingCost - (b.price + b.shippingCost))[0];

    if (!bestPrice) continue;

    const dealScore = computeDealScore(bestPrice, { avg90, allTimeLow });
    if (dealScore < DEAL_SCORE_NOTIFY_THRESHOLD) continue;

    // Check if we already notified for this item at this score level recently (last 12h)
    const recentNotif = await prisma.notificationLog.findFirst({
      where: {
        itemId: item.id,
        sentAt: { gte: new Date(Date.now() - 12 * 60 * 60 * 1000) },
      },
      orderBy: { sentAt: "desc" },
    });

    // Only notify if score improved since last notification or no recent notif
    if (recentNotif && recentNotif.dealScore >= dealScore) continue;

    const isATL =
      allTimeLow != null && bestPrice.price <= allTimeLow + 0.01;
    const savings = avg90 ? Math.max(0, avg90 - bestPrice.price) : 0;

    messages.push({
      token,
      title: isATL ? `⭐ Best-ever price: ${item.name}` : `⚡ Deal found: ${item.name}`,
      body: isATL
        ? `€${bestPrice.price.toFixed(2)} — lowest price ever! Score ${dealScore}/100`
        : `€${bestPrice.price.toFixed(2)}${savings > 0 ? ` (€${savings.toFixed(2)} below avg)` : ""} · Score ${dealScore}/100`,
      data: { itemId: item.id, dealScore, price: bestPrice.price } as Record<string, unknown>,
    });

    await prisma.notificationLog.create({
      data: {
        userId,
        itemId: item.id,
        dealScore,
        price: bestPrice.price,
        retailer: bestPrice.retailer,
      },
    });
  }

  if (messages.length === 0) return;

  const chunks = expo.chunkPushNotifications(
    messages.map((m) => ({
      to: m.token,
      title: m.title,
      body: m.body,
      data: m.data,
      sound: "default",
      badge: messages.length,
    }))
  );

  for (const chunk of chunks) {
    try {
      const receipts = await expo.sendPushNotificationsAsync(chunk);
      logger.info(`Sent ${receipts.length} push notification(s)`);
    } catch (err) {
      logger.error("Push send failed", err);
    }
  }
}
