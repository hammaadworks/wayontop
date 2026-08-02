
-- 5. venues table
CREATE TABLE IF NOT EXISTS public.venues (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    lat double precision NOT NULL,
    lng double precision NOT NULL,
    zoom integer DEFAULT 16,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access on venues" ON public.venues;
CREATE POLICY "Allow public read access on venues" 
ON public.venues FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow service role all access on venues" ON public.venues;
CREATE POLICY "Allow service role all access on venues" 
ON public.venues FOR ALL USING (true);
