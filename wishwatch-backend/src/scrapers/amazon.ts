import { newContext } from "./browser";
import { parsePrice, gbpToEur, randomDelay } from "./utils";
import type { ScrapeResult, ScraperOptions } from "./types";
import { logger } from "../utils/logger";

const AMAZON_DOMAINS = [
  { id: "amazon_es", domain: "amazon.es",    currency: "EUR", shipsToSpain: true,  baseShipping: 0    },
  { id: "amazon_de", domain: "amazon.de",    currency: "EUR", shipsToSpain: true,  baseShipping: 3.99 },
  { id: "amazon_fr", domain: "amazon.fr",    currency: "EUR", shipsToSpain: true,  baseShipping: 3.99 },
  { id: "amazon_it", domain: "amazon.it",    currency: "EUR", shipsToSpain: true,  baseShipping: 3.99 },
  { id: "amazon_uk", domain: "amazon.co.uk", currency: "GBP", shipsToSpain: false, baseShipping: 5.99 },
] as const;

export async function scrapeAmazon(options: ScraperOptions): Promise<ScrapeResult[]> {
  const results: ScrapeResult[] = [];
  const context = await newContext();

  try {
    for (const site of AMAZON_DOMAINS) {
      await randomDelay(1500, 3500);
      const url = `https://www.${site.domain}/s?k=${encodeURIComponent(options.query)}`;
      const page = await context.newPage();

      try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });

        // Wait for search results
        await page.waitForSelector('[data-component-type="s-search-result"]', { timeout: 8000 }).catch(() => {});

        const items = await page.$$('[data-component-type="s-search-result"]');

        for (const item of items.slice(0, 3)) {
          const title = await item.$eval("h2 a span", el => el.textContent?.trim()).catch(() => null);
          const asin  = await item.getAttribute("data-asin").catch(() => null);
          if (!title || !asin) continue;

          const priceWhole    = await item.$eval(".a-price .a-price-whole",    el => el.textContent?.trim()).catch(() => "");
          const priceFraction = await item.$eval(".a-price .a-price-fraction", el => el.textContent?.trim()).catch(() => "");
          const priceRaw      = (priceWhole + (priceFraction ? "." + priceFraction : "")).replace(/[^0-9.]/g, "");
          const price         = parseFloat(priceRaw);
          if (!price || price <= 0) continue;

          const relUrl   = await item.$eval("h2 a", el => el.getAttribute("href")).catch(() => null);
          const imageUrl = await item.$eval("img.s-image", el => el.getAttribute("src")).catch(() => null);
          const url      = relUrl?.startsWith("http") ? relUrl : `https://www.${site.domain}${relUrl}`;

          let priceEur = price;
          if (site.currency === "GBP") priceEur = gbpToEur(price);

          const shippingCost = priceEur >= 29 ? 0 : site.baseShipping;

          results.push({
            retailer:     site.id,
            productName:  title,
            price:        priceEur,
            currency:     "EUR",
            url:          url ?? `https://www.${site.domain}/dp/${asin}`,
            imageUrl:     imageUrl ?? undefined,
            inStock:      true,
            shipsToSpain: site.shipsToSpain,
            shippingCost,
          });

          logger.debug(`Amazon ${site.domain}: €${priceEur} — ${title.substring(0, 50)}`);
          break; // first valid result per domain
        }
      } catch (err) {
        logger.warn(`Amazon ${site.domain} failed`, err instanceof Error ? err.message : err);
      } finally {
        await page.close();
      }
    }
  } finally {
    await context.close();
  }

  return results;
}
