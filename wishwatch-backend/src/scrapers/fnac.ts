import * as cheerio from "cheerio";
import { httpClient, randomUserAgent, randomDelay, parsePrice } from "./utils";
import type { ScrapeResult, ScraperOptions } from "./types";
import { logger } from "../utils/logger";

export async function scrapeFnac(options: ScraperOptions): Promise<ScrapeResult[]> {
  await randomDelay();

  const searchUrl = `https://www.fnac.es/SearchResult/ResultSet.aspx?SearchTerms=${encodeURIComponent(
    options.query
  )}&sft=2`;

  try {
    const res = await httpClient.get<string>(searchUrl, {
      headers: {
        "User-Agent": randomUserAgent(),
        Referer: "https://www.fnac.es/",
        "Accept-Language": "es-ES,es;q=0.9",
      },
      responseType: "text",
    });

    const $ = cheerio.load(res.data);
    const results: ScrapeResult[] = [];

    // Fnac article cards
    $(".Article-itemWrapper, article.Article").each((i, el) => {
      if (results.length >= 1) return false;

      const $el = $(el);
      const title =
        $el.find(".Article-title, .Article-desc").first().text().trim() ||
        $el.find("h2, h3").first().text().trim();

      const priceRaw = $el.find(".userPrice, .f-priceBox-price, [class*='price']").first().text().trim();
      const price = parsePrice(priceRaw);

      const relUrl = $el.find("a").first().attr("href");
      const image = $el.find("img.Article-thumb, img").first().attr("src");

      if (!title || !price || !relUrl) return;

      const url = relUrl.startsWith("http") ? relUrl : `https://www.fnac.es${relUrl}`;

      const outOfStock = $el.find("[class*='unavailable'], [class*='stock']").text()
        .toLowerCase().includes("no disponible");

      results.push({
        retailer: "fnac_es",
        productName: title,
        price,
        currency: "EUR",
        url,
        imageUrl: image,
        inStock: !outOfStock,
        shipsToSpain: true,
        shippingCost: price >= 29 ? 0 : 3.99,
      });
    });

    return results;
  } catch (err) {
    logger.warn("Fnac scrape failed", err);
    return [];
  }
}
