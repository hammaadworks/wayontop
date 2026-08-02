# 📱 WayOnTop Consumer

The **Consumer App** is a frictionless, mobile-web AR navigator. Visitors to venues like Lalbagh Botanical Garden open a link in their phone's browser, point their camera, and are guided by a magical AR arrow to their destination.

## ✨ Key Features
- **AR Camera Pass-through Navigation:** Uses device compass and GPS to overlay a directional arrow onto the live camera feed. 
- **A* Smart Routing:** Client-side shortest-path routing avoiding obstacles, guiding users segment-by-segment.
- **Pokémon Go-Style Gamification:** Discover and collect 3D AR "Stamps" hidden in the park, including a real-time, atomic-locked Golden Stamp.
- **Hyper-Local Sponsorships:** As users walk into specific physical zones, contextual sponsor marquees and modals are elegantly displayed.
- **Offline Resilience:** Aggressive Service Worker caching ensures navigation works even when the park's cell network is congested.

## 🛠️ Tech Stack
- **React + Vite (PWA)**
- **Tailwind CSS + shadcn/ui** (Glassmorphism design system via `@wayontop/ui`)
- **Geolocation & DeviceOrientation APIs**
- **MapLibre GL JS** (for the 2D map toggle)
