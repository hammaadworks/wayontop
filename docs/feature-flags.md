# Feature Flags & Remote Config

WayOnTop uses a database-driven Remote Config system to toggle features instantly without requiring code deployments. This is particularly useful for temporary promotional features (like the Mall showcase venue switcher) or gradually rolling out new UI elements.

## How It Works
On boot, the Consumer app (`consumer/src/App.tsx`) fires a lightweight query to the `global_settings` table in Supabase. These flags are parsed and merged into a React state called `remoteFeatureFlags`. Components then react dynamically to these flags.

## Database Schema
To support this, the Supabase database must have the following table:

**Table Name:** `global_settings`

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `key` | `text` | Primary Key | The identifier for the flag (e.g., `enable_venue_switcher`) |
| `value` | `text` | | The value stored as a string (e.g., `'true'`, `'false'`, `'10'`) |

### Row Level Security (RLS)
The consumer app queries this table anonymously. You must enable RLS on `global_settings` and add a policy allowing public read access:
- **Action:** `SELECT`
- **Target Roles:** `anon`, `authenticated`
- **Policy:** `true`

## Fallback Behavior (Safety First)
If the database fetch fails (e.g., network error, table doesn't exist, RLS blocks it), the app handles it gracefully. It will log a warning to the console and **fall back to the default values** defined in the initial state of `remoteFeatureFlags` (which defaults to `false` in production). This ensures the UI never breaks and missing tables never crash the app.

## Adding a New Flag
1. Add the key-value row to the `global_settings` table in Supabase.
2. In `consumer/src/App.tsx`, add your new flag to the initial `remoteFeatureFlags` state with a safe default.
3. In the `useEffect` parsing logic, map the database key to your state variable.
4. Pass the new flag from `remoteFeatureFlags` to whichever components require it.
