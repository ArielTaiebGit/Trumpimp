import * as cheerio from "cheerio";
import { httpClient, randomUserAgent, randomDelay, parsePrice } from "./utils";
import type { ScrapeResult, ScraperOptions } from "./types";
import { logger } from "../utils/logger";

export async function scrapePCComponentes(options: ScraperOptions): Promise<ScrapeResult[]> {
  await randomDelay();

  const searchUrl = `https://www.pccomponentes.com/buscar/?query=${encodeURIComponent(options.query)}`;

  try {
    const res = await httpClient.get<string>(searchUrl, {
      headers: {
        "User-Agent": randomUserAgent(),
        Referer: "https://www.pccomponentes.com/",
        "Accept-Language": "es-ES,es;q=0.9",
      },
      responseType: "text",
    });

    const $ = cheerio.load(res.data);
    const results: ScrapeResult[] = [];

    // PcComponentes product cards
    $("article.c-product-card, [data-product-id]").each((i, el) => {
      if (results.length >= 1) return false;

      const $el = $(el);
      const title =
        $el.find(".c-product-card__title, [class*='product-title']").first().text().trim() ||
        $el.find("h2, h3").first().text().trim();

      const priceRaw =
        $el.find(".c-product-card__price, [class*='price']").first().text().trim();
      const price = parsePrice(priceRaw);

      const relUrl = $el.find("a").first().attr("href");
      const image = $el.find("img").first().attr("src") || $el.find("img").first().attr("data-src");

      if (!title || !price || !relUrl) return;

      const url = relUrl.startsWith("http")
        ? relUrl
        : `https://www.pccomponentes.com${relUrl}`;

      // Check out-of-stock indicators
      const outOfStock =
        $el.find("[class*='out-of-stock'], [class*='agotado']").length > 0 ||
        $el.text().toLowerCase().includes("agotado");

      results.push({
        retailer: "pccomponentes",
        productName: title,
        price,
        currency: "EUR",
        url,
        imageUrl: image,
        inStock: !outOfStock,
        shipsToSpain: true,
        shippingCost: price >= 59 ? 0 : 5.99, // PcComponentes: free shipping over 59€
      });
    });

    return results;
  } catch (err) {
    logger.warn("PCComponentes scrape failed", err);
    return [];
  }
}
