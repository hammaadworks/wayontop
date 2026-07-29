# Lalbagh AR Navigator — Product Requirements Document

**Domain:** lalbagh.top
**Target launch:** Lalbagh Independence Day Flower Show, expected Aug 5–15, 2026
**Build window:** 3 days
**Owner:** Hammaad (solo founder)

---

## 1. Overview

A mobile-web AR wayfinding app for the 240-acre Lalbagh Botanical Garden. Visitors open a link in their phone browser (no app install), point their camera, and see a directional arrow guiding them to a chosen point of interest (POI) via the shortest walkable path. Monetized through zone-based local business sponsorships. Basically an explore app companion for Lalbagh (and other vernues of wayon.top).

This is also the first deployment of a reusable internal-mapping methodology intended to become the foundation of a future company, **wayon.top**, providing indoor/venue wayfinding for other locations (malls, Wonderla, Cubbon Park, etc.).

## 2. Goals

- Ship a working, reliable AR navigator before the show opens
- Cross-browser: iOS Safari + Android Chrome, mobile only
- Fully anonymous, no login/signup friction
- Sponsor monetization live from day one
- Path data collection process documented as a reusable SOP for wayon.top

## 3. Non-Goals (explicitly out of scope for this build)

- No true vision-based/SLAM AR (camera-recognized pathways) — out of reach for a 4-day browser build; camera pass-through + UI overlay is the target
- No native app / app store distribution
- No BLE beacons (cost + Lalbagh admin may relocate hardware; revisit after 1 year)
- No desktop experience or user accounts. But user can post any achievemts they unlock in the app on social media from their accounts.

## 4. System Architecture

Two decoupled systems, connected only by a shared JSON data format:

**A. Producer (internal mapping tool)** — used only by wayon.top core team before launch, to generate the path graph and POI/sponsor data.

**B. Consumer (public AR navigator)** — what visitors use. Loads the graph JSON, renders the camera-based AR overlay, computes routes client-side.

This split is deliberate: venue #2 under wayon.top may need a completely different producer workflow (e.g., indoor beacon-based instead of GPS-based) while reusing the same consumer app shell.

---

## 5. Tech Stack

### Consumer app (public-facing)
| Layer | Choice | Why |
|---|---|---|
| Framework | React + Vite (TypeScript) | Fast dev loop, small bundle, the most in-demand modern web stack right now, and the one AI coding agents handle most reliably |
| Styling | Tailwind CSS + shadcn/ui components | Fastest path to a polished, beautiful, consistent UI without hand-rolling CSS — utility-first, highly in-demand, and pragmatic for a solo builder on a 7-day clock |
| Icons | lucide-react | Clean, modern icon set, tiny footprint, pairs naturally with Tailwind/shadcn |
| Localization | English + Kannada, toggle in-app (i18next or a simple JSON string map) | Lalbagh's own signage is bilingual; a meaningful share of visitors will be more comfortable in Kannada. All POI names, UI labels, and onboarding text need both languages from day one — retrofitting i18n later is far more expensive than building it in from the start |
| AR rendering | Raw camera feed via `getUserMedia` + Canvas/CSS overlay | **Not WebXR** — iOS Safari does not support the WebXR Device API at all. True cross-browser AR here means: video element as background, arrow drawn on a canvas/DOM layer on top, positioned using compass + GPS math. This is "camera pass-through AR," not spatial AR. |
| Orientation | `DeviceOrientationEvent` (iOS requires explicit `requestPermission()` behind a user tap; Android/Chrome does not) | Two code paths required — test on real devices, not emulators |
| Location | `navigator.geolocation.watchPosition()` | Continuous GPS stream, smoothed with a moving average |
| Pathfinding | Client-side A* over the graph JSON | Runs instantly at this graph size, no backend round-trip needed |
| Offline resilience | Service Worker (Workbox) + Cache API | Graph JSON, POI data, and sponsor creatives cached on first load — critical given crowd-day network congestion |
| Installability | Web App Manifest (`manifest.json`) | Lets users "Add to Home Screen" without an app store, while staying a website |
| Hosting | Vercel or Netlify (static) | Zero-ops deploy, custom domain support for lalbagh.top |

### Backend (lightweight)
| Layer | Choice | Why |
|---|---|---|
| Analytics + sponsor event logging | Supabase (Postgres + edge functions) | Fast to stand up, generous free tier, handles sponsor impression/tap/visit logging without you managing a server |
| Graph, POI, and sponsor *content* data | Supabase Postgres, stored as `jsonb` blobs in a single `content_blobs` table (`key`, `data jsonb`, `version int`, `updated_at`) — keys: `graph`, `stamps`, `sponsors` | Fully customizable post-launch: edit directly via the Supabase table editor or API, no file re-upload, no redeploy, no code change. The Producer tool (Agent 3 below) writes directly to this table via the Supabase client instead of exporting a file. App fetches by key at runtime and caches locally; bumping `version` tells the Service Worker to re-fetch |

### Pragmatic shortcuts (single-venue jugaad — intentional, not laziness)

Since this is one venue with a handful of sponsors, don't build infrastructure sized for wayon.top yet — that generalization is a deliberate v2 refactor once the model is proven, not a day-1 requirement:

- **Sponsor creative management via a shared Google Drive folder**, not an admin dashboard/CMS. You manually drop updated banner/video assets in, rebuild, redeploy. Building a proper sponsor content-management UI for a handful of sponsors is days of work saved for zero benefit at this scale.
- **No multi-tenant database design.** One venue, one `graph.json`. Multi-venue architecture is a real engineering problem worth solving properly later, with real data from this launch informing the design — not guessed at now under a 7-day deadline.
- **Manual sponsor invoicing/payment** (UPI/bank transfer, tracked in a spreadsheet) instead of building any payment integration. Nobody needs a checkout flow for 4-6 local sponsor deals.

Goal: Successfully onboard 20 sponsors with 5K investment each or hit 100K monetary target.

### Producer app (internal mapping tool)
| Layer | Choice | Why |
|---|---|---|
| Base layer | Leaflet.js + Esri World Imagery (free satellite tiles) | No Mapbox/Google Maps billing needed for a one-person internal tool |
| Editor | Leaflet drawing plugin — drop POI pins, draw path edges, tag names/distances | Lets you snap GPS breadcrumbs to the visible path in the satellite image |
| Output | Exports a single `graph.json` matching the schema below | This file is the entire handoff between producer and consumer |
| GPS capture in the field | Any GPS breadcrumb logger (a simple custom page using `watchPosition` is enough) | Raw trail is reference data, not final — you'll clean it against satellite imagery afterward, not use it directly |

---

## 6. Data Schema (`graph.json`)

```json
{
  "nodes": [
    { "id": "n1", "name": "North Gate", "lat": 12.9500, "lng": 77.5850, "type": "gate" },
    { "id": "n2", "name": "Glass House", "lat": 12.9495, "lng": 77.5847, "type": "poi" },
    { "id": "n3", "name": "Path Junction A", "lat": 12.9497, "lng": 77.5849, "type": "junction" }
  ],
  "edges": [
    { "from": "n1", "to": "n3", "distance_m": 85 },
    { "from": "n3", "to": "n2", "distance_m": 40 }
  ],
  "sponsors": [
    {
      "id": "s1",
      "name": "MTR",
      "zone_node_ids": ["n1"],
      "banner_asset": "mtr-banner.png",
      "video_asset": "mtr-ad.mp4"
    }
  ]
}
```

- `type: "junction"` nodes exist purely for routing — not shown to the user as a destination, just used by A* to route through the actual path shape.
- `zone_node_ids` lets a sponsor cover more than one node (e.g., "North Gate area").

**`stamps.json`** (deliberately separate from POIs — a stamp does not have to be a navigable destination, e.g. a hidden "secret spot" with no arrow guiding to it):

```json
{
  "version": 1,
  "stamps": [
    { "id": "st1", "name": "Glass House", "lat": 12.9495, "lng": 77.5847, "rarity": "common", "poi_link": "n2" },
    { "id": "st2", "name": "Hidden Bonsai Corner", "lat": 12.9488, "lng": 77.5832, "rarity": "rare", "poi_link": null }
  ]
}
```

Adding a new stamp later — including ones with no matching POI — is just adding an entry to this file and re-uploading it; no app rebuild required.

---

## 7. Core Features (Phase 1 MVP — 4-Day Build)

*Focus entirely on 10x UX and 10x Revenue opportunities.*

1. **"AI" Intent-Based Search** — Instead of a plain list of POIs, users type "Roses", "Kids area", or "Sunset". A local fuzzy-search maps intent to POIs instantly. Feels magical.
2. **Best Route Preview** — Instead of just "Go to Glass House", the UI shows "You'll pass: Lotus Pond, Restroom, Coffee (ETA: 12 mins)".
3. **Live POI Cards** — Expand POIs with real value: "Why it's famous", "Best photo spot", "How crowded", "Interesting facts".
4. **Smart Route Optimisation** — Pre-baked thematic routes like "Best 60-minute walk", hitting the highlights efficiently.
5. **Photo Spots & Facilities Quick-filters** — One-tap buttons for "Instagram Spots" (sunset, macros) and "Facilities" (Washroom, Water, Exit).
6. **Premium AR View & Radar** — Live camera feed with a buttery-smooth directional arrow overlay (powered by dual-source compass fusion to prevent jitter) and a dynamic Radar mini-map in the corner. This "glitter" is non-negotiable for the 100% UX goal.
7. **Treasure Hunt & Stamp Animations** — Gamification loop where visiting POIs unlocks beautifully animated stamps (using Framer Motion). This creates the dopamine hit necessary for the viral social-share loop.
8. **Offline-first data load** — Graph, POI, and assets cached on first load via Service Worker.
9. **UI-UX-Performance-100%** — The design must feel the beat and leave a positive impact on the customer, you can use better tools/frameworks but no compromises on the magical ui ux performance. It must feel like Disney level magical fancy experiences.

### 7.2 Non-Functional Requirements (The 100% UX Promise)
*Where the UI/UX magic happens and devs must not compromise.*

1. **UI-UX-Performance-100% (Disney-Level Magic)** — The design must feel immersive. 60fps animations, frosted glass panels, and the Live POI Cards must exactly mimic the polished aesthetic of Instagram Stories (IG Instants).
2. **Offline-first Resilience** — Graph, POI, and assets cached on first load via Service Worker. Essential for crowd-day cell congestion.
3. **Battery & Thermal Efficiency** — Continuous camera + GPS + orientation sensors is heavy. The app must fallback gracefully to a beautifully designed 2D map if GPS is poor or thermal throttling occurs.

## 8.5 Analytics Events (three purposeful tiers — no vanity events)

**Tier 1 — Sponsor-facing** (proves ad value, drives renewals)

| Event | Captures | Why it matters commercially |
|---|---|---|
| `session_start` | New visitor session begins | Total reach — the denominator every sponsor stat is measured against ("your zone reached X% of Y total visitors") |
| `sponsor_impression` | Sponsor's footer marquee slot is shown on screen | Baseline visibility count, standard ad-metric sponsors already understand |
| `sponsor_tap` | User taps the footer banner to open the ad modal | Active interest, not just passive display |
| `sponsor_ad_watch_duration` | Time spent with the modal open (video/creative) | Distinguishes a real look from an instant close — this is your strongest "engagement," not just "impression," metric |
| `sponsor_zone_arrived` | GPS-proximity-confirmed physical arrival at a sponsor's node | **Your single most valuable data point** — verified real-world foot traffic at a sponsor's location, something no billboard or generic ad can prove |
| `route_selected_to_sponsor_zone` | User picked a sponsor zone as their destination | Signals the navigator itself is driving intentional traffic toward a sponsor |

**Tier 2 — Boast factor** (what you post, screenshot, and show off)

| Event | Captures | Why it's boast-worthy |
|---|---|---|
| `stamp_collected` | Each individual stamp unlock | Rolls up into "X,XXX stamps discovered across all visitors" — a real, quotable number |
| `all_stamps_collected` | Full "Lalbagh Explorer" completion | "XXX visitors fully explored all 22 spots of Lalbagh" — strong press-line material |
| `cumulative_distance_walked` | Sum of route distances per session | "Visitors collectively walked XXX km through Lalbagh this week" — the kind of number that's fun, real, and shareable |
| `share_button_tapped` | User taps "share" on the completion screen | Raw count of people proud enough of the app to want to show someone |

**Tier 3 — Investor-facing (The Intent Graph)**

Don't just record *where* people walked. Record *why*. This is the core data moat for wayon.top as a physical decision engine.

| Event | Captures | Why this is the honest "pour money in" case |
|---|---|---|
| `search_intent` | Raw search queries mapped to selected destinations | "People looking for flowers usually visit Bonsai next" |
| `route_divergence` | Did they follow the route or wander off to coffee? | Maps real human behavior against optimal paths |
| `coupon_conversion` | GPS-confirmed arrival after viewing a digital coupon | Proves undeniable, trackable ROI for sponsors |
| `session_start` | Day-over-day session growth & retention | Proves organic pull and sticky product value |

Post-event, a simple weekly Supabase query per tier (Tier 1 for sponsors, Tier 2 for your own marketing, Tier 3 for any investor conversation) is your entire reporting deliverable — no dashboard UI needed for v1, raw query output is enough.

**One honest caveat:** Tier 3 numbers only mean something with more than one data point over time — a single flower show's numbers are a snapshot, not a trend. If you're serious about the investor angle, the real ask is running this again at the next event (or a second venue) so you have a *repeat* to point to, not just one strong week.

## 9. Key Engineering Caveats (do not skip)

- **iOS Safari ≠ Android Chrome** for both orientation and camera permission flows. Build and test both paths from day one, on real devices.
- **GPS accuracy degrades significantly under Lalbagh's dense canopy** (multipath + attenuation error, potentially 15–50m off). The fallback 2D map and junction-node routing exist specifically to make this survivable.
- **Compass drifts near metal** (gates, railings) — this is why dual-source fusion is in scope, not optional polish.
- **Raw GPS breadcrumbs from field walking are noisy** — always clean/snap against satellite imagery in the producer tool before exporting `graph.json`. Never ship raw walked coordinates directly.
- **Cell congestion on show days is expected** — nothing user-facing should depend on a live network call after first load.
- **Battery/heat** — continuous camera + GPS + orientation sensors is heavy; test for thermal throttling during a real multi-hour outdoor session, not just a quick desk test.
- **Sponsor modal must be tap-to-open only** — never auto-play, to protect the walking-navigation UX that's the actual product.

## 10. Field Mapping SOP (reusable for wayon.top)

1. Load satellite base layer of the venue in the producer tool.
2. Walk each path segment with GPS breadcrumb logging active; tag POIs/junctions by name as you pass them. Walk each segment more than once if possible to average out drift.
3. In the producer tool, manually snap breadcrumb points to the actual visible path in the satellite image — this manual correction step is mandatory, not optional.
4. Draw edges between nodes, assign real walked distances.
5. Tag sponsor zone coverage per node.
6. Export `graph.json`, load into the consumer app, test on-site before go-live.

## 12. Open Decisions

- Sponsor sales: which zones/businesses are confirmed, and by when — this gates how many sponsor slots exist at launch
- Final POI list (how many destinations to support in v1)
- Analytics dashboard: raw Supabase queries are fine for v1, no need for a built UI yet
