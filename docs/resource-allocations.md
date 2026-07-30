# AI Agent Resource Allocations & Parallel Development Plan

With 5 AI Agents available and a 3-day build window, development must happen in parallel. The system is naturally decoupled into the **Consumer App**, the **Producer App**, and the **Supabase Backend**. 

## Global Project Setup (Day 1 - First 2 Hours)
**All agents sync on this foundation before splitting:**
1. **GitHub Repository:** Setup `wayontop-lalbagh` monorepo (or separate folders for `consumer` and `producer`).
2. **Supabase Project:** Spin up project, get `URL` and `ANON_KEY`.
3. **Vite + React Setup:** Initialize the frontend consumer app with Tailwind + shadcn/ui.
4. **Vite Setup:** Initialize the producer app.

---

## Agent Allocations

### 🤖 Agent 1: The Architect / Lead Developer
**Focus:** Core App Shell, PWA, Offline Resilience & Backend Integrations.
- **Task 1:** Set up Supabase DB schema (`content_blobs`, analytics tables, row-level security).
- **Task 2:** Implement Service Worker (Workbox) & Cache API for offline-first graph JSON and asset loading.
- **Task 3:** Configure Web App Manifest (`manifest.json`) and iOS Add-to-Home-Screen prompts.
- **Task 4:** Build the In-App Browser Blocker component (detect IG/FB user agents and show exit instructions).
- **Task 5:** Setup global `localStorage` state management for `device_uuid` and user offline progress.
- **Parallel Sync:** Needs to provide the data fetching hooks for Agent 2 and Agent 4 to use.

### 🤖 Agent 2: UI / UX & Product Expert (Frontend)
**Focus:** Visuals, Search, Modals, and "Disney-Level Magic" Polish.
- **Task 1:** Build the core UI shell (Frosted glass bottom sheets, responsive mobile-first layout).
- **Task 2:** Implement Fuzzy Search and standard POI list view.
- **Task 3:** Build POI Info Cards and the Photo Spots / Facilities quick-filter toggles.
- **Task 4:** Implement i18n (English/Kannada) toggle and string mapping.
- **Task 5:** Build the Sticky Sponsor Marquee UI and the Opt-In Sponsor Modal.
- **Parallel Sync:** Works closely with Agent 1's state management to display accurate data.

### 🤖 Agent 3: AR & Sensor Specialist (Core Tech)
**Focus:** Camera pass-through, Orientation math, GPS Smoothing.
- **Task 1:** Implement raw camera feed via `getUserMedia` (with iOS `playsinline` fixes).
- **Task 2:** Build the dual-source orientation engine (iOS `webkitCompassHeading` vs Android `deviceorientationabsolute`).
- **Task 3:** Implement `navigator.geolocation.watchPosition` with moving average smoothing.
- **Task 4:** Build the AR Canvas overlay that renders the directional arrow and dynamically tilts/adjusts pitch based on sensors.
- **Task 5:** Implement Screen Wake Lock API and "Figure 8" compass calibration tooltip.
- **Parallel Sync:** Hands off the exact bearing/distance math variables to Agent 4 for routing logic.

### 🤖 Agent 4: Data & Routing Engineer
**Focus:** Pathfinding (A*), Gamification Engine, Leaderboard.
- **Task 1:** Implement the Client-Side A* pathfinding algorithm over the `graph.json` data.
- **Task 2:** Build the dynamic route preview (ETA, distance, passed POIs).
- **Task 3:** Build the offline Gamification Engine (Stamp discovery logic based on GPS radius, local saving).
- **Task 4:** Implement the "Golden Stamp" claiming logic utilizing Supabase atomic row-level locks.
- **Task 5:** Build the Leaderboard UI and data syncing logic (Total stamps, Distance, Golden Stamp feed).
- **Parallel Sync:** Depends on Agent 3's GPS coords and Agent 1's Supabase connection.

### 🤖 Agent 5: Fullstack / Internal Tools (Producer & Viral)
**Focus:** The Internal Producer App, Analytics Queue, and Social Sharing.
- **Task 1 (Producer):** Build the Leaflet.js base map for the internal mapping tool.
- **Task 2 (Producer):** Implement POI pinning, path drawing, and Sponsor Zone radius tools.
- **Task 3 (Producer):** Connect the Producer App to Supabase to read/write the `graph.json` directly.
- **Task 4 (Consumer):** Build the robust Analytics Offline Queue (logs Tier 1-3 events locally, flushes when online).
- **Task 5 (Consumer):** Build the Viral Sharing Engine (AR Capture button, Strava-style route summary card generation via HTML-to-Canvas, and Native Share Sheet API integration).

---

## Parallel Development Timeline (3 Days)

*   **Day 1 (Foundation & Logic):** 
    *   Agent 1: DB & PWA Shell. 
    *   Agent 5: Producer App mapping tools (so we can generate test graph data immediately). 
    *   Agent 3: Camera & Sensor math prototype. 
    *   Agent 4: A* Routing algorithm (testing with dummy JSON).
    *   Agent 2: UI Components (Search, Cards).
*   **Day 2 (Integration & Features):** 
    *   Agent 1 & 4 hook up Gamification to DB. 
    *   Agent 3 perfects the AR Arrow on the camera feed. 
    *   Agent 2 connects real data to the UI. 
    *   Agent 5 builds the Analytics queue and Viral Share cards.
*   **Day 3 (Polish & Field Testing):** 
    *   All Agents focus on edge cases (iOS vs Android quirks, GPS drift handling, offline-to-online sync recovery, UI animation smoothness). Field testing with Producer-generated data.
