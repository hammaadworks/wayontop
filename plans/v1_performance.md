# WayOnTop V1 Architecture & Performance Upgrade Plan

**Purpose:** This document serves as the onboarding master plan for all developers. It outlines the architectural upgrades, performance optimizations, and UX taxonomy rules designed to make the Consumer and Producer apps run at 60 FPS offline.

---

## ✅ COMPLETED FIXES

### [DONE] 1. Polyline Edges (The Extinction of `track` Nodes)
* **The Problem:** Curved paths are currently built by dropping dozens of `track` nodes like breadcrumbs. This bloats the graph, severely slowing down the A* algorithm.
* **The Fix:** The `track` node type is abolished. Nodes will strictly be reserved for true decision points (Intersections, Gates, POIs). 
* **The Edge Update:** `GraphEdge` will now include a `geometry` property (an array of `[lng, lat]` coordinates) to define the path's visual curve.
* **Consumer contract:** The Consumer renders those coordinates for both the complete path graph and active route. AR guidance advances along the nearest route segment's next geometry coordinate, so it follows a curved walkway instead of pointing directly through it.
* **Producer Workflow Split:**
  * **Mappers (Field):** Simply walk and press "Record" to drop raw GPS traces. No nodes are placed.
  * **Editors (Office):** Use a desktop "Pen Tool" to trace a pristine Polyline Edge over the Mapper's messy GPS trace.

### [DONE] 3. R-Tree Spatial Index for User Snapping
* **The Problem:** Currently, the app snaps the user to the nearest *Node*. With Polyline edges, nodes will be far apart. We must snap the user's GPS to the nearest *Edge*.
* **The Fix:** Implement an **R-Tree (Spatial Bounding Box) Index**. The app instantly looks up which box the user is in and only calculates Point-to-Line distance on the 3-4 edges inside it. Guaranteed $O(\log E)$ real-time snapping with zero battery drain.

### [DONE] 2. The Strict Node Taxonomy & 3-Table DB (COMPLETED 08-18)
* **Status Note:** Both Consumer and Producer apps have been fully refactored to remove spaghetti string tags. `POICard` and `NavigationSheet` have been updated.
* **The Problem:** The current mix of loose node types and random tags (like `garbage`, `water`) has created spaghetti code.
* **The Fix:** We are migrating to a 3-table Supabase schema (`events`, `node_categories`, `nodes`). All frontend graph rendering strictly adheres to 6 base types.

### [DONE] 4. Global Node Search Component (COMPLETED 08-18)
* **Status Note:** `<GlobalNodeSearch />` is built, placed in `@wayontop/ui`, and integrated cleanly into the Consumer app. It includes debouncing, dynamic helper text, and gamification masking.
* **The Problem:** Producer and Consumer apps writing duplicate search logic leads to UI drift, and searching across languages is broken.
* **The Fix:** A shared `<GlobalNodeSearch />` component.

### [DONE] 5. O(1) Edge Lookup for Map Rendering
* **The Fix:** Replaced `Array.find()` with a pre-indexed Hash Map. Line drawing is now $O(1)$ constant time lookup, eliminating the $O(L \times E)$ UI hang when routing.

### [DONE] 6. Garbage Collection Pressure in A* Math
* **The Fix:** Replaced `.toFixed(2)` string parsing in the `distanceInMeters` Haversine function with raw mathematical rounding (`Math.round(val * 100) / 100`), dramatically speeding up the A* heuristic and preventing memory stutter.

### [DONE] 7. Web Worker for A* Pathfinding
* **The Fix:** The `findShortestPath` execution was moved to a dedicated Web Worker (`routing.worker.ts`). The main thread offloads the heavy math and remains perfectly free to render a smooth 60 FPS UI.

### [DONE] 8. On-Device Distance Calculation
* **The Fix:** Removed the requirement for `distance_m` to exist in the database payload. The distance is calculated dynamically on the phone exactly once when the Adjacency List is built on app startup.

### [DONE] 9. Rejecting PostGIS (Offline Resilience)
* **The Rule:** Do NOT migrate the core graph data to relational PostGIS tables for spatial queries.
* **The Reason:** All spatial searching (like finding the nearest water or routing) is done instantly in-memory on the phone, guaranteeing zero-latency results even in park dead zones.

### [DONE] 10. Category Palette Tokens
* **The Rule:** `node_categories.color_theme` is a design-system palette token, not a generated Tailwind class name.
* **Supported values:** Tailwind hue names (`amber`, `blue`, `cyan`, `emerald`, `fuchsia`, `gray`, `green`, `indigo`, `lime`, `neutral`, `orange`, `pink`, `purple`, `red`, `rose`, `slate`, `sky`, `stone`, `teal`, `violet`, `yellow`, `zinc`). Unknown values deliberately fall back to `amber`.

### [DONE] 11. Offline-First Graph Caching & API Limits
* **The Problem:** The app relied purely on the network for `nodes` and `edges`, which crashed in park dead zones. Furthermore, Supabase silently dropped map data beyond 1,000 rows.
* **The Fix:** We implemented a strict **Offline-First Architecture**. The app boots instantly using a `localStorage` payload, rendering the map and unlocking AR without blocking on network requests. Concurrently, a background process queries Supabase with a massive explicit `.limit(10000)` and overwrites the local cache for the next boot.

### [DONE] 12. Auto-Rerouting & GPS Jitter Filtering
* **The Problem:** The A* route was generated once and never recalculated if the user took a wrong turn. Worse, fluctuating GPS signals under thick trees would trigger false "wrong turns."
* **The Fix:** Implemented a silent `useEffect` engine monitoring Cross-Track Error. If the user drifts >15m off the `activeRoute`, a Web Worker silently recalculates and swaps the path instantly. Crucially, GPS pings with an accuracy > 30 meters are strictly filtered out to prevent reroute ping-pong and battery drain.
