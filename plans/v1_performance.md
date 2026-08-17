# WayOnTop V1 Architecture & Performance Upgrade Plan

**Purpose:** This document serves as the onboarding master plan for all developers. It outlines the architectural upgrades, performance optimizations, and UX taxonomy rules designed to make the Consumer and Producer apps run at 60 FPS offline.

---

## 🚀 PENDING UPGRADES (Sorted by Dependency Order)

### [TODO] 1. Polyline Edges (The Extinction of `track` Nodes)
* **The Problem:** Curved paths are currently built by dropping dozens of `track` nodes like breadcrumbs. This bloats the graph, severely slowing down the A* algorithm.
* **The Fix:** The `track` node type is abolished. Nodes will strictly be reserved for true decision points (Intersections, Gates, POIs). 
* **The Edge Update:** `GraphEdge` will now include a `geometry` property (an array of `[lng, lat]` coordinates) to define the path's visual curve.
* **Producer Workflow Split:**
  * **Mappers (Field):** Simply walk and press "Record" to drop raw GPS traces. No nodes are placed.
  * **Editors (Office):** Use a desktop "Pen Tool" to trace a pristine Polyline Edge over the Mapper's messy GPS trace.

### [TODO] 2. The Strict Node Taxonomy & 3-Table DB
* **The Problem:** The current mix of loose node types and random tags (like `garbage`, `water`) has created spaghetti code.
* **The Fix:** We are migrating to a 3-table Supabase schema (`events`, `node_categories`, `nodes`). All frontend graph rendering strictly adheres to 6 base types:
  1. `poi`: Major landmarks.
  2. `gate`: Entry/Exit points.
  3. `utility_major`: High-priority utilities (Washrooms, Water). Visible on the map.
  4. `utility_minor`: Low-priority utilities (Garbage bins). Hidden on map, limited to Top 2 nearest in search.
  5. `stamp`: Gamification collectibles.
  6. `intersection`: Invisible routing waypoints where paths cross.
* **Event Modifiers:** There is NO "event" node type. Temporary nodes carry an `event_id`. The Consumer app checks the `events` table: if `is_active` is false, OR if today's date is past `end_date`, the node is completely ignored (it vanishes from the 2D map, is stripped from search, and the A* routing engine pretends it doesn't exist).
* **UI Image Avatar Fallback:** The MapLibre engine will check if `node.image_url` exists. If true, it draws a circular frosted-glass photo thumbnail on the map. If null, it falls back to the `node_categories` icon and color.

### [TODO] 3. R-Tree Spatial Index for User Snapping
* **The Problem:** Currently, the app snaps the user to the nearest *Node*. With Polyline edges, nodes will be far apart. We must snap the user's GPS to the nearest *Edge*.
* **The Fix:** Implement an **R-Tree (Spatial Bounding Box) Index**. The app instantly looks up which box the user is in and only calculates Point-to-Line distance on the 3-4 edges inside it. Guaranteed $O(\log E)$ real-time snapping with zero battery drain.

### [TODO] 4. Global Node Search Component
* **The Problem:** Producer and Consumer apps writing duplicate search logic leads to UI drift, and searching across languages is broken.
* **The Fix:** A shared `<GlobalNodeSearch />` component.
  * **The Name Fallback Rule:** The UI title always explicitly displays `node.name?.[lang] || node.category.name[lang]`. 
  * **Multi-language Fuse.js:** The search index checks the user's query against both `name` and the `synonyms` array in the `node_categories` table.
  * **Distance Sorting (Debounced):** The search input is strictly debounced (e.g., 300ms) to prevent UI lag. It mathematically calculates Haversine distance and sorts results nearest to furthest.
  * **Same-Name Resolution:** Explicitly stacks identical names (e.g., "Bonsai Garden") by proximity.
  * **Dynamic Helper Text:** Dynamically computes the nearest major POI to each utility and appends it (e.g., `Water (near Glass House)`).

---

## ✅ COMPLETED FIXES

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
