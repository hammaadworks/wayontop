-- Disable existing tables
DROP TABLE IF EXISTS public.content_blobs CASCADE;
DROP TABLE IF EXISTS public.analytics_events CASCADE;
DROP TABLE IF EXISTS public.golden_stamp CASCADE;
DROP TABLE IF EXISTS public.golden_stamps CASCADE;
DROP TABLE IF EXISTS public.leaderboard CASCADE;
DROP TABLE IF EXISTS public.venues CASCADE;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. venues (The core entity)
CREATE TABLE IF NOT EXISTS public.venues (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    key text UNIQUE NOT NULL,
    lat double precision NOT NULL,
    lng double precision NOT NULL,
    zoom integer DEFAULT 16,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access on venues" ON public.venues FOR SELECT USING (true);
CREATE POLICY "Allow service role all access on venues" ON public.venues FOR ALL USING (true);

-- 2. venue_content (Replaces content_blobs)
-- Stores various JSON blobs for a venue, like graph, stamps, sponsors.
CREATE TABLE IF NOT EXISTS public.venue_content (
    venue_key text NOT NULL REFERENCES public.venues(key) ON DELETE CASCADE,
    content_type text NOT NULL, -- e.g. 'graph', 'stamps', 'sponsors'
    data jsonb NOT NULL,
    version int DEFAULT 1,
    updated_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY (venue_key, content_type)
);

ALTER TABLE public.venue_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access on venue_content" ON public.venue_content FOR SELECT USING (true);
CREATE POLICY "Allow service role all access on venue_content" ON public.venue_content FOR ALL USING (true);

-- 3. analytics_events
CREATE TABLE IF NOT EXISTS public.analytics_events (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_key text NOT NULL REFERENCES public.venues(key) ON DELETE CASCADE,
    device_uuid text NOT NULL,
    event_type text NOT NULL,
    event_data jsonb,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon insert to analytics_events" ON public.analytics_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow service role all access on analytics_events" ON public.analytics_events FOR ALL USING (true);

-- 4. golden_stamps
-- (Instead of hardcoded 'golden_1', it is scoped to a venue)
CREATE TABLE IF NOT EXISTS public.golden_stamps (
    id text NOT NULL,
    venue_key text NOT NULL REFERENCES public.venues(key) ON DELETE CASCADE,
    current_lat double precision NOT NULL,
    current_lng double precision NOT NULL,
    claimed_by text,
    claimed_at timestamp with time zone,
    version integer DEFAULT 1,
    updated_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY (id, venue_key)
);

-- RPC function to claim the golden stamp atomically, now scoped to venue
CREATE OR REPLACE FUNCTION claim_golden_stamp(stamp_id text, target_venue_key text, player_id text, new_lat double precision, new_lng double precision)
RETURNS boolean AS $$
DECLARE
    affected_rows integer;
BEGIN
    UPDATE public.golden_stamps
    SET 
        claimed_by = player_id,
        claimed_at = now(),
        current_lat = new_lat,
        current_lng = new_lng,
        version = version + 1,
        updated_at = now()
    WHERE id = stamp_id AND venue_key = target_venue_key AND (claimed_by IS NULL OR claimed_at < now() - interval '1 hour');
    
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    
    RETURN affected_rows > 0;
END;
$$ LANGUAGE plpgsql;

-- 5. leaderboard 
-- (Users compete per venue)
CREATE TABLE IF NOT EXISTS public.leaderboard (
    device_uuid text NOT NULL,
    venue_key text NOT NULL REFERENCES public.venues(key) ON DELETE CASCADE,
    ig_handle text,
    total_stamps int DEFAULT 0,
    distance_walked_km double precision DEFAULT 0,
    last_synced_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY (device_uuid, venue_key)
);

ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon insert to leaderboard" ON public.leaderboard FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update to leaderboard" ON public.leaderboard FOR UPDATE USING (true);
CREATE POLICY "Allow public read access to leaderboard" ON public.leaderboard FOR SELECT USING (true);
