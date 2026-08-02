# 🗺️ WayOnTop Producer

The **Producer App** is the internal command center for the WayOnTop platform. It is the admin-facing tool used to map physical venues, configure gamification, and manage sponsor campaigns.

## ✨ Core Capabilities
- **Venue Mapping:** Visual MapLibre GL JS interface to plot nodes (POIs, gates, junctions) and connect walkable edges. This generates the A* routing graph used by the Consumer app.
- **Sponsor Management:** Visually define geofenced sponsor zones (radius-based). Upload sponsor assets (banners, videos) that activate when users walk into the zone.
- **Gamification Control:** Manage the deployment of "Stamps," including the highly-coveted 1-of-1 Golden Stamp.

## 🛠️ Tech Stack
- **React + Vite**
- **MapLibre GL JS** (for high-performance vector map editing)
- **Tailwind CSS + shadcn/ui** (Premium Dark Mode UI via the shared `@wayontop/ui` package)
- **Supabase** (Direct DB mutations)
