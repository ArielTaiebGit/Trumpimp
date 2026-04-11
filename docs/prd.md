# WishWatch — Product Requirements Document
*BMAD Phase 2: PRD*

## Features

### F1 — Wishlist Management
- Add item by: search query, product URL, or manual entry
- Fields: name, category (game / clothing / device / book / shoes / other), image, notes
- Max 20 items (v1 constraint)
- Swipe to remove, drag to reorder
- Category icons and colour-coded labels

### F2 — Retailer Coverage (EU)
**Spain:** Amazon.es, El Corte Inglés, MediaMarkt.es, PCComponentes, Fnac.es, Worten.es, GAME.es  
**Pan-EU / ships to Spain:** Amazon.de, Amazon.fr, Amazon.it, Amazon.co.uk, Zalando.es, ASOS.com, Cdiscount.fr  
Each scrape captures: price, currency (converted to EUR), in-stock flag, ships-to-Barcelona flag, shipping cost estimate.

### F3 — Daily Price Scan
- Backend cron job runs once per day (configurable time, default 08:00 CET)
- On first add: immediate scan triggered
- Results stored as time-series price records per item × retailer
- Currency conversion (GBP → EUR) applied automatically

### F4 — Deal Intelligence
**Deal Score (0–100):** composite of:
- % below 90-day average price (40pts)
- % below all-time low (30pts)
- Free or cheap shipping bonus (15pts)
- In-stock bonus (15pts)

**Deal Badge:** shown on item card when Deal Score ≥ 60  
**"Best Ever" tag:** shown when current price ≤ all-time low recorded

### F5 — Price History
- Line chart per item showing price over time per retailer
- Toggle between retailers
- Markers for "all-time low" and "90-day avg"
- X-axis: last 90 days; Y-axis: EUR price

### F6 — Notifications
- Push notification when Deal Score rises above 70
- In-app badge count on Deals tab = number of active deals with score ≥ 60
- Notification payload: item name, best price, retailer, deal score
- Tapping notification opens ItemDetail screen

### F7 — Settings
- Shipping destination (default: Barcelona, Spain)
- Daily scan time preference
- Notification on/off toggle per item
- Theme (light / dark / system)

### F8 — Authentication (v2 scaffold in v1)
- Local device user in v1 (no login required)
- Schema designed for multi-user from day one (userId field on all records)
- JWT auth endpoints stubbed, not enforced in v1

## User Stories

### Epic 1 — Core Setup
- As a user, I can open the app and see my empty wishlist with a clear CTA to add my first item
- As a user, I can add an item by typing a product name and selecting from search results
- As a user, I can add an item by pasting a product URL from a supported retailer

### Epic 2 — Deal Dashboard
- As a user, I can see my wishlist with each item's best current price and the retailer offering it
- As a user, I can see a Deal Score badge on items that are currently a good deal
- As a user, I can sort my wishlist by: deal score, price (low→high), recently added

### Epic 3 — Item Detail & Price History
- As a user, I can tap an item to see all retailer prices side by side
- As a user, I can see a price history chart for the last 90 days
- As a user, I can see whether each retailer ships to my location and at what cost

### Epic 4 — Notifications
- As a user, I receive a push notification when a wishlist item hits its best-ever price
- As a user, I see a badge on the Deals tab indicating how many active deals exist

### Epic 5 — Settings & Personalisation
- As a user, I can change my shipping destination
- As a user, I can toggle dark mode

## Acceptance Criteria
- App loads in <2s on device
- Scrape completes for all items within 5 minutes of cron trigger
- Price chart renders for any item with ≥2 data points
- Push notifications work on both iOS and Android (via Expo)
