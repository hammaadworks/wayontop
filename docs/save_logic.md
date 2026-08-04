# Map Data Saving Logic

The producer app relies on a hybrid local-first + remote synchronization approach to ensure data resilience even if the user drops network connection in the field.

## State Management

The graph data (`nodes`, `edges`, `sponsors`) is managed inside a React custom hook (`useGraph.ts`). This hook manages three layers of data:
1. **React State (`data`)**: The active memory state being edited on the map.
2. **Local Storage**: A browser-level cache storing the latest valid graph alongside a `timestamp` (Date.now()).
3. **Supabase (Remote)**: The central database storing the definitive graph as a JSONB blob in the `venue_content` table, with an `updated_at` timestamp.

## The Save Pipeline

### 1. The Edit Phase
When a user drops a node or connects an edge, the React state (`data`) updates instantly. A `useEffect` hook detects this change:
- It compares the new state against the last successfully saved string (`lastSavedData`).
- If changes are detected, it immediately saves the new state to `localStorage` with a fresh timestamp and flips the UI `syncState` to `'unsaved'`.
- This ensures that if the browser crashes *before* the user hits Save, the work is still preserved locally.

### 2. The Manual Save
When the user clicks the "Save" button (or hits the "Back" button which triggers a save), the `saveGraph` function executes:
- **Sanity Check**: It prevents saving if the graph is currently loading (`loadingGraph === true`) or if there are no unsaved changes (`JSON.stringify(data) === lastSavedData.current`). This specifically prevents a known edge case where clicking "Back" too early could overwrite the DB with an empty graph.
- **Supabase Upsert**: It uploads the `data` to the `venue_content` table using `upsert`. (Since the table's primary key is the composite of `venue_key` and `content_type`, `upsert` safely updates the existing row without creating duplicates).
- **Finalization**: If successful, it updates `lastSavedData` to the new state and overwrites `localStorage` with a new timestamp so that the local cache reflects the newly confirmed remote state. It then briefly sets `syncState` to `'saved'` (green icon) before returning to `'idle'`.

### 3. The Initialization Phase (Loading)
When the user opens a venue, `loadGraph` runs:
1. It fetches `remoteData` and `updated_at` from Supabase.
2. It fetches `localData` and `timestamp` from `localStorage`.
3. **Conflict Resolution**: It compares the timestamps:
   - If `localTimestamp > remoteTimestamp` (e.g. the user went offline, made changes, and the app closed before a successful sync), the app loads `localData` into state and *automatically* attempts to push it to Supabase in the background.
   - If `remoteTimestamp > localTimestamp`, or if `localData` doesn't exist, it trusts the remote DB and overwrites local storage.
   - If both are empty, it initializes a blank graph.

### Why Did the Disappearing Path Bug Happen?
Previously, if a user opened the venue and immediately hit the "Back" button *before* Supabase could finish loading the existing graph, the `data` state was still momentarily empty. The "Back" button was configured to automatically call `saveGraph()` to ensure no work was lost. 
However, because it didn't check if the data had actually changed or if it was still loading, it eagerly uploaded that empty state to Supabase, permanently overwriting the path data. The fix introduced strict gating: `saveGraph` will now immediately abort if `loadingGraph` is true or if the current data exactly matches the last known saved state.
