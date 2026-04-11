import { newContext } from "./browser";
import { parsePrice, randomDelay } from "./utils";
import type { ScrapeResult, ScraperOptions } from "./types";
import { logger } from "../utils/logger";

export async function scrapeZalando(options: ScraperOptions): Promise<ScrapeResult[]> {
  await randomDelay();
  const context = await newContext();
  const results: ScrapeResult[] = [];

  try {
    const page = await context.newPage();
    const url  = `https://www.zalando.es/catalog/?q=${encodeURIComponent(options.query)}`;

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
    // Accept cookies if dialog appears
    await page.click('[data-testid="uc-accept-all-button"]', { timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(1500);

    const cards = await page.$$("article");
    for (const card of cards.slice(0, 3)) {
      const title = await card.$eval("[class*='title'], h3", el => el.textContent?.trim()).catch(() => null);
      const priceRaw = await card.$eval("[class*='price']", el => el.textContent?.trim()).catch(() => null);
      const price = priceRaw ? parsePrice(priceRaw) : null;
      const href  = await card.$eval("a", el => el.getAttribute("href")).catch(() => null);
      const img   = await card.$eval("img", el => el.getAttribute("src")).catch(() => null);

      if (!title || !price || !href) continue;

      results.push({
        retailer:     "zalando_es",
        productName:  title,
        price,
        currency:     "EUR",
        url:          href.startsWith("http") ? href : `https://www.zalando.es${href}`,
        imageUrl:     img ?? undefined,
        inStock:      true,
        shipsToSpain: true,
        shippingCost: 0,
      });
      break;
    }

    await page.close();
  } catch (err) {
    logger.warn("Zalando failed", err instanceof Error ? err.message : err);
  } finally {
    await context.close();
  }

  return results;
}
