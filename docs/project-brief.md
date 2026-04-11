# WishWatch — Project Brief
*BMAD Phase 1: Project Brief*

## Vision
A personal shopping deals dashboard that monitors wishlisted products across major European retailers, surfacing the best deals daily with price history, stock status, and shipping intelligence — all personalised for a user based in Barcelona, Spain.

## Problem Statement
Tracking prices across Amazon.es, Zalando, MediaMarkt, FNAC, PCComponentes and other EU retailers is manual, fragmented, and time-consuming. Price drops are missed, deals expire, and there is no single place to know "is now a good time to buy this?"

## Goals
1. Let the user curate a wishlist of up to ~20 items (any category: games, clothing, tech, books, shoes, etc.)
2. Automatically scan major EU retailers daily for current prices and availability
3. Surface whether today's price is historically low
4. Show shipping cost + availability to Barcelona, Spain
5. Notify via push notification and in-app badge when a significant deal appears

## Non-Goals (v1)
- Multi-user / social features (planned for later)
- Price alerts with custom thresholds (v2)
- Automatic purchasing / cart integration
- Non-EU retailers

## Target User
Solo user (the owner) — power-aware consumer who wants a curated, intelligent shopping assistant, not a generic deal aggregator.

## Success Metrics
- User can add an item and see prices from ≥3 retailers within 24h of adding
- Push notification delivered within 1h of a deal crossing the "best price" threshold
- Price history graph populated after 7 days of tracking

## Platforms
- React Native (Expo) — iOS + Android native
- Expo Web — same codebase runs in browser
