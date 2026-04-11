import cron from "node-cron";
import { prisma } from "../db";
import { scrapeItem } from "../routes/scrape";
import { sendDealNotifications } from "./notifications";
import { logger } from "../utils/logger";

const SCAN_HOUR = parseInt(process.env.DAILY_SCAN_HOUR ?? "8", 10);
const SCAN_MINUTE = parseInt(process.env.DAILY_SCAN_MINUTE ?? "0", 10);

/**
 * Schedule the daily price scan.
 * Runs at SCAN_HOUR:SCAN_MINUTE every day (server local time — deploy in CET zone).
 */
export function startDailyScanJob(): void {
  const cronExpr = `${SCAN_MINUTE} ${SCAN_HOUR} * * *`;
  logger.info(`Daily scan scheduled: cron "${cronExpr}" (${SCAN_HOUR}:${String(SCAN_MINUTE).padStart(2, "0")} server time)`);

  cron.schedule(cronExpr, async () => {
    logger.info("=== Daily scan starting ===");
    await runFullScan();
    logger.info("=== Daily scan complete ===");
  });
}

export async function runFullScan(): Promise<void> {
  // Get all distinct users
  const users = await prisma.user.findMany({ select: { id: true } });

  for (const user of users) {
    const items = await prisma.wishlistItem.findMany({
      where: { userId: user.id },
      select: { id: true, name: true, searchQuery: true },
    });

    logger.info(`Scanning ${items.length} items for user ${user.id}`);

    for (const item of items) {
      try {
        await scrapeItem(item.id, item.searchQuery || item.name);
      } catch (err) {
        logger.error(`Failed to scrape item ${item.id}`, err);
      }
    }

    try {
      await sendDealNotifications(user.id);
    } catch (err) {
      logger.error(`Notification dispatch failed for user ${user.id}`, err);
    }
  }
}
