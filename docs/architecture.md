# WishWatch — Architecture Document
*BMAD Phase 3: Architecture*

## System Overview

```
┌─────────────────────────────────────────────────┐
│            React Native App (Expo)               │
│   iOS · Android · Web (same codebase)            │
│                                                  │
│  Screens: Dashboard · ItemDetail · AddItem       │
│           DealsTab · Settings                    │
│  State:   Zustand (local) + React Query (server) │
│  Notifications: Expo Push Notifications          │
└────────────────────┬────────────────────────────┘
                     │ HTTP REST (Axios)
                     │
┌────────────────────▼────────────────────────────┐
│             Node.js / Express API                 │
│             TypeScript · Port 3000               │
│                                                  │
│  Routes: /items · /prices · /deals · /scrape     │
│  Jobs:   node-cron (daily 08:00 CET)             │
│  Auth:   JWT stub (enforced in v2)               │
└──────┬─────────────────────┬────────────────────┘
       │                     │
┌──────▼──────┐    ┌─────────▼──────────────────┐
│  SQLite DB  │    │    Scraping Service          │
│  (Prisma)   │    │                              │
│             │    │  Cheerio + Axios (static)    │
│  WishlistItem│   │  Puppeteer (JS-heavy sites)  │
│  PriceRecord│    │                              │
│  PriceAlert │    │  Retailers:                  │
│  User       │    │   Amazon.es/de/fr/it/co.uk   │
└─────────────┘    │   Zalando.es                 │
                   │   MediaMarkt.es              │
                   │   PCComponentes.com          │
                   │   Fnac.es                    │
                   │   ASOS.com                   │
                   └──────────────────────────────┘
```

## Database Schema (Prisma / SQLite)

```prisma
model User {
  id        String   @id @default(cuid())
  deviceId  String   @unique
  createdAt DateTime @default(now())
  items     WishlistItem[]
}

model WishlistItem {
  id          String   @id @default(cuid())
  userId      String
  name        String
  description String?
  imageUrl    String?
  category    String   // game|clothing|device|book|shoes|other
  searchQuery String?
  addedAt     DateTime @default(now())
  sortOrder   Int      @default(0)
  notifyEnabled Boolean @default(true)
  user        User     @relation(fields: [userId], references: [id])
  prices      PriceRecord[]
}

model PriceRecord {
  id            String   @id @default(cuid())
  itemId        String
  retailer      String   // amazon_es|amazon_de|zalando|mediamarkt|etc
  price         Float    // in EUR
  currency      String   @default("EUR")
  url           String
  inStock       Boolean  @default(true)
  shipsToSpain  Boolean  @default(true)
  shippingCost  Float    @default(0)
  recordedAt    DateTime @default(now())
  item          WishlistItem @relation(fields: [itemId], references: [id], onDelete: Cascade)
}
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/health | Health check |
| GET | /api/items | List all wishlist items with latest prices |
| POST | /api/items | Add new wishlist item |
| PATCH | /api/items/:id | Update item (name, order, notify) |
| DELETE | /api/items/:id | Remove item |
| GET | /api/items/:id/prices | Price history for one item |
| GET | /api/deals | All items sorted by deal score |
| POST | /api/scrape/item/:id | Trigger immediate scrape for one item |
| POST | /api/scrape/all | Trigger full scrape (all items) |
| GET | /api/stats | Summary stats for dashboard header |

## Deal Score Algorithm

```
dealScore = 0

priceVsAvg90  = (avg90 - currentPrice) / avg90  // positive = below avg
priceVsAllTime = (allTimeLow - currentPrice) / allTimeLow  // positive = at/below ATL

if priceVsAvg90 > 0:  dealScore += min(priceVsAvg90 * 200, 40)  // max 40pts
if priceVsAllTime >= 0: dealScore += 30  // at or below all-time low
if shippingCost == 0:  dealScore += 15
if inStock:           dealScore += 15

dealScore = max(0, min(100, round(dealScore)))
```

## Scraping Strategy

Each retailer has a dedicated scraper module:
- **Input**: search query or product URL
- **Output**: `{ price, currency, url, inStock, shipsToSpain, shippingCost, imageUrl, productName }`

Rate limiting: 2–5s delay between requests, randomised user-agent rotation.
Robots.txt compliance: scrapers respect crawl delays.

## Frontend State Management

- **Zustand store**: wishlist items, settings (location, theme, notifications)
- **React Query**: server data fetching, caching (5min stale time), background refetch
- **Expo SecureStore**: device ID, push token

## Push Notification Flow

1. On app first launch, request permission and register Expo push token
2. Token sent to backend `POST /api/notifications/register`
3. After each scrape, backend evaluates deal scores
4. If score ≥ 70 AND score increased since last notification: send via Expo Push API
5. App receives notification → updates badge count

## Tech Stack Summary

| Layer | Technology |
|-------|------------|
| Mobile/Web | Expo SDK 51, React Native 0.74, TypeScript |
| Navigation | Expo Router v3 (file-based) |
| State | Zustand 4 + TanStack Query 5 |
| Styling | StyleSheet + custom design tokens |
| Charts | react-native-gifted-charts |
| HTTP Client | Axios |
| Backend | Node.js 22, Express 4, TypeScript |
| ORM | Prisma 5 + SQLite |
| Scraping | Cheerio 1.0 + Axios, Puppeteer (optional) |
| Scheduler | node-cron |
| Notifications | Expo Push Notifications (server-side SDK) |
| Auth (v2) | JWT + bcrypt |
