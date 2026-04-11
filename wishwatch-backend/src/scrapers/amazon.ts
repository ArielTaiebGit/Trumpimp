import * as cheerio from "cheerio";
import { httpClient, randomUserAgent, randomDelay, parsePrice, gbpToEur } from "./utils";
import type { ScrapeResult, ScraperOptions } from "./types";
import { logger } from "../utils/logger";

type AmazonDomain = {
  id: string;
  domain: string;
  currency: string;
  shipsToSpain: boolean;
  countryCode: string;
};

const AMAZON_DOMAINS: AmazonDomain[] = [
  { id: "amazon_es", domain: "amazon.es", currency: "EUR", shipsToSpain: true, countryCode: "es" },
  { id: "amazon_de", domain: "amazon.de", currency: "EUR", shipsToSpain: true, countryCode: "de" },
  { id: "amazon_fr", domain: "amazon.fr", currency: "EUR", shipsToSpain: true, countryCode: "fr" },
  { id: "amazon_it", domain: "amazon.it", currency: "EUR", shipsToSpain: true, countryCode: "it" },
  { id: "amazon_uk", domain: "amazon.co.uk", currency: "GBP", shipsToSpain: false, countryCode: "gb" },
];

interface AmazonSearchResult {
  title: string;
  price: number | null;
  originalPrice: number | null;
  url: string;
  imageUrl: string | null;
  asin: string | null;
}

async function searchAmazon(
  domain: AmazonDomain,
  query: string
): Promise<AmazonSearchResult | null> {
  const searchUrl = `https://www.${domain.domain}/s?k=${encodeURIComponent(query)}&ref=nb_sb_noss`;

  try {
    const res = await httpClient.get<string>(searchUrl, {
      headers: {
        "User-Agent": randomUserAgent(),
        Referer: `https://www.${domain.domain}`,
      },
      responseType: "text",
    });

    const $ = cheerio.load(res.data);

    // Find the first sponsored or organic result with a price
    let result: AmazonSearchResult | null = null;

    $('[data-component-type="s-search-result"]').each((_, el) => {
      if (result) return false; // break

      const $el = $(el);
      const asin = $el.attr("data-asin") || null;
      const title = $el.find("h2 a span").text().trim();

      if (!title || !asin) return;

      // Price selectors for Amazon search
      const priceWhole = $el.find(".a-price .a-price-whole").first().text().trim();
      const priceFraction = $el.find(".a-price .a-price-fraction").first().text().trim();
      const priceRaw = priceWhole + (priceFraction ? "." + priceFraction : "");
      const price = parsePrice(priceRaw);

      if (!price || price <= 0) return;

      const originalPriceRaw = $el.find(".a-price.a-text-price .a-offscreen").first().text().trim();
      const originalPrice = parsePrice(originalPriceRaw);

      const relativeUrl = $el.find("h2 a").attr("href") || "";
      const url = relativeUrl.startsWith("http")
        ? relativeUrl
        : `https://www.${domain.domain}${relativeUrl}`;

      const imageUrl = $el.find("img.s-image").attr("src") || null;

      result = { title, price, originalPrice, url, imageUrl, asin };
    });

    return result;
  } catch (err) {
    logger.warn(`Amazon ${domain.domain} search failed`, err);
    return null;
  }
}

export async function scrapeAmazon(options: ScraperOptions): Promise<ScrapeResult[]> {
  const results: ScrapeResult[] = [];

  for (const domain of AMAZON_DOMAINS) {
    await randomDelay(1000, 3000);

    const found = await searchAmazon(domain, options.query);
    if (!found || !found.price) continue;

    let priceEur = found.price;
    if (domain.currency === "GBP") {
      priceEur = gbpToEur(found.price);
    }

    // UK: check if actually ships to Spain (simplified — we mark as true with potential surcharge)
    const shipsToSpain = domain.shipsToSpain;
    const shippingCost = domain.id === "amazon_es" ? 0 :
                         domain.id === "amazon_uk" ? 5.99 :
                         priceEur >= 29 ? 0 : 3.99;

    results.push({
      retailer: domain.id,
      productName: found.title,
      price: priceEur,
      originalPrice: found.originalPrice
        ? domain.currency === "GBP" ? gbpToEur(found.originalPrice) : found.originalPrice
        : undefined,
      currency: "EUR",
      url: found.url,
      imageUrl: found.imageUrl ?? undefined,
      inStock: true, // if it shows a price it's generally in stock
      shipsToSpain,
      shippingCost,
    });

    logger.debug(`Amazon ${domain.domain}: €${priceEur} for "${found.title.substring(0, 50)}"`);
  }

  return results;
}
