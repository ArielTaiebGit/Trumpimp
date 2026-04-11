import * as cheerio from "cheerio";
import { httpClient, randomUserAgent, randomDelay, parsePrice } from "./utils";
import type { ScrapeResult, ScraperOptions } from "./types";
import { logger } from "../utils/logger";

export async function scrapeMediaMarkt(options: ScraperOptions): Promise<ScrapeResult[]> {
  await randomDelay();

  // MediaMarkt uses a search API endpoint
  const searchUrl = `https://www.mediamarkt.es/es/search.html?query=${encodeURIComponent(
    options.query
  )}`;

  try {
    const res = await httpClient.get<string>(searchUrl, {
      headers: {
        "User-Agent": randomUserAgent(),
        Referer: "https://www.mediamarkt.es/",
        "Accept-Language": "es-ES,es;q=0.9",
      },
      responseType: "text",
    });

    const $ = cheerio.load(res.data);
    const results: ScrapeResult[] = [];

    // MediaMarkt product tiles
    $("[data-test='mms-product-card'], .product-wrapper").each((i, el) => {
      if (results.length >= 1) return false;

      const $el = $(el);
      const title =
        $el.find("[data-test='product-title'], h2, [class*='title']").first().text().trim();

      const priceRaw = $el.find("[data-test='product-price'], [class*='price']").first().text().trim();
      const price = parsePrice(priceRaw);

      const relUrl = $el.find("a").first().attr("href");
      const image = $el.find("img").first().attr("src") || $el.find("img").first().attr("data-src");

      if (!title || !price || !relUrl) return;

      const url = relUrl.startsWith("http")
        ? relUrl
        : `https://www.mediamarkt.es${relUrl}`;

      const outOfStock =
        $el.find("[class*='sold-out'], [class*='unavailable']").length > 0;

      results.push({
        retailer: "mediamarkt_es",
        productName: title,
        price,
        currency: "EUR",
        url,
        imageUrl: image,
        inStock: !outOfStock,
        shipsToSpain: true,
        shippingCost: price >= 59 ? 0 : 5.99,
      });
    });

    return results;
  } catch (err) {
    logger.warn("MediaMarkt scrape failed", err);
    return [];
  }
}
