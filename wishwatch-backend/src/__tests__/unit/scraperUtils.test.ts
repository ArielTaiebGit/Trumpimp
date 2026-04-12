import { parsePrice, gbpToEur, delay, randomDelay } from "../../scrapers/utils";

describe("parsePrice", () => {
  // ── Standard formats ────────────────────────────────────────────────────────

  it("parses plain integer", () => {
    expect(parsePrice("29")).toBe(29);
  });

  it("parses decimal with dot separator", () => {
    expect(parsePrice("29.99")).toBe(29.99);
  });

  it("parses decimal with comma separator (EU)", () => {
    expect(parsePrice("29,99")).toBe(29.99);
  });

  it("parses price with € symbol", () => {
    expect(parsePrice("€29,99")).toBe(29.99);
  });

  it("parses price with € symbol and space", () => {
    expect(parsePrice("€ 29,99")).toBe(29.99);
  });

  it("parses price with EUR text", () => {
    expect(parsePrice("29.99 EUR")).toBe(29.99);
  });

  // ── European thousand-separator format ───────────────────────────────────────

  it("parses European thousand-separator: 1.299,99 → 1299.99", () => {
    expect(parsePrice("1.299,99")).toBe(1299.99);
  });

  it("parses high-value item (graphics card, e.g. €1.399,00)", () => {
    expect(parsePrice("€ 1.399,00")).toBe(1399.0);
  });

  it("parses four-digit with thousands separator: 2.399,99", () => {
    expect(parsePrice("2.399,99")).toBe(2399.99);
  });

  // ── Philips OneBlade real-world price strings ────────────────────────────────

  it("parses Amazon.es price: '24,99 €'", () => {
    expect(parsePrice("24,99 €")).toBe(24.99);
  });

  it("parses MediaMarkt price: '29.99€'", () => {
    expect(parsePrice("29.99€")).toBe(29.99);
  });

  it("parses PCComponentes price: '27,50 €'", () => {
    expect(parsePrice("27,50 €")).toBe(27.5);
  });

  // ── Edge cases ────────────────────────────────────────────────────────────────

  it("returns null for empty string", () => {
    expect(parsePrice("")).toBeNull();
  });

  it("returns null for non-numeric string", () => {
    expect(parsePrice("Out of stock")).toBeNull();
  });

  it("returns null for currency symbol only", () => {
    expect(parsePrice("€")).toBeNull();
  });

  it("parses price with leading/trailing whitespace", () => {
    expect(parsePrice("  29,99  ")).toBe(29.99);
  });

  it("parses whole-euro price (no cents)", () => {
    expect(parsePrice("€ 30")).toBe(30);
  });

  it("parses GBP price (Amazon.co.uk format)", () => {
    expect(parsePrice("£21.99")).toBe(21.99);
  });
});

// ─── gbpToEur ─────────────────────────────────────────────────────────────────

describe("gbpToEur", () => {
  it("converts GBP to EUR using approximate rate", () => {
    const eur = gbpToEur(21.99);
    // rate ≈ 1.17 → £21.99 ≈ €25.73
    expect(eur).toBeGreaterThan(21.99);
    expect(eur).toBeCloseTo(25.73, 1);
  });

  it("result has at most 2 decimal places", () => {
    const eur = gbpToEur(10.99);
    const decimals = (eur.toString().split(".")[1] ?? "").length;
    expect(decimals).toBeLessThanOrEqual(2);
  });

  it("converts 0 GBP to 0 EUR", () => {
    expect(gbpToEur(0)).toBe(0);
  });
});

// ─── delay / randomDelay ──────────────────────────────────────────────────────

describe("delay", () => {
  it("resolves after the specified milliseconds", async () => {
    const start = Date.now();
    await delay(50);
    expect(Date.now() - start).toBeGreaterThanOrEqual(40);
  });
});

describe("randomDelay", () => {
  it("resolves within the specified range", async () => {
    const start = Date.now();
    await randomDelay(10, 50);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(5);
    expect(elapsed).toBeLessThan(200); // generous upper bound for slow CI
  });
});
