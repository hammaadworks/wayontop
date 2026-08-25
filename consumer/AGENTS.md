# Consumer App - AI Agent Guidelines

## Project Context
The Consumer App is a frictionless mobile-web AR wayfinding app for venues like Lalbagh. It uses GPS and the device compass to project an AR arrow onto the camera feed. It includes gamification (AR stamps) and zone-based sponsor advertisements.

## Core Rules for AI Agents

### 1. Absolute UX/UI Perfection
You **MUST** adhere to the root Design System (`../docs/design-system.md`). The app must feel like Disney-level magic.
- Implement micro-animations, bouncy entrances, and frosted glass panels.
- Strictly mobile-first. Optimize for one-handed thumb reach.
- Use the shared design tokens from `@wayontop/ui/styles/shared.css`.

### 2. Hardware APIs & Fallbacks
- **Critical:** You are dealing with volatile browser APIs (`getUserMedia`, `Geolocation`, `DeviceOrientationEvent`).
- You MUST explicitly handle iOS vs Android quirks (e.g., iOS `webkitCompassHeading` vs Android `deviceorientationabsolute`, and iOS `playsinline` requirements).
- Always implement graceful fallbacks. If the camera fails or permissions are denied, degrade elegantly to the beautifully designed 2D Map mode.
- **Offline-First:** All map fetching must support offline caching (`localStorage`). Assume the user has zero cell service. Never block the UI on a Supabase network request.
- **GPS Jitter:** Never blindly trust raw GPS data. Always filter out pings with `accuracy > MAX_GPS_ACCURACY_THRESHOLD` (defined in `constants.ts`) to prevent battery drain and UI ping-ponging.

### 3. Documentation Maintenance
- You **MUST** update the `docs/` folder for any changes to state machines, routing logic, or AR rendering layers.
- Always check `../docs/lalbagh-navigator-prd.md` before altering core features to ensure alignment with business and monetization goals.

### 4. Workflow & Tooling
- **Skills & MCP Servers**: You **MUST** actively use your available MCP servers and skills to build features efficiently. Rely on the `shadcn` server for UI generation and strictly adhere to its documentation.
- **Installing New UI Components (CRITICAL)**: If you need a new component, you must step out of the consumer app. Run `cd ../packages/ui && npx shadcn-ui@latest add <component>`. Then import it via `@wayontop/ui`.
- **Business Logic & Types**: Core data types, Supabase clients, and algorithms (like routing) reside in `@wayontop/ui/lib/*`. Do not duplicate logic locally if it can be shared.
- **Best Practices**: You represent the core product. Never take shortcuts. Always write high-performance, strictly-typed, and robust code.

### 5. Ultimate Pro UI/UX
The UI MUST be a pro combo of:
1. **Apple**: Minimalist, frosted glass, deeply refined smooth micro-animations.
2. **Google Maps**: Clean utility, high performance, highly readable map features and navigation.
3. **Pokemon Go**: Dynamic, engaging gamification, and intuitive AR overlays.
4. **Strava**: Energetic metric tracking, rewarding physical movement, and community-driven social proof.

The design MUST be **mobile-first and UX-friendly**. Optimize ruthlessly for one-handed thumb reach on mobile devices. Ensure flawless responsiveness, 100/100 performance, and perfectly harmonious layouts with no oddly placed elements or giant banners.

### 6. Lalbagh Specific & Gen Z Copywriting
You **MUST** always keep the UI copy strictly tied to Lalbagh Botanical Garden, Bengaluru. 
- **Context is King:** Reference actual Lalbagh landmarks (the iconic Glass House, the 3,000-million-year-old Lalbagh Rock, Kempegowda Watchtower, the Bonsai Garden, or the 240-acre canopy). 
- **Tone:** The copy must always be super helpful, professional, **Gen Z**, small, crisp, engaging, and humorous. 
- **Example:** Instead of "Explore the park," use something like *"Don't just walk. Experience Lalbagh!"* or *"Discover the Glass House's hidden secrets ✨"*. No generic placeholder text allowed.
