import { newContext } from "./browser";
import { parsePrice, randomDelay } from "./utils";
import type { ScrapeResult, ScraperOptions } from "./types";
import { logger } from "../utils/logger";

export async function scrapeFnac(options: ScraperOptions): Promise<ScrapeResult[]> {
  await randomDelay();
  const context = await newContext();
  const results: ScrapeResult[] = [];

  try {
    const page = await context.newPage();
    const url  = `https://www.fnac.es/SearchResult/ResultSet.aspx?SearchTerms=${encodeURIComponent(options.query)}&sft=2`;

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForTimeout(1500);

    const cards = await page.$$(".Article-itemWrapper, article.Article");
    for (const card of cards.slice(0, 3)) {
      const title    = await card.$eval(".Article-title, .Article-desc, h2, h3", el => el.textContent?.trim()).catch(() => null);
      const priceRaw = await card.$eval(".userPrice, .f-priceBox-price, [class*='price']",   el => el.textContent?.trim()).catch(() => null);
      const price    = priceRaw ? parsePrice(priceRaw) : null;
      const href     = await card.$eval("a", el => el.getAttribute("href")).catch(() => null);
      const img      = await card.$eval("img", el => el.getAttribute("src")).catch(() => null);

      if (!title || !price || !href) continue;

      results.push({
        retailer:     "fnac_es",
        productName:  title,
        price,
        currency:     "EUR",
        url:          href.startsWith("http") ? href : `https://www.fnac.es${href}`,
        imageUrl:     img ?? undefined,
        inStock:      true,
        shipsToSpain: true,
        shippingCost: price >= 29 ? 0 : 3.99,
      });
      break;
    }

    await page.close();
  } catch (err) {
    logger.warn("Fnac failed", err instanceof Error ? err.message : err);
  } finally {
    await context.close();
  }

  return results;
}
