-- 1. Add venue linking and zone_ids to the existing sponsors table
ALTER TABLE public.sponsors ADD COLUMN venue_key text REFERENCES venues(key) ON DELETE CASCADE;
ALTER TABLE public.sponsors ADD COLUMN zone_ids text[] DEFAULT '{}';

-- 2. Create the missing Zones table
CREATE TABLE public.sponsor_zones (
    id text PRIMARY KEY,
    venue_key text REFERENCES venues(key) ON DELETE CASCADE,
    name text NOT NULL,
    poi_ids integer[] DEFAULT '{}',
    radius_m numeric NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
