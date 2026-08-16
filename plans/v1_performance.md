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

### [TODO] 2. The Lean Node Taxonomy & Shared Style Map
* **The Problem:** The current mix of `facility`, `poi`, and random tags (like `garbage`, `water`) has created spaghetti code. We need a strict, lean taxonomy that handles every scenario (NUNs, Events, Intersections, Construction) without confusion.
* **The Fix:** We will strictly enforce 6 explicit `NodeTypes`:
  1. `poi`: Major landmarks (Glass House).
  2. `gate`: Entry/Exit points.
  3. `nun_major`: High-priority utilities (Washrooms, Water, Canteen). Visible on the map. Search shows all results sorted by distance.
  4. `nun_minor`: Low-priority utilities (Garbage bins). Hidden on the map to prevent clutter. Search aggressively filters to show only the **Top 2 nearest**.
  5. `event`: Temporary nodes tied to an `event_id` (e.g., Flower Show booths). Injected only when the event is active.
  6. `intersection`: Invisible routing waypoints where paths cross. (Replaces `track`).
* **Handling Edge Cases (No Spaghetti):**
  * *Renovation:* Handled via a `status: 'active' | 'construction'` flag. (A* ignores construction paths).
  * *Staff/Hidden Paths:* Handled via an `is_hidden: boolean` flag on Edges. (A* routes through them, but MapView doesn't draw them).
* **Shared UI Styles:** A single file (`poiStyles.ts`) shared between Consumer and Producer will map styles directly based on this strict type and sub-tag:
  * `nun_major` + `['water']` = Cyan Droplets.
  * `nun_minor` + `['garbage']` = Rose Trash Icon.

### [TODO] 3. R-Tree Spatial Index for User Snapping
* **The Problem:** Currently, the app snaps the user to the nearest *Node*. With Polyline edges, nodes will be far apart. We must snap the user's GPS to the nearest *Edge* (Line segment) to keep their blue dot on the path. Calculating Point-to-Line distance across 5,000 edges every second is extremely CPU intensive.
* **The Fix:** Implement an **R-Tree (Spatial Bounding Box) Index**. 
  * Instead of looping over every edge, the park is divided into spatial bounding boxes. 
  * The app instantly looks up which box the user's GPS is in, and only runs the heavy Point-to-Line math on the 3 or 4 edges inside that specific box. 
  * This guarantees $O(\log E)$ real-time map snapping with zero battery drain.

### [TODO] 4. Global Node Search Component
* **The Problem:** Producer and Consumer apps writing duplicate search logic leads to UI drift.
* **The Fix:** A shared `<GlobalNodeSearch />` component.
  * **Distance Sorting:** Mathematically calculates Haversine distance and sorts results nearest to furthest.
  * **Same-Name Resolution:** Explicitly stacks identical names (e.g., "Bonsai Garden") by proximity.
  * **Dynamic Helper Text:** Dynamically computes the nearest major POI to each NUN and appends it (e.g., `Water (near Glass House)`).

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
