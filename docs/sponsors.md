# Sponsor Strategy & Implementation

This document outlines the "Why, What, and How" of the sponsorship strategy for **lalbagh.top**, focusing specifically on the value proposition and implementation from the sponsor's perspective.

## 1. The "Why": The Value Proposition for Sponsors

Sponsors are the core monetization driver for lalbagh.top from day one. For local businesses and brands, Lalbagh Botanical Garden represents massive foot traffic. lalbagh.top converts this passive foot traffic into measurable, highly targeted digital engagement. 

**Key Benefits to Sponsors:**
* **Contextual & Location-Based:** We don't just show ads; we show ads *when* the user is physically near the sponsor's location or a strategically relevant zone (Geofencing).
* **Provable ROI (Analytics):** Unlike physical billboards where reach is a guess, lalbagh.top tracks concrete data through offline-resilient analytics:
  * `sponsor_impression`: When the sponsor's marquee is visible on the screen.
  * `sponsor_tap`: Active interest (user opening the modal).
  * `sponsor_ad_watch_duration`: Highly valuable metric tracking engagement time.
  * `sponsor_zone_arrived`: Verified real-world foot traffic to the sponsor's location.
  * `zone_dwell_time`: Proof that users are lingering in a sponsor zone, not just walking past.
* **Non-Intrusive UX:** Ads never auto-play. The user opts in, which means when a user watches a sponsor video, it is a high-intent, high-quality interaction.

## 2. The "What": Features & Placements

What exactly does a sponsor get for their investment? 

* **Sponsor Zones (Geofences):** A physical zone defined by a central Point of Interest (POI) and a radius (e.g., 20 meters). When a user steps into this zone, the brand "activates".
* **Sticky Sponsor Marquee:** A constantly visible, aesthetically pleasing sticky footer marquee overlaid on the AR camera feed and 2D map.
* **Opt-in Sponsor Creative Modal:** Tapping the marquee opens an immersive `SponsorCard` modal. This displays the sponsor's native commercial and actionable CTAs.

### Available Packs
- **August Burst Campaign (Short-term):**
  - **August Independence Pack:** 2 zones (₹2,026, ends 2026-08-31)
- **The 2026 Season Pass (Long-term):**
  - **Silver Pack:** 2 zones (₹5,000, ends 2026-12-31)
  - **Gold Pack:** 5 zones (₹7,500, ends 2026-12-31)

## 3. The "How": Technical Implementation

How do we actually manage, serve, and track this?

* **Producer Admin UI (Visual Ledger):** Sponsors are visually plotted on a bird's-eye map by administrators. We can instantly update or delete sponsor details, assign them to zones, and upload creatives directly via the Admin panel.
* **Data & Storage:** 
  * Relational data (`sponsors` & `sponsor_analytics`) lives in Supabase Postgres, including details like `email`, `plan`, `end_date`, and `zone_ids`.
  * Media creatives (MP4, PNG, JPG) are stored in Supabase Buckets.
* **Performance & Delivery:** Sponsor media URLs are heavily cached at the edge via Cloudflare CDN. 
* **Offline Resilience:** Sponsor creatives and data are cached by the Service Worker (Workbox) on first load.

## 4. Manual SQL Onboarding

Before a sponsor can be assigned in the Producer Map Editor, their account must be created in the database.

```sql
-- ---------------------------------------------------------------------------------
-- ONBOARD SPONSOR SQL SCRIPT
-- ---------------------------------------------------------------------------------
-- Step 1: Run this script directly in the Supabase SQL Editor.
-- Step 2: Go to the Producer Map Editor (Admin Panel).
-- Step 3: Draw a Sponsor Zone around a POI and assign this newly created sponsor.
-- Step 4: Click 'Save Map' in the Producer. The mobile app will sync instantly!
-- ---------------------------------------------------------------------------------

INSERT INTO sponsors (
    name, 
    email, 
    password, 
    plan, 
    end_date, 
    tagline, 
    cta_link,
    logo_asset,
    creative_asset
) VALUES (
    'Brand Name (e.g. Cakewala)', 
    'sponsor@brand.com', 
    'securepassword123',  -- The first password must be set here manually
    'gold',               -- Plan tier (e.g., gold, silver, 2026_pack)
    '2026-12-31 23:59:59Z', -- end_date: Use '2026-08-31 23:59:59Z' for 2026 Pack, '2026-12-31 23:59:59Z' for Silver/Gold
    'Exclusive 10% off when you visit our stall near the Glass House!', 
    'https://brand.com/offer',
    'https://url-to-logo-image.png',
    'https://url-to-creative-image-or-video.mp4'
);

-- Note: zone_ids will initially be '[]' and is managed visually via the Producer Map Editor.
```
