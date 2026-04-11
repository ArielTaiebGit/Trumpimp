import * as cheerio from "cheerio";
import { httpClient, randomUserAgent, randomDelay, parsePrice } from "./utils";
import type { ScrapeResult, ScraperOptions } from "./types";
import { logger } from "../utils/logger";

export async function scrapeZalando(options: ScraperOptions): Promise<ScrapeResult[]> {
  await randomDelay();

  const searchUrl = `https://www.zalando.es/catalog/?q=${encodeURIComponent(options.query)}`;

  try {
    const res = await httpClient.get<string>(searchUrl, {
      headers: {
        "User-Agent": randomUserAgent(),
        Referer: "https://www.zalando.es/",
        "Accept-Language": "es-ES,es;q=0.9",
      },
      responseType: "text",
    });

    const $ = cheerio.load(res.data);

    // Zalando uses JSON data embedded in the page
    let jsonData: unknown = null;
    $("script[type='application/json']").each((_, el) => {
      const content = $(el).html() || "";
      if (content.includes("catalogArticles") || content.includes("articlesList")) {
        try {
          jsonData = JSON.parse(content);
        } catch {}
      }
    });

    // Fallback: parse HTML cards
    const results: ScrapeResult[] = [];

    $("[class*='ArticlesList'] article, [data-testid*='article']").each((i, el) => {
      if (results.length >= 1) return false;

      const $el = $(el);
      const title = $el.find("[class*='title'], h3").first().text().trim();
      const priceRaw = $el.find("[class*='price'], [class*='Price']").first().text().trim();
      const price = parsePrice(priceRaw);
      const url = $el.find("a").first().attr("href");
      const image = $el.find("img").first().attr("src");

      if (!title || !price || !url) return;

      const fullUrl = url.startsWith("http") ? url : `https://www.zalando.es${url}`;

      results.push({
        retailer: "zalando_es",
        productName: title,
        price,
        currency: "EUR",
        url: fullUrl,
        imageUrl: image,
        inStock: true,
        shipsToSpain: true,
        shippingCost: 0, // Zalando.es has free shipping on most orders
      });
    });

    if (results.length === 0) {
      logger.warn("Zalando: no results parsed from HTML, site may have changed structure");
    }

    return results;
  } catch (err) {
    logger.warn("Zalando scrape failed", err);
    return [];
  }
}
