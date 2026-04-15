# WishWatch — Handoff Document

> **Status: POC on hold as of April 2026.**
> This document captures where development stopped, what works, what is broken, and what is needed to ship a functional v1 app.

---

## What Was Built

### Backend (`wishwatch-backend/`)

A Node.js / Express / TypeScript REST API backed by SQLite via Prisma.

| Area | Status | Notes |
|------|--------|-------|
| REST API (`/items`, `/deals`, `/stats`, `/scrape`) | Working | All routes implemented and tested |
| Prisma schema + migrations | Working | SQLite, schema supports multi-user |
| Deal score algorithm | Working | 0–100 composite: vs avg90, ATL, shipping, stock |
| Scraping service (Playwright) | Partial | Amazon, Zalando, PCComponentes, Fnac, MediaMarkt scrapers written but **not verified against live sites** |
| Daily cron scan job | Not implemented | `dailyScan.ts` does not exist. Scrape is only triggered manually via `POST /api/scrape/all` |
| Device-ID auth middleware | Working | One device = one user; no real login |
| TDD test suite | 103 tests, all green | Run with `npm test` |
| Push notifications | Partial | `sendDealNotifications` wired, Expo push token registration exists, not verified end-to-end |

### Frontend (`wishwatch-app/`)

React Native + Expo app targeting iOS, Android, and Web from a single codebase.

| Screen | Status | Notes |
|--------|--------|-------|
| Wishlist tab | Working | Cards with deal score, shop count, scanning pulse |
| Deals tab | Working | Sorted by score, savings %, retailer, direct open link |
| Settings tab | Working | Theme, shipping destination, scan time, notifications toggle |
| Item Detail | Working | Price history table, all retailer prices, retrigger scrape |
| Add Item flow | Partial | Manual name entry only — no product search/confirm step |
| Price history chart | Not implemented | Data exists in DB, chart UI not built |

---

## Critical Bugs to Fix Before Resuming

### 1. Items disappear on web

**Root cause:** `expo-secure-store` is a native-only module. On web, the `try/catch` in `api.ts` silently swallows the error and no `x-device-id` header is sent. The backend falls back to the literal string `"default-device"`.

This itself is consistent — the same "default-device" user persists. **But** if the backend is restarted from a different working directory, the SQLite file path (`file:./wishwatch.db`) resolves differently and a fresh empty database is used.

**Fix required:**
- Use `localStorage` as fallback for device ID on web (in `api.ts` interceptor)
- Pin the `DATABASE_URL` to an absolute path or move to a hosted database

### 2. No daily scan cron job

`wishwatch-backend/src/jobs/dailyScan.ts` was planned but never created. Prices are only refreshed when the user manually hits the refresh button or adds a new item.

**Fix required:** Create `dailyScan.ts` using `node-cron` to call `scrapeItem` for all users' items at the configured time.

### 3. Scrapers not verified against live sites

The Playwright scrapers were written against expected HTML selectors but have not been run against live retailer sites. Amazon aggressively changes its DOM and blocks headless browsers. The others likely need tuning too.

**Fix required:** Run each scraper manually, fix selectors, add a proxy/stealth layer or switch to API alternatives (see below).

---

## What the Full Product Requires

### Foundation (must-have before shipping)

1. **Hosted database** — Replace SQLite with Postgres on Railway, Supabase, or Render. One `DATABASE_URL` env var change in Prisma config. SQLite is fine for local dev but not for deployment.

2. **Real authentication** — The current device-ID system breaks across browsers, devices, and app reinstalls. Minimum viable auth: magic-link email (Resend + custom JWT) or Sign in with Apple for iOS. The schema already has a `User` model — just needs real identity behind it.

3. **Product search & confirmation step** — When a user types "Philips OneBlade", they need to see actual matching products (with image, exact model, price) and confirm before tracking. Without this, the scraper searches for a vague string and may track the wrong product. This is the single biggest UX gap.

4. **Working scrapers or a price data API** — Options in order of reliability:
   - **Keepa API** (Amazon only) — clean JSON, historical prices, free tier available. Best for Amazon coverage.
   - **SerpAPI Google Shopping** — broad coverage, simple to integrate, paid (~$50/mo for reasonable volume).
   - **Oxylabs / Bright Data** — scraping proxies with anti-bot bypass, expensive but robust.
   - **Self-built with Playwright + proxy rotation** — what's currently scaffolded. Works but requires ongoing maintenance as sites change their DOM.

5. **Daily cron scan** — `src/jobs/dailyScan.ts` needs to be created. Simple `node-cron` wrapper around `scrapeAll` for every user.

### Nice-to-have for v1

- Price history chart (data is already in the DB, just needs a chart component — Victory Native or react-native-chart-kit)
- URL-based item add (paste an Amazon/Zalando link and auto-resolve the product)
- Swipe-to-delete on wishlist cards
- Sort wishlist by deal score / price / recently added

### iOS deployment checklist

- Apple Developer account ($99/yr)
- EAS Build setup (`eas build --platform ios`)
- Expo push notifications configured with APNs certificate
- TestFlight distribution for beta testing
- App Store submission (review typically 1–3 days)

---

## Reference Apps & Prior Art

These apps solve the same problem and are worth studying for UX patterns and feature scope:

| App | Description | Link |
|-----|-------------|------|
| **Wishr / WisherAI** | Price monitor and wishlist tracker; AI-powered product matching, EU retailer coverage | https://www.wishr.app/post/wisherai-price-monitor-save-smart-and-buy-smart |
| **Keepa** | Amazon-only price history tracker; excellent charts, browser extension + app | https://keepa.com |
| **CamelCamelCamel** | Amazon price history, price drop alerts by email | https://camelcamelcamel.com |
| **Idealo** | EU price comparison aggregator; strong Spanish retailer coverage | https://www.idealo.es |
| **Google Shopping** | Broad product search with price comparison and tracking | https://shopping.google.com |
| **PriceSpy** | Price comparison with history charts; active in Spain | https://pricespy.es |

---

## Repo Structure

```
Trumpimp/
├── docs/
│   ├── prd.md               # Product Requirements Document (BMAD Phase 2)
│   ├── architecture.md      # System architecture (BMAD Phase 3)
│   └── project-brief.md     # Original project brief
├── wishwatch-backend/
│   ├── src/
│   │   ├── routes/          # items.ts, deals.ts, scrape.ts, stats.ts
│   │   ├── scrapers/        # amazon.ts, zalando.ts, pccomponentes.ts, fnac.ts, mediamarkt.ts
│   │   ├── jobs/            # notifications.ts (dailyScan.ts MISSING)
│   │   ├── middleware/      # deviceId.ts (no real auth)
│   │   └── utils/           # dealScore.ts, logger.ts, constants.ts
│   ├── prisma/
│   │   ├── schema.prisma    # SQLite DB schema
│   │   └── wishwatch.db     # Local SQLite file — DO NOT deploy this
│   └── tests/               # 103 unit + integration tests (all green)
└── wishwatch-app/
    ├── app/
    │   ├── (tabs)/          # index.tsx (wishlist), deals.tsx, settings.tsx
    │   ├── item/[id].tsx    # Item detail screen
    │   └── add-item.tsx     # Add item form (name-only, no product search)
    └── src/
        ├── components/      # WishlistCard, DealBadge, CategoryBadge, PriceRow
        ├── hooks/           # useTheme
        ├── services/        # api.ts (Axios client)
        ├── types/           # index.ts (all shared types + RETAILERS map)
        └── constants/       # index.ts (API URL, thresholds)
```

---

## How to Run Locally

```bash
# Backend
cd wishwatch-backend
npm install
npx playwright install chromium   # for scrapers
npm run dev                        # starts on :3000

# Frontend (separate terminal)
cd wishwatch-app
npm install
npx expo start --web               # or --ios / --android
```

The backend expects a `.env` file at `wishwatch-backend/.env`:
```
DATABASE_URL="file:./prisma/wishwatch.db"
PORT=3000
NODE_ENV=development
DAILY_SCAN_HOUR=8
DAILY_SCAN_MINUTE=0
```

Run tests:
```bash
cd wishwatch-backend && npm test
```

---

## Branch

All POC work lives on: `claude/shopping-deals-dashboard-HjgTK`

Last commit: `fix(app): use JS animation driver for opacity pulse on web`
