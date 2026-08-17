# De-Spaghettifying the Node Taxonomy (Architecture Proposal)

## The Current State: "The Spaghetti"
Currently, the WayOnTop graph relies on a fragile mixture of hardcoded `NodeType` enums (`poi`, `facility`, `gate`, `track`) and loose string arrays (`tags: ['garbage', 'toilet']`) to figure out what a node is, how to display it, and how to search for it.

**Why this is dangerous (The Spaghetti):**
1. **Hardcoded Monolith:** Adding a new utility type requires developer intervention.
2. **Translation Nightmare:** No unified dictionary for Kannada, Hindi, and English support.
3. **Overlapping Logic:** Distinguishing between what should be visible on the map vs hidden is guessed by the frontend.

---

## The Solution: A Data-Driven DB Taxonomy (3 Tables)
We must move the taxonomy into Supabase. The entire map engine becomes dynamic, i18n accessible, and maintainable by non-developers.

### 1. The 6 True Base Types
The AR Engine and A* Router strictly run off these 6 foundations.
1. `poi` - Major landmarks. Always visible.
2. `gate` - Entrances/exits. Always visible.
3. `utility_major` - Washrooms, water, canteens (Visible on map).
4. `utility_minor` - Garbage bins, benches (Hidden on map, limits to Top 2 in search).
5. `stamp` - Standalone gamification nodes (e.g., floating AR coins, scavenger hunt items).
6. `intersection` - Invisible routing waypoints.

### 2. Table A: `events` (The Time Controller)
Manages seasonal overlays.
* `id` | `name` | `start_date` | `end_date` | `is_active`

### 3. Table B: `node_categories` (The Master Dictionary)
Dictates *what* things are and *how* they look. Used to populate the Producer mapping UI.
* `id` (UUID)
* `code` (String): e.g., `utility_water`. Used as a readable slug for developers/CSV imports.
* `base_type` (Enum): Must be one of the 6 core types above.
* `name` (JSONB): `{"en": "Water", "kn": "ನೀರು"}`
* `synonyms` (JSONB): `{"en": ["drink", "thirsty"], "kn": ["ನೀರು ಬೇಕು"]}`
* `description` (JSONB): Default rich text fallback for this category (e.g., "Standard park washroom facility").
* `image_url` (String): Default image fallback for the category.
* `icon_key` (String): Lucide icon (e.g., `Droplets`). The final visual fallback.
* `color_theme` (String): Design System token (e.g., `cyan`).

### 4. Table C: `nodes` (The Physical Map Points)
* `id` (UUID)
* `category_id` (UUID): Foreign key to `node_categories`. (Mandatory for all nodes, even POIs).
* `lat` / `lng` (Float)
* `name` (JSONB): Optional localized override. **Fallback:** `node_categories.name`.
* `description` (JSONB): Rich text for the UI Drawer. **Fallback:** `node_categories.description`.
* `synonyms` (JSONB): Optional node-specific synonyms. Combined with category synonyms during search.
* `image_url` (String): URL to Supabase bucket. **UI UX Fallback Chain:** `node.image_url` ➡️ `category.image_url` ➡️ `category.icon_key`.
* `event_id` (UUID): Optional foreign key to `events`. If the linked event is inactive (`is_active: false` or `today > end_date`), the app completely ignores this node for map rendering, searching, and A* routing.
* `status` (Enum): `active` or `construction`.
* `is_paid` (Boolean): Renders the ₹ symbol.

---

## 5. The `<GlobalNodeSearch />` Component (UI & UX Behavior)
The Global Search is the brain that connects the taxonomy to the tourist. It sits over the map and updates in real-time.

### Core Behaviors
1. **Deep Indexing (Fuse.js):** The search engine combines node and category text. It scans the user's query against `node.name`, `node.synonyms`, `node_categories.name`, and `node_categories.synonyms`.
2. **Absolute Distance Sorting (Debounced):** To maintain 60FPS on mobile, the search input is strictly debounced (e.g., 300ms). Once triggered, it runs a Haversine distance calculation from the user's current GPS. Results are ALWAYS sorted nearest to furthest.
3. **Dynamic "Near" Helper Logic:**
   * `utility_minor` ➡️ Anchors to the closest `poi`, `gate`, or `utility_major`.
   * `utility_major` ➡️ Anchors to the closest `poi` or `gate`.
   * `poi`, `gate`, `stamp` ➡️ **No anchor text.** (They are standalone landmarks).

### Strict UI Layout Standard
Every list item in the search results must strictly follow this visual template:
* **Avatar/Icon:** Left side (Image Thumbnail OR Colored Lucide Icon).
* **Title Row:** `<Title_Name> <Chip_Badge_1> <Chip_Badge_2>` (Badges use shadcn `Badge` components, not bracket text).
* **Subtitle Row:** `<Distance>m away • near <Anchor_Node_Name>` (Anchor is omitted if not applicable).

### Scenario Demonstrations (Look & Feel)
When a user opens the search bar, the UI dynamically reacts to the node's DB modifiers:

#### 1. The POI Scenario (Unique Landmark)
* **DB State:** `base_type: 'poi'`, `name: {"en": "The Glass House"}`
* **Search Query:** "Crystal Palace" (matches `node.synonyms`)
* **UI Layout:**
  * **Avatar:** A circular, frosted-glass thumbnail of the `image_url`.
  * **Title Row:** `The Glass House`
  * **Subtitle Row:** `120m away` *(No near tag for POIs)*

#### 2. The Minor Utility Spam Filter (Garbage Bins)
* **DB State:** `base_type: 'utility_minor'`, `name: null`, `category.name: {"en": "Garbage"}`
* **Search Query:** "Trash" (matches `category.synonyms`)
* **UI Layout:**
  * **Icon:** A small `rose` colored `Trash2` Lucide icon.
  * **Title Row:** `Garbage`
  * **Subtitle Row:** `45m away • near Bonsai Garden` *(Anchored to POI)*
* **Edge Case Handled:** There are 50 bins in the park. Because it's `utility_minor`, the engine aggressively clamps the results to ONLY show the Top 2 nearest to prevent spamming the list.

#### 3. The `is_paid` Modifier (Paid Toilets)
* **DB State:** `base_type: 'utility_major'`, `category.name: {"en": "Washroom"}`, `is_paid: true`
* **Search Query:** "Loo"
* **UI Layout:**
  * **Icon:** A `blue` `PersonStanding` icon.
  * **Title Row:** `Washroom` `[₹ Paid]` *(Emerald Badge Component)*
  * **Subtitle Row:** `80m away • near West Gate` *(Anchored to Gate)*

#### 4. The Event Modifier (Temporary Canteen)
* **DB State:** `base_type: 'utility_major'`, `name: {"en": "Flower Show Canteen"}`, `event_id: 'evt_9'`
* **Search Query:** "Food"
* **UI Layout:**
  * **Icon:** An `amber` `Utensils` icon.
  * **Title Row:** `Flower Show Canteen` `[✨ Flower Show]` *(Magenta Badge Component)*
  * **Subtitle Row:** `300m away • near Glass House`
* **Edge Case Handled:** The engine checks the `events` table. If `evt_9` is inactive or expired, this node vanishes completely from search and A* routing.

#### 5. Same-Name Stacking (Park Gates)
* **DB State:** Multiple nodes with `base_type: 'gate'`
* **Search Query:** "Gate"
* **UI Layout:**
  * **Item 1:** `West Gate` \n `200m away`
  * **Item 2:** `South Gate` \n `800m away`
  * **Item 3:** `Double Road Gate` \n `1.2km away`
* **Edge Case Handled:** Identical base types stack cleanly, sorted by distance. No near tags for Gates.

#### 6. The Status Modifier (Construction/Closed)
* **DB State:** `base_type: 'poi'`, `name: {"en": "Lotus Pond"}`, `status: 'construction'`
* **Search Query:** "Lotus"
* **UI Layout:**
  * **Avatar:** Greyscale or faded thumbnail image.
  * **Title Row:** `~~Lotus Pond~~` `[🚧 Closed]` *(Amber Badge Component)*
  * **Subtitle Row:** `500m away`
* **Edge Case Handled:** The user can still search for it, but the UI clearly warns them it is under construction before they walk 500m to a blocked path.

#### 7. The Gamification Node (Stamps)
* **DB State:** `base_type: 'stamp'`, `name: {"en": "October Hunt Token"}`, `event_id: 'evt_october'`
* **Search Query:** "Token"
* **UI Layout:**
  * **Icon:** A glowing, animated 3D coin/stamp icon.
  * **Title Row:** `October Hunt Token` `[🏆 Event Item]` *(Badge Component)*
  * **Subtitle Row:** `15m away • Collect now!` *(Custom subtitle override)*

---

## 6. Gamification: The "Fog of War" Stamp System
Stamps (`base_type: 'stamp'`) are highly specialized nodes used to drive foot traffic. To build curiosity, the Consumer app implements a strict **"UI Masking Layer" (Fog of War)** that hides the stamp's true identity, lore, and high-res images until the user physically discovers it in the real world.

### State Management & Progression
Because the Consumer app operates frictionlessly without forced logins, discovery state is stored directly in the browser's `localStorage` as an array of collected IDs (e.g., `collected_stamps: ['uuid-1', 'uuid-2']`). This allows a user to close the app, go home, and **resume their collection journey** the next time they visit the park, completely seamlessly.

### UX Behavior Across the App
The UI dynamically masks stamp data if its ID is missing from local storage.

#### 1. Global Node Search
* **Undiscovered:** The stamp is stripped from search results if queried by its real name (preventing lore spoilers). However, if the user searches for generic terms like "Stamp", "Game", or "Mystery", it appears as:
  * **Icon:** A frosted-glass circle with a glowing `?`.
  * **Title Row:** `Mystery Stamp` `[✨ Undiscovered]`
  * **Subtitle Row:** `340m away • Go there to reveal and collect!`
* **Discovered:** Unlocked and indexed normally.
  * **Title Row:** `Bonsai Master Stamp` `[🏆 Collected]`
  * **Subtitle Row:** `View in your collection`

#### 2. The 2D Map
* **Undiscovered:** Renders as a glowing, pulsating beacon marker. The tooltip simply says "Mystery Stamp". It acts as a beacon pulling them across the park.
* **Discovered:** The pulsating stops. The marker turns into the actual high-res image avatar with an Emerald Green checkmark border, signaling completion.

#### 3. The AR Camera View (The Collect Trigger)
* **Undiscovered:** A glowing 3D box or silhouette hovers over the real-world GPS coordinates in the camera feed. 
* **The Trigger:** When the user's GPS confirms they are within **10 meters** of the coordinates, a haptic vibration fires. The box bursts open on screen, revealing the actual Stamp image, name, and rich lore. The ID is instantly appended to `localStorage`.
* **Discovered:** The unlocked 3D coin/image spins peacefully in the AR view with a "Collected" tag.

#### 4. The Gamification Hub (Bottom Nav Drawer)
The floating "Stamp" action button in the UI opens a frosted-glass bottom drawer with two tabs, serving as the addictive core of the app:

**Tab 1: [ My Passport ] (Inventory & Progression)**
* Displays a progress bar for the active event (e.g., *"October Scavenger Hunt: 1/5 Found"*).
* **Locked Slots:** Dark silhouettes labeled `???`. Tapping them gives a geographic hint (e.g., *"Rumor has it this is near the Glass House..."*).
* **Unlocked Slots:** Fully colored 3D icons. Tapping opens the rich `description` lore.

**Tab 2: [ Leaderboard ] (Frictionless Social Competition)**
* Because the app is frictionless, users do not need to log in to compete.
* **Anonymous Identity:** When a user collects their *first* stamp, the app auto-generates a local identifier (e.g., `LalbaghExplorer_4022`). They can optionally edit this name to personalize their rank.
* **Ranking Logic:** Ranks are sorted entirely by `total_stamps_collected` (DESC). Tie-breakers are resolved by the timestamp of their most recent collection (fastest time wins).
* **UI Display:** Shows Top 10 players globally, plus a persistent sticky row at the bottom showing the user's current rank (e.g., `You: #42`).
