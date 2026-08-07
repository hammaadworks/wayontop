# Viral Migration & Scaling SOP

This document outlines the emergency procedures for scaling the Lalbagh AR Navigator (WayOnTop) in the event of unexpected viral traffic that threatens to exhaust the Supabase Free Tier limits (specifically the 50GB storage bandwidth egress limit).

## Scenario 1: The Zero-Downtime Upgrade / Project Transfer (Highly Recommended)

If the app goes viral mid-event, **DO NOT** attempt a manual database migration. Manual migrations require downtime and changing API keys in your production code. Instead, use the native upgrade or transfer features.

### Option A: In-Place Upgrade
1. Go to the Supabase Dashboard for the current project.
2. Navigate to **Settings -> Billing**.
3. Add a credit card and upgrade to the **Pro Plan ($25/mo)**.
4. **Result:** Limits are instantly lifted. Zero downtime.

### Option B: Transfer to a Client/Corporate Account
If a sponsor or the client wants to assume the billing on their own account:
1. Have the client create a new Supabase Organization and upgrade it to Pro.
2. In your current Free Tier project dashboard, go to **Settings -> General**.
3. Scroll down to **Transfer Project** and select the client's organization.
4. **Result:** The entire database, RPCs, Storage, and API keys move instantly. Your frontend code does not need to change. Zero downtime.

---

## Scenario 2: The Manual "Hard Clone" Migration (Supabase CLI)

Use this method **only** if you need to duplicate the project into a completely fresh, isolated database (e.g., turning the current project into a staging environment and spinning up a new production instance).

### Prerequisites
- Install the Supabase CLI: `npm install -g supabase`
- Login to the CLI: `supabase login`

### Step 1: Export Schema & RPCs
Dump the entire structure, including all tables, rules, and RPC functions from the old project:
```bash
supabase db dump --project-id <OLD_PROJECT_ID> > schema.sql
```

### Step 2: Export Data
Dump the actual rows (sponsor zones, graph data, user logs):
```bash
supabase db dump --data-only --project-id <OLD_PROJECT_ID> > data.sql
```

### Step 3: Import to the New Project
Push the exported SQL to the new paid project:
```bash
supabase db execute --file schema.sql --project-id <NEW_PROJECT_ID>
supabase db execute --file data.sql --project-id <NEW_PROJECT_ID>
```

### Step 4: Migrate Storage Files
Database dumps **do not** move the physical `.mp4` and `.jpg` files inside the Storage buckets.
Since the Admin SOP strictly enforces 1-2MB video sizes and <50 sponsors, the total payload is extremely small (under 100MB).
1. Download all files from the `sponsors` bucket in the old Supabase dashboard.
2. Drag and drop them into the `sponsors` bucket in the new Supabase dashboard.
*(Alternatively, write a quick Node.js script using `@supabase/supabase-js` to pipe the files over programmatically).*

### Step 5: Update Environment Variables
Update your Vercel/Cloudflare frontend environment variables to point to the new project:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
Redeploy the frontend to apply the changes.
