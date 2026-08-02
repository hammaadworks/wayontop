# 🧭 WayOnTop

Welcome to the **WayOnTop** monorepo—the engine powering next-generation AR wayfinding and venue monetization.

## 🌟 Overview
WayOnTop is a platform designed to transform large physical venues (like botanical gardens, parks, and stadiums) into interactive, navigable, and gamified digital experiences. It operates entirely in the mobile browser—zero app installs required.

This monorepo currently hosts the inaugural implementation: **Lalbagh AR Navigator**.

## 🏗️ Architecture
The system is cleanly decoupled into three core NPM workspaces:

- 📱 **Consumer App (`/consumer`)**: The public-facing mobile-web AR navigator. Visitors point their cameras to see floating arrows guiding them to POIs, collect gamified "Stamps" (Pokémon Go style), and discover hyper-local sponsor zones.
- 🗺️ **Producer App (`/producer`)**: The internal admin tool for mapping the 240-acre venue. Features MapLibre-powered graph node editing, POI management, and sponsor zone configuration. 
- 🎨 **Shared UI (`/packages/ui`)**: The centralized design system ensuring both apps share a premium, glassmorphism-heavy aesthetic.

## 🚀 Getting Started
1. `npm install`
2. `npm run dev --workspace=consumer` (starts consumer at `https://localhost:6662`)
3. `npm run dev --workspace=producer` (starts producer at `https://localhost:6661`)
*(Note: Vite is configured with SSL to allow local testing of Location & Compass APIs on mobile devices).*

## 📚 Documentation
- [Product Requirements (PRD)](./docs/lalbagh-navigator-prd.md)
- [Design System & Brand Guidelines](./docs/design-system.md)
- [Permissions Protocol](./docs/permissions-protocol.md)
