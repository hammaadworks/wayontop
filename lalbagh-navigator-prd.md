# Lalbagh AR Navigator — Product Requirements Document

**Domain:** lalbagh.top
**Target launch:** Lalbagh Independence Day Flower Show, expected Aug 5–15, 2026
**Build window:** 3 days
**Owner:** Hammaad (solo founder)

---

## 1. Overview

A mobile-web AR wayfinding app for the 240-acre Lalbagh Botanical Garden. Visitors open a link in their phone browser (no app install), point their camera, and see a directional arrow guiding them to a chosen point of interest (POI) via the shortest walkable path. Monetized through zone-based local business sponsorships. Basically an explore app companion for Lalbagh (and other venues of wayon.top).

This is also the first deployment of a reusable internal-mapping methodology intended to become the foundation of a future company, **wayon.top**, providing indoor/venue wayfinding for other locations (malls, Wonderla, Cubbon Park, etc.).

## 2. Goals

- Ship a working, reliable AR navigator before the show opens
- Cross-browser: iOS Safari + Android Chrome, mobile only
- Fully anonymous, no login/signup friction
- Sponsor monetization live from day one (Goal: Onboard 20 sponsors with 5K investment each or hit 100K monetary target via manual 'jugaad' workflows for now)
- Path data collection process documented as a reusable SOP for wayon.top

## 3. Non-Goals (explicitly out of scope for this build)

- No true vision-based/SLAM AR (camera-recognized pathways) — out of reach for a 4-day browser build; camera pass-through + UI overlay is the target
- No native app / app store distribution
- No BLE beacons (cost + Lalbagh admin may relocate hardware; revisit after 1 year)
- No desktop experience or user accounts. But user can post any achievemts they unlock in the app on social media from their accounts.

## 4. System Architecture

Two decoupled systems, connected only by a shared JSON data format:

**A. Producer (internal mapping tool)** — used only by wayon.top core team before launch, to generate the path graph and POI/sponsor data. It includes full management capabilities to successfully onboard sponsors to specific zones or location radii, including the ability to instantly update or delete sponsor details and asset creatives.

**B. Consumer (public AR navigator)** — what visitors use. Loads the graph JSON, renders the camera-based AR overlay, computes routes client-side.

This split is deliberate: venue #2 under wayon.top may need a completely different producer workflow (e.g., indoor beacon-based instead of GPS-based) while reusing the same consumer app shell.

---

## 5. Tech Stack

### Consumer app (public-facing)
| Layer | Choice | Why |
|---|---|---|
| Framework | React + Vite (TypeScript) | Fast dev loop, small bundle, the most in-demand modern web stack right now, and the one AI coding agents handle most reliably |
| Styling | Tailwind CSS + shadcn/ui components | Fastest path to a polished, beautiful, consistent UI without hand-rolling CSS — utility-first, highly in-demand, and pragmatic. |
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

- **Sponsor Management via Supabase UI / Basic Producer Admin**, avoiding heavy CMS development but still providing full CRUD (Create, Read, Update, Delete). This ensures we have all measures taken to successfully onboard a sponsor to a specific zone/location radius, and we can seamlessly update or delete their details and creatives on the fly without a code rebuild.
- **No multi-tenant database design.** One venue lalbagh, the producer stores the mapping data in the Supabase.
- **Manual sponsor invoicing/payment** (UPI/bank transfer, tracked in a spreadsheet) instead of building any payment integration. Nobody needs a checkout flow for 4-6 local sponsor deals.

Goal: Successfully onboard 20 sponsors with 5K investment each or hit 100K monetary target.

### Producer app (internal mapping tool)
| Layer | Choice | Why |
|---|---|---|
| Base layer | Leaflet.js + Esri World Imagery (free satellite tiles) | No Mapbox/Google Maps billing needed for a one-person internal tool |
| Editor | Leaflet drawing plugin — drop POI pins, draw path edges, tag names/distances | Lets you snap GPS breadcrumbs to the visible path in the satellite image |
| Sponsor Management | Admin UI (Bird's-Eye Map) | Visual ledger key map for sponsors. View sponsor zones plotted directly on the map. Adjust the radius (e.g., 20m) or change the brand, and the map updates instantly for better spatial planning. |
| Output (Incremental) | Syncs directly to Supabase | The graph is built incrementally (e.g., map half the park on day 1, the rest on day 2). The Producer app fetches the existing graph from Supabase, merges new nodes/edges, and saves it back. No manual file handoffs. |
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
      "poi_id": "n1",
      "radius_m": 20,
      "banner_asset": "mtr-banner.png",
      "video_asset": "mtr-ad.mp4"
    }
  ]
}
```

- `type: "junction"` nodes exist purely for routing — not shown to the user as a destination, just used by A* to route through the actual path shape.
- **Sponsor Zones:** Defined by a central `poi_id` and a `radius_m` (e.g., 20 meters). This creates a geofenced zone. If the user's GPS falls within this radius, the sponsor's brand activates.

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

## 7. Core Features (Phase 1 MVP — 3-Day Build)

### 7.1 Functional Requirements (The Navigation Engine)
*Ordered by critical user journey, 10x UX and 10x Revenue opportunities.*

1. **Search + AI Intent-Based Fuzzy Search** — The entry point. Instead of a plain list of POIs, users type "Roses", "Kids area", or "Sunset". A local fuzzy-search maps intent to POIs instantly. A list is also provided incase users want to search manually.
2. **Smart Route Optimisation & Previews** — The core function. The routes and distances are already mapped. If user wants to go from pointA to pointB, then the app offers shortest path routing with multipath available, just like Google Maps navigations. The AR arrow points the path, the UI shows: "You'll pass: Lotus Pond, Restroom, Coffee (ETA: 12 mins)".
3. **Premium AR View & Radar** — The actual navigation. Live camera feed with a buttery-smooth directional arrow overlay (powered by dual-source compass fusion) and a dynamic Radar mini-map.
4. **Photo Spots & Facilities Quick-filters** — Fast discovery. One-tap buttons for "Instagram Spots" (sunset, macros) and "Facilities" (Washroom, Water, Exit).
5. **POI Cards** — Certain official POI will have info cards that expand POIs with real value: "Why it's famous", "History", "Best photo spot", "How crowded", "Interesting facts".
6. **Pokémon-Style Gamification & Leaderboard** — The viral loop. 
   - **Two Tiers of Collectibles:** "Official POI Stamps" (permanent landmarks) and "Unofficial Seasonal Collectibles" (trendy, hidden spots updated per season). Normal stamps (excluding Golden) are visible on the 2D map and radar.
   - **Stamp UX & Magical Celebrations:** Think Pokémon Go style simplicity—when a user walks near a stamp with the AR camera open, the stamp graphic appears on their phone screen overlay along with a "Claim" button. Tapping the button claims it, triggering a rich, Disney-like magical celebration with confetti, audio feedback, and an animated stamp count update.
   - **The Golden Stamp (High Urgency - Online Only):** A special 1-of-1 stamp that is **never** shown on the map. No two people can claim it simultaneously; the first to claim and enter the leaderboard wins. Upon claiming, it immediately jumps to a new random verified walkable coordinate. *(Note: Do not overcomplicate network handling here. Lalbagh has strong internet coverage, so we don't need to aggressively optimize for edge-case network paradoxes on this specific feature).*
   - **Gameplay & Offline Sync:** Catching normal stamps and navigating works perfectly offline. When connectivity is available, the app silently syncs collected stamps to Supabase. 
   - **In-App Browser Blocker (Critical):** On load, if the app detects an in-app browser user agent (e.g., Instagram/Facebook), the UI must hard-block and instruct the user to tap "Open in Safari/Chrome" before they can start. This guarantees we do not lose `localStorage` session state if they switch apps.
   - **User Identity & The Leaderboard (3 Tabs - Online):** On first load, the app generates a persistent, hidden `device_uuid` in `localStorage`. All backend records and analytics tie strictly to this UUID. To drive virality, we prompt users for their Instagram handle (`@handle`), which is treated purely as an editable display name on the leaderboard. 
     1. **All Stamps Collected:** Ranked by completion time.
     2. **Most Distance Walked:** Ranked by total km walked.
     3. **Golden Stamp:** A live feed of who most recently found it.
   - **Anti-Cheat Mechanics:** Scoped down to basic client-side timestamp and distance sanity checks for v1 (to avoid heavy server-side processing for a 3-day MVP).
   - **Reset & Replay:** Users can manually reset their count to restart the hunt.

7. **Universal Viral Sharing Engine (Strava Maps, Stamps & AR Snaps)** — The boast factor. 
   - **Universal Social Share Sheet:** ANY shareable moment—whether it's the full Strava-style walked path summary, a specific stamp collection, or just an AR camera snap—invokes the native device Share Sheet.
   - **Programmatic Branding & Pre-filled Tags:** Tapping 'Share' generates the image asset, programmatically bakes in a `lalbagh.top` watermark, and invokes the Share Sheet with pre-filled text tagging `@lalbagh.top`. This elegantly delegates user verification and marketing to social media itself.
   - **Strava-Style Route Summaries:** Users can pause/resume their walk. The generated card plots their walked path, Duration, Distance, Steps, Calories, and major POIs discovered.
   - **Auto-Trigger:** The Route Summary generates automatically when detecting a physical exit from the Lalbagh gates.

*(Note: Geo-Tagged Comments and explicit user authentication have been deferred to v2 to minimize friction).*
9. **Sticky Sponsor Marquee (Revenue)** — An aesthetic, rounded, constantly visible sticky marquee that overlays the AR camera feed and 2D map (like a mobile OS menu bar). We expect to onboard 20+ sponsors covering many zones, so the marquee will dynamically update based on the user's current physical zone. **If the user is in an area with no sponsor zone coverage, it will fallback to playing a default ad (provided in the DB).** It loops tagline and brand logos with a smooth swipe-left animation (2s delay). Example for Cadbury: *[Logo] Feeling lost?* -> *swipes left* -> *[Logo] Grab a 5-star.*
10. **Opt-in Sponsor Creative Modal** — Tapping the sticky marquee opens a clean modal containing the sponsor's creative. This ensures the full ad experience is opt-in and doesn't interrupt navigation.

### 7.2 Non-Functional Requirements (The 100% UX Promise)
*Where the UI/UX magic happens and devs must not compromise.*

1. **Mobile-First Design** — The entire application is built exclusively for mobile devices. All tap targets, swipe gestures, and layouts must be optimized for thumb-reach and one-handed outdoor usage.
2. **UI-UX-Performance-100% (Disney-Level Magic)** — The design must feel immersive. 60fps animations, frosted glass panels, and the Live POI Cards must exactly mimic the polished aesthetic of Instagram Stories (IG Instants).
3. **Dopamine-Timed PWA Install** — The "Add to Home Screen" prompt must not be shown on first load. It must be precisely timed to trigger only after the user experiences high engagement (e.g., right after discovering their 3rd stamp).
4. **Offline-first Resilience** — Graph, POI, and assets cached on first load via Service Worker. Essential for crowd-day cell congestion.
5. **Battery & Thermal Efficiency** — Continuous camera + GPS + orientation sensors is heavy. The app must fallback gracefully to a beautifully designed 2D map if GPS is poor or thermal throttling occurs.
6. **Contextual & Seamless Brand Integration** — Brand commercials must be intelligently and seamlessly merged into the app experience based on context. For example, if a user has walked a long distance and the sponsor is Cakewala, the copy shouldn't feel like a disconnected ad, but rather a contextual suggestion: "Hungry after a long walk? Feel the sugar rush @ Cakewala." It must add value as a native companion.
7. **Intuitive Psychological Design & Magical Copywriting** — The app must have zero friction and require absolutely zero onboarding tutorials. Help information must be embedded directly in the UI where needed. For example, on the Golden Stamp leaderboard, a small contextual hint should explain the mechanic seamlessly: *"Open your cam, take a glance, you might just catch the Golden chance!"*
   - **Tone of Voice:** The copy across the entire app must blend Disney-level magical wonder, Gen-Z energy (our prime demographic), a touch of playful rhyming, and kid-friendly approachability. It should feel like a whimsical park companion, not a utilitarian maps app.
8. **Explicit Fallback UX for Major Components** — The app must gracefully handle device or browser limitations without breaking the experience. For instance, if the native Web Share API fails, it must fallback to rendering a shareable image on-screen with a "Long press to save" instruction. Every high-risk feature (Camera access, compass calibration, internet connectivity) must have an explicitly designed fallback state.

## 8. Analytics Events (The 3 Value Pillars)

To ensure there are no open loopholes for development and that every data point serves a commercial purpose, analytics are explicitly split into four tiers.

*Critical Dev Requirement: All analytics events must be written to an offline queue (e.g., `IndexedDB` or `localStorage`) when the device is disconnected. The queue must automatically flush to Supabase the moment connectivity is restored. Losing sponsor analytics due to Lalbagh's poor cell coverage is unacceptable.*

**Tier 1 — Prove Value to Sponsors** (Drives revenue and renewals)

| Event | Captures | Why it matters commercially |
|---|---|---|
| `session_start` | New visitor session begins | Total reach — the denominator every sponsor stat is measured against. |
| `sponsor_impression` | Marquee is shown on screen | Baseline visibility count, standard metric sponsors understand. |
| `sponsor_tap` | User taps footer to open modal | Active interest, not just passive display. |
| `sponsor_ad_watch_duration` | Time spent with modal open | Your strongest "engagement" metric. |
| `sponsor_zone_arrived` | Physical arrival at sponsor node | **Most valuable data point** — verified real-world foot traffic. |
| `route_selected_to_sponsor_zone` | User picked a sponsor zone | Signals the app is driving intentional traffic toward a sponsor. |

**Tier 2 — Prove Value & Boast on Instagram** (Drives virality and organic growth)

| Event | Captures | Why it's boast-worthy |
|---|---|---|
| `stamp_collected` | Each individual stamp unlock | "X,XXX stamps discovered" — a real, quotable vanity metric. |
| `all_stamps_collected` | Full completion | "XXX visitors fully explored all 22 spots" — strong press-line material. |
| `cumulative_distance_walked` | Sum of route distances | "Visitors collectively walked XXX km" — fun, shareable data. |
| `share_button_tapped` | User taps "share" | Raw count of people proud enough to post it. |

**Tier 3 — Prove Product-Market Fit (PMF)** (App health and user stickiness)

| Event | Captures | Why it proves PMF |
|---|---|---|
| `daily_active_users` (DAU) | Unique device sessions per day | Shows the raw scale of adoption and value during the event. |
| `session_duration` | Time spent active in the app | Proves it's a true companion app, not just a quick glance. |
| `return_visitor` | Same device, different day | Proves the app is sticky enough for repeat use. |
| `feature_usage` | AR view vs. Map vs. Leaderboard | Shows what features actually drive engagement. |

**Tier 4 — Derived / Hidden Metrics (Data Exhaust)**

We do not need to fire explicit events for everything. We can derive highly valuable hidden metrics directly from our existing database state:

| Metric | Derived From | Why it matters commercially |
|---|---|---|
| `active_leaderboard_users` | Count of unique IG handles present in the leaderboard | Gives a highly accurate count of highly-engaged, competitive users without needing a specific "active user" event ping. |
| `stamp_discovery_velocity` | Timestamps between consecutive stamp collections for a user | Shows how fast people are moving through the park and how engaging the gamification loop is. |
| `zone_dwell_time` | Difference between entry and exit timestamps in a sponsor radius | Proves to sponsors that people are actually lingering in their zone, not just walking past. |
| `golden_stamp_hunt_duration` | Time elapsed between a Golden Stamp location jump and the next successful claim | Measures the intensity and engagement of the most urgent gamification loop. |

## 9. Key Engineering Caveats (do not skip)

- **iOS Safari ≠ Android Chrome** for both orientation and camera permission flows. Build and test both paths from day one, on real devices.
- **GPS accuracy degrades significantly under Lalbagh's dense canopy** (multipath + attenuation error, potentially 15–50m off). The fallback 2D map and junction-node routing exist specifically to make this survivable.
- **Compass drifts near metal** (gates, railings) — this is why dual-source fusion is in scope, not optional polish.
- **Raw GPS breadcrumbs from field walking are noisy** — always clean/snap against satellite imagery in the producer tool before exporting `graph.json`. Never ship raw walked coordinates directly.
- **Cell coverage is generally strong at Lalbagh** — while offline caching of assets is still required for speed, don't over-engineer network fallback logic. We expect reliable connectivity for core events like Golden Stamp claims and syncing.
- **Battery/heat** — continuous camera + GPS + orientation sensors is heavy; test for thermal throttling during a real multi-hour outdoor session, not just a quick desk test.
- **Sponsor modal must be tap-to-open only** — never auto-play, to protect the walking-navigation UX that's the actual product.

## 10. Field Mapping SOP (reusable for wayon.top)

1. Load satellite base layer of the venue in the producer tool.
2. Walk each path segment with GPS breadcrumb logging active; tag POIs/junctions by name as you pass them. Walk each segment more than once if possible to average out drift.
3. In the producer tool, manually snap breadcrumb points to the actual visible path in the satellite image — this manual correction step is mandatory, not optional.
4. Draw edges between nodes, assign real walked distances.
5. Tag sponsor zone coverage per node.
6. Save/Sync directly to Supabase from the Producer app, then load the consumer app on-site to test navigation before go-live.

## 11. Open Decisions

- Sponsor sales: which zones/businesses are confirmed, and by when — this gates how many sponsor slots exist at launch
- Final POI list (how many destinations to support in v1)
- Analytics dashboard: raw Supabase queries are fine for v1, no need for a built UI yet
