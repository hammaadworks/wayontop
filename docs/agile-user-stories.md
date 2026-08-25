# Lalbagh AR Navigator - Agile User Stories

## Epic 1: Project Setup & Core Infrastructure
- **US 1.1**: As a developer, I want to initialize a Vite + React (TypeScript) project with Tailwind CSS and shadcn/ui, so that we have a fast, modern frontend foundation.
- **US 1.2**: ✅ (COMPLETED) As a developer, I want to set up Supabase with a `venues` and `venue_content` table (for JSON graph data) and basic analytics tables, so that the app can fetch map data and log events per venue.
- **US 1.3**: As a user, I want the web app to load quickly and work offline, so I can use it even when Lalbagh has poor cell network coverage. (Service Worker & Cache API setup).
- **US 1.4**: As a user, I want to be able to "Add to Home Screen" to launch the app easily like a native app. (PWA Manifest).
- **US 1.5**: As a user, I need to see the app blocked or redirected gracefully if opened in an in-app browser (like Instagram), so my progress (localStorage) isn't lost.

## Epic 2: The Producer App (Internal Mapping Tool)
- **US 2.1**: ✅ (COMPLETED) As an admin, I want to view a MapLibre satellite map of a venue, so I can visually map out POIs and paths.
- **US 2.2**: ✅ (COMPLETED) As an admin, I want to drop pins for POIs and draw path edges with distances, so I can construct the routing graph.
- **US 2.3**: ✅ (COMPLETED) As an admin, I want to define Sponsor Zones (poi_id + radius) visually on the map, so I can manage sponsor visibility.
- **US 2.4**: ✅ (COMPLETED) As an admin, I want to sync my mapped graph and sponsor data directly to Supabase `venue_content` as JSON, so the consumer app can fetch the latest map immediately without a redeploy.

## Epic 3: Consumer App UI & Foundation
- **US 3.1**: As a user, I want a clean, mobile-optimized UI (bottom sheets, frosted glass) so the app feels like a premium iOS/Instagram experience.
- **US 3.2**: As a user, I want to search for places using natural terms ("roses", "kids area"), so I can quickly find what I want without knowing official POI names (Fuzzy Search).
- **US 3.3**: As a user, I want to see rich POI Cards with info like "Why it's famous", "Best photo spot", so I learn about the venue.
- **US 3.4**: As a user, I want to switch the app language between English and Kannada, so I can navigate in my preferred language.
- **US 3.5**: As a user, I want one-tap quick filters for "Photo spots" and "Facilities" (washrooms, water), so I can find essentials fast.

## Epic 4: AR Navigation & Sensors
- **US 4.1**: As a user, I want to see my phone's camera feed with an AR navigation arrow overlaid, so I know exactly which direction to walk.
- **US 4.2**: As a user, I want the AR arrow to be stable and point correctly based on true North, whether I'm on iOS (webkitCompassHeading) or Android (deviceorientationabsolute).
- **US 4.3**: As a user, I want to be able to recalibrate my compass (figure 8 tooltip) if the arrow is drifting.
- **US 4.4**: As a user, I want to toggle between the AR view and a top-down 2D map, so I can get a broader view of my location if GPS/Compass is acting up.
- **US 4.5**: As a user, I want the app to keep my screen awake while I am navigating, so I don't have to keep unlocking my phone.

## Epic 5: Smart Routing
- **US 5.1**: As a user, I want to get the shortest walkable path to my destination, so I don't waste time getting lost. (Client-side A* implementation).
- **US 5.2**: As a user, I want to see a route preview showing what POIs I'll pass and my ETA, so I can plan my walk.
- **US 5.3**: As a user, the AR arrow should dynamically update its pointing direction at path junctions, guiding me along the physical path, not just a straight line to the end.

## Epic 6: Gamification
- **US 6.1**: As a user, I want to discover virtual stamps at specific POIs in AR, so the walk feels like a fun treasure hunt (Pokémon Go style).
- **US 6.2**: As a user, I want to see a magical celebration animation when I tap "Claim" on a stamp.
- **US 6.3**: As a user, I want my collected stamps and walked distance saved offline in my browser.
- **US 6.5**: As a user, I want a chance to find the 1-of-1 "Golden Stamp", which instantly jumps to a new location once claimed (Requires Supabase atomic locks).

## Epic 7: Monetization (Sponsors) & Analytics
- **US 7.1**: As a sponsor, I want a sticky marquee displaying my brand looping smoothly at the bottom of the screen when users are physically within my defined zone radius.
- **US 7.2**: As a user, I want to tap the sponsor marquee to open an opt-in modal with more details or a commercial, so it doesn't interrupt my navigation unless I choose to view it.
- **US 7.3**: As an admin, I want all analytics (impressions, zone arrivals, route selections) to be logged locally and synced to Supabase when online, so we never lose sponsor data.

## Epic 8: Viral Sharing Engine
- **US 8.1**: As a user, I want a prominent "Capture" button to snap a photo of my AR view (with stamps/arrows), so I can save the moment.
- **US 8.2**: As a user, I want a Strava-style "Route Summary" generated when I finish my walk or exit the gates, showing my path, distance, and time.
- **US 8.3**: As a user, I want to tap "Share" on any achievement, stamp, or route summary to open the native OS Share Sheet with a `lalbagh.top` watermark and pre-filled `@lalbagh.top` tag.
