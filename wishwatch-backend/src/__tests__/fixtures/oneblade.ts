/**
 * Test fixtures for the Philips OneBlade Face QP1424/10.
 *
 * The QP1424/10 is the entry-level face-only OneBlade (~€25–35 retail).
 * We use it as the canonical "happy path" item throughout the test suite.
 *
 * Price story:
 *   - Amazon.es listed it at €34.99 when it launched
 *   - Slowly dropped over 80 days to €30.99
 *   - Today it's on promotion at €24.99 (best price ever)
 *   - MediaMarkt still has it at €29.99 (free shipping)
 *   - PCComponentes has it at €27.50 but out of stock (+€5.99 shipping)
 *
 * Expected deal score on amazon_es (€24.99, free ship, in-stock):
 *   avg90 ≈ 30.99  → (30.99 - 24.99) / 30.99 ≈ 19.4% below avg → ~38 pts
 *   ATL   = 24.99  → current == ATL                             → +30 pts
 *   Ship  = €0     → free                                       → +15 pts
 *   Stock = true                                                → +15 pts
 *   Total ≈ 98 pts (capped at 100)
 */

export const ONEBLADE_ITEM = {
  name: "Philips OneBlade Face QP1424/10",
  category: "other",
  searchQuery: "Philips OneBlade QP1424",
  description: "Entry-level face trimmer — 1 OneBlade replacement included",
} as const;

/** Three retailers' current prices */
export const ONEBLADE_CURRENT_PRICES = [
  {
    retailer: "amazon_es",
    price: 24.99,
    originalPrice: 34.99,
    currency: "EUR",
    url: "https://www.amazon.es/Philips-OneBlade-QP1424-10/dp/BTEST01",
    imageUrl: "https://m.media-amazon.com/images/I/placeholder.jpg",
    inStock: true,
    shipsToSpain: true,
    shippingCost: 0,
  },
  {
    retailer: "mediamarkt",
    price: 29.99,
    currency: "EUR",
    url: "https://www.mediamarkt.es/es/product/_philips-qp1424-10-1234567.html",
    imageUrl: undefined as undefined,
    inStock: true,
    shipsToSpain: true,
    shippingCost: 0,
  },
  {
    retailer: "pccomponentes",
    price: 27.5,
    currency: "EUR",
    url: "https://www.pccomponentes.com/philips-oneblade-qp1424-10",
    imageUrl: undefined as undefined,
    inStock: false,
    shipsToSpain: true,
    shippingCost: 5.99,
  },
];

/** Mock ScrapeResult objects returned by the mocked scrapeAll() */
export const ONEBLADE_SCRAPE_RESULTS = ONEBLADE_CURRENT_PRICES.map((p) => ({
  ...p,
  productName: "Philips OneBlade Face QP1424/10",
  originalPrice: (p as { originalPrice?: number }).originalPrice,
}));

/**
 * Historical amazon_es price records spread over the past 90 days.
 * itemId is injected at test time.
 */
export function makeHistoricalPrices(itemId: string) {
  const now = new Date();
  const sub = (days: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() - days);
    return d;
  };

  return [
    { itemId, retailer: "amazon_es", price: 34.99, currency: "EUR", url: "https://www.amazon.es/Philips-OneBlade-QP1424-10/dp/BTEST01", inStock: true, shipsToSpain: true, shippingCost: 0, recordedAt: sub(80) },
    { itemId, retailer: "amazon_es", price: 32.99, currency: "EUR", url: "https://www.amazon.es/Philips-OneBlade-QP1424-10/dp/BTEST01", inStock: true, shipsToSpain: true, shippingCost: 0, recordedAt: sub(60) },
    { itemId, retailer: "amazon_es", price: 30.99, currency: "EUR", url: "https://www.amazon.es/Philips-OneBlade-QP1424-10/dp/BTEST01", inStock: true, shipsToSpain: true, shippingCost: 0, recordedAt: sub(30) },
  ];
}
// avg90 of [34.99, 32.99, 30.99, 24.99] = 30.99  (when combined with today's record)
export const EXPECTED_AVG90 = (34.99 + 32.99 + 30.99 + 24.99) / 4; // ≈ 30.99
export const EXPECTED_ATL = 24.99;
export const EXPECTED_DEAL_SCORE_MIN = 70; // we expect well above the notify threshold
