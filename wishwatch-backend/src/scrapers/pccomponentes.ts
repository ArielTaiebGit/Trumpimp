import { newContext } from "./browser";
import { parsePrice, randomDelay } from "./utils";
import type { ScrapeResult, ScraperOptions } from "./types";
import { logger } from "../utils/logger";

export async function scrapePCComponentes(options: ScraperOptions): Promise<ScrapeResult[]> {
  await randomDelay();
  const context = await newContext();
  const results: ScrapeResult[] = [];

  try {
    const page = await context.newPage();
    const url  = `https://www.pccomponentes.com/buscar/?query=${encodeURIComponent(options.query)}`;

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForTimeout(1500);

    const cards = await page.$$("article, [data-product-id]");
    for (const card of cards.slice(0, 3)) {
      const title    = await card.$eval("h2, h3, [class*='title']", el => el.textContent?.trim()).catch(() => null);
      const priceRaw = await card.$eval("[class*='price']",          el => el.textContent?.trim()).catch(() => null);
      const price    = priceRaw ? parsePrice(priceRaw) : null;
      const href     = await card.$eval("a", el => el.getAttribute("href")).catch(() => null);
      const img      = await card.$eval("img", el => el.getAttribute("src") ?? el.getAttribute("data-src")).catch(() => null);

      if (!title || !price || !href) continue;

      const outOfStock = ((await card.textContent()) ?? "").toLowerCase().includes("agotado");

      results.push({
        retailer:     "pccomponentes",
        productName:  title,
        price,
        currency:     "EUR",
        url:          href.startsWith("http") ? href : `https://www.pccomponentes.com${href}`,
        imageUrl:     img ?? undefined,
        inStock:      !outOfStock,
        shipsToSpain: true,
        shippingCost: price >= 59 ? 0 : 5.99,
      });
      break;
    }

    await page.close();
  } catch (err) {
    logger.warn("PCComponentes failed", err instanceof Error ? err.message : err);
  } finally {
    await context.close();
  }

  return results;
}
