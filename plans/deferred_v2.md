# Lalbagh AR Navigator & wayon.top — Deferred to V2

This document tracks features, infrastructure, and ideas that have been intentionally deferred from the Phase 1 (Lalbagh MVP) 4-day build. These items are reserved for V2 to ensure the MVP launches on time with absolute zero friction for the user.

## 1. Gamification & Community
- **Geo-Tagged Memories & UGC Tags:** Allowing users to drop comments, reviews, or tags at specific coordinates (e.g., "Best sunset here!"). Deferred because it requires robust user authentication (like IG OAuth) to prevent impersonation, which introduces too much friction for a day-1 anonymous web app.
- **Explicit User Verification:** Implementing a formal login or OAuth system to verify Instagram handles. (V1 uses an honor system for the leaderboard).

## 2. Augmented Reality (AR) Tech
- **Vision-Based / SLAM AR:** True spatial AR where the camera recognizes physical pathways and objects. V1 relies on "camera pass-through" with a compass and GPS-driven UI overlay.
- **BLE Beacons:** Installing physical Bluetooth Low Energy beacons for centimeter-level indoor positioning. Deferred due to hardware cost and venue administration constraints.

## 3. Infrastructure & Scale (wayon.top foundation)
- **Multi-Tenant Database Design:** Re-architecting the database to seamlessly support multiple venues (Wonderla, Cubbon Park, malls) concurrently. V1 uses a single-venue database schema for speed.
- **Full Sponsor CMS Dashboard:** Building a heavy, dedicated Content Management System for sponsors to log in and manage their own creatives. V1 uses a basic admin UI for the internal producer team.
- **Automated Sponsor Invoicing/Payment:** Integrating Stripe/Razorpay for sponsors to buy zones in a self-serve manner.

## 4. Distribution
- **Native iOS / Android Apps:** Releasing the app on the App Store or Google Play. V1 is strictly a browser-based Web App (PWA) to eliminate install friction.
- **Desktop Experience:** Building a desktop web version. The app remains 100% mobile-first for the field.

## 5. Global Leaderboard System
- **Real-Time Leaderboard Syncing**: Originally built in V1 but deferred to V2 to reduce complexity and avoid constant backend syncs. Stamp collection remains local to the user's device for now.
- **Codebase Touchpoints for Re-Implementation**:
  - **`consumer/src/lib/gamification.ts`**: Bring back the `syncTotalCount` method. This method read the local stamps array length, the device UUID, and an optional IG handle, and performed an `upsert` to the `leaderboard` table in Supabase. It was triggered automatically inside `claimStamp`.
  - **`consumer/src/components/IgHandlePrompt.tsx`**: A modal component that prompts the user to enter their Instagram handle (which saves to `localStorage` under `wayontop_ig_handle`) to display on the public leaderboard. It was scheduled to appear a few seconds after the app loaded if a handle wasn't already set.
  - **Database (`public.leaderboard`)**: The `leaderboard` table in Supabase needs to be recreated. Its schema consisted of:
    - `device_uuid` (UUID, primary key)
    - `venue_key` (text, primary key, foreign key to `venues.key`)
    - `total_stamps` (integer)
    - `ig_handle` (text, nullable)
    - `last_synced_at` (timestamp)
  - **Database Policies (RLS)**: Row Level Security policies are needed on the `leaderboard` table, specifically:
    - "Allow anon insert to leaderboard"
    - "Allow anon update to leaderboard"
    - "Allow public read access to leaderboard"
