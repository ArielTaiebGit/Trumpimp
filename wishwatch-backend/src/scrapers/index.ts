import { scrapeAmazon } from "./amazon";
import { scrapeZalando } from "./zalando";
import { scrapePCComponentes } from "./pccomponentes";
import { scrapeFnac } from "./fnac";
import { scrapeMediaMarkt } from "./mediamarkt";
import type { ScrapeResult, ScraperOptions } from "./types";
import { logger } from "../utils/logger";

export type { ScrapeResult, ScraperOptions };

/**
 * Run all scrapers for a given query and return consolidated results.
 * Scrapers run sequentially with built-in delays to be respectful.
 */
export async function scrapeAll(options: ScraperOptions): Promise<ScrapeResult[]> {
  const allResults: ScrapeResult[] = [];

  const scrapers = [
    { name: "Amazon", fn: () => scrapeAmazon(options) },
    { name: "Zalando", fn: () => scrapeZalando(options) },
    { name: "PCComponentes", fn: () => scrapePCComponentes(options) },
    { name: "Fnac", fn: () => scrapeFnac(options) },
    { name: "MediaMarkt", fn: () => scrapeMediaMarkt(options) },
  ];

  for (const scraper of scrapers) {
    try {
      logger.info(`Scraping ${scraper.name} for: "${options.query}"`);
      const results = await scraper.fn();
      allResults.push(...results);
      logger.info(`${scraper.name}: ${results.length} result(s) found`);
    } catch (err) {
      logger.error(`${scraper.name} scraper threw`, err);
    }
  }

  return allResults;
}
