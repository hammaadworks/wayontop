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
* `icon_key` (String): Lucide icon (e.g., `Droplets`).
* `color_theme` (String): Design System token (e.g., `cyan`).
* `name` (JSONB): `{"en": "Water", "kn": "ನೀರು"}`
* `synonyms` (JSONB): `{"en": ["drink", "thirsty"], "kn": ["ನೀರು ಬೇಕು"]}`

### 4. Table C: `nodes` (The Physical Map Points)
* `id` (UUID)
* `category_id` (UUID): Foreign key to `node_categories`. (Mandatory for all nodes, even POIs).
* `lat` / `lng` (Float)
* `name` (JSONB): Optional localized override `{"en": "West Gate", "kn": "ಪಶ್ಚಿಮ ಗೇಟ್"}`. **Fallback:** If null, UI defaults to `node_categories.name`.
* `description` (JSONB): Rich text for the UI Drawer `{"en": "Built in 1890...", "kn": "1890 ರಲ್ಲಿ ನಿರ್ಮಿಸಲಾಗಿದೆ..."}`.
* `synonyms` (JSONB): Optional node-specific synonyms `{"en": ["crystal palace"]}`. These are combined with the category synonyms during search.
* `image_url` (String): URL to Supabase bucket. **UI UX Fallback:** If present, the map renders a circular image avatar. If null, falls back to `category.icon_key`.
* `event_id` (UUID): Optional foreign key to `events`. If the linked event is inactive (`is_active: false` or `today > end_date`), the app completely ignores this node for map rendering, searching, and A* routing.
* `status` (Enum): `active` or `construction`.
* `is_paid` (Boolean): Renders the ₹ symbol.

---

## 5. The `<GlobalNodeSearch />` Component (UI & UX Behavior)
The Global Search is the brain that connects the taxonomy to the tourist. It sits over the map and updates in real-time.

### Core Behaviors
1. **The Fallback Name Rule:** The UI title always explicitly displays `node.name?.[lang] || node.category.name[lang]`.
2. **Deep Indexing (Fuse.js):** The search engine combines node and category text. It scans the user's query against `node.name`, `node.synonyms`, `node_categories.name`, and `node_categories.synonyms`.
3. **Absolute Distance Sorting (Debounced):** To maintain 60FPS on mobile, the search input is strictly debounced (e.g., 300ms). Once triggered, it runs a Haversine distance calculation from the user's current GPS. Results are ALWAYS sorted nearest to furthest.

### Scenario Demonstrations (Look & Feel)
When a user opens the search bar, the list items dynamically render based on the DB state. Every search result item consists of four visual slots:
1. **Avatar/Icon:** Left side (either a photo thumbnail or a colored Lucide icon).
2. **Title:** Top text.
3. **Badges:** Inline badges immediately next to the title (Paid, Event, Construction).
4. **Subtitle:** Bottom text (Distance + dynamic helper text).

#### 1. The POI Scenario (Unique Landmark)
* **DB State:** `base_type: 'poi'`, `name: {"en": "The Glass House"}`, `image_url: 'https://...'`
* **Search Query:** "Crystal Palace" (matches `node.synonyms`)
* **UI Layout:**
  * **Avatar:** A circular, frosted-glass thumbnail of the `image_url` (Replaces the generic category icon).
  * **Title:** "The Glass House"
  * **Badges:** None
  * **Subtitle:** "120m away"
* **Edge Case Handled:** Overrides the generic category name and bypasses the Lucide icon to provide a rich photo experience.

#### 2. The Minor Utility Spam Filter (Garbage Bins)
* **DB State:** `base_type: 'utility_minor'`, `name: null`, `category.name: {"en": "Garbage"}`
* **Search Query:** "Trash" (matches `category.synonyms`)
* **UI Layout:**
  * **Icon:** A small `rose` colored `Trash2` Lucide icon.
  * **Title:** "Garbage"
  * **Badges:** None
  * **Subtitle:** "45m away • near Bonsai Garden"
* **Edge Case Handled:** There are 50 bins in the park. Because it's `utility_minor`, the engine aggressively clamps the results to ONLY show the Top 2 nearest to prevent spamming the list. It also dynamically computes the nearest POI ("Bonsai Garden") to provide a relative spatial anchor in the subtitle.

#### 3. The `is_paid` Modifier (Paid Toilets)
* **DB State:** `base_type: 'utility_major'`, `category.name: {"en": "Washroom"}`, `is_paid: true`
* **Search Query:** "Loo"
* **UI Layout:**
  * **Icon:** A `blue` `PersonStanding` icon.
  * **Title:** "Washroom"
  * **Badges:** 🟩 `[₹ Paid]` (Emerald green inline badge)
  * **Subtitle:** "80m away • near West Gate"

#### 4. The Event Modifier (Temporary Canteen)
* **DB State:** `base_type: 'utility_major'`, `name: {"en": "Flower Show Canteen"}`, `event_id: 'evt_9'`
* **Search Query:** "Food"
* **UI Layout:**
  * **Icon:** An `amber` `Utensils` icon.
  * **Title:** "Flower Show Canteen"
  * **Badges:** 🪷 `[✨ Republic Day Flower Show]` (Magenta event badge)
  * **Subtitle:** "300m away"
* **Edge Case Handled:** The engine checks the `events` table. If `evt_9` is inactive or expired, this node vanishes completely from search and A* routing.

#### 5. Same-Name Stacking (Park Gates)
* **DB State:** Multiple nodes with `base_type: 'gate'`
* **Search Query:** "Gate"
* **UI Layout:**
  * **Item 1:** "West Gate" • "200m away"
  * **Item 2:** "South Gate" • "800m away"
  * **Item 3:** "Double Road Gate" • "1.2km away"
* **Edge Case Handled:** Instead of confusing the user with identical icons scattered around, identical base types stack cleanly, strictly sorted by distance.

#### 6. The Status Modifier (Construction/Closed)
* **DB State:** `base_type: 'poi'`, `name: {"en": "Lotus Pond"}`, `status: 'construction'`
* **Search Query:** "Lotus"
* **UI Layout:**
  * **Avatar:** Greyscale or faded thumbnail image.
  * **Title:** ~~"Lotus Pond"~~ (Strikethrough text)
  * **Badges:** 🚧 `[Closed / Renovation]` (Amber warning badge)
  * **Subtitle:** "500m away"
* **Edge Case Handled:** The user can still search for it, but the UI clearly warns them it is under construction before they walk 500m to a blocked path.

#### 7. The Gamification Node (Stamps)
* **DB State:** `base_type: 'stamp'`, `name: {"en": "Golden Pumpkin"}`, `event_id: 'evt_halloween'`
* **Search Query:** "Pumpkin"
* **UI Layout:**
  * **Icon:** A glowing, animated 3D coin/stamp icon (bypasses standard Lucide icons).
  * **Title:** "Golden Pumpkin"
  * **Badges:** 🏆 `[Epic Rarity]` 
  * **Subtitle:** "15m away • Collect now!"
* **Edge Case Handled:** Stamps hook into the gamification engine. Searching for them is allowed, but the subtitle acts as a call-to-action ("Collect now!").
