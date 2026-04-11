import { newContext } from "./browser";
import { parsePrice, randomDelay } from "./utils";
import type { ScrapeResult, ScraperOptions } from "./types";
import { logger } from "../utils/logger";

export async function scrapeMediaMarkt(options: ScraperOptions): Promise<ScrapeResult[]> {
  await randomDelay();
  const context = await newContext();
  const results: ScrapeResult[] = [];

  try {
    const page = await context.newPage();
    const url  = `https://www.mediamarkt.es/es/search.html?query=${encodeURIComponent(options.query)}`;

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForTimeout(2000);

    const cards = await page.$$("[data-test='mms-product-card'], .product-wrapper");
    for (const card of cards.slice(0, 3)) {
      const title    = await card.$eval("[data-test='product-title'], h2, [class*='title']", el => el.textContent?.trim()).catch(() => null);
      const priceRaw = await card.$eval("[data-test='product-price'], [class*='price']",     el => el.textContent?.trim()).catch(() => null);
      const price    = priceRaw ? parsePrice(priceRaw) : null;
      const href     = await card.$eval("a", el => el.getAttribute("href")).catch(() => null);
      const img      = await card.$eval("img", el => el.getAttribute("src") ?? el.getAttribute("data-src")).catch(() => null);

      if (!title || !price || !href) continue;

      const outOfStock = await card.$("[class*='sold-out'], [class*='unavailable']").then(el => !!el).catch(() => false);

      results.push({
        retailer:     "mediamarkt_es",
        productName:  title,
        price,
        currency:     "EUR",
        url:          href.startsWith("http") ? href : `https://www.mediamarkt.es${href}`,
        imageUrl:     img ?? undefined,
        inStock:      !outOfStock,
        shipsToSpain: true,
        shippingCost: price >= 59 ? 0 : 5.99,
      });
      break;
    }

    await page.close();
  } catch (err) {
    logger.warn("MediaMarkt failed", err instanceof Error ? err.message : err);
  } finally {
    await context.close();
  }

  return results;
}
