import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fcacmjyfpfzuhenzukna.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjYWNtanlmcGZ6dWhlbnp1a25hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTQwMjk4NywiZXhwIjoyMTAwOTc4OTg3fQ.e3gooA4rQP8mIyxeebzSlZLYetquaUrMOjhDWSvw_9U';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const graphData = {
  "nodes": [
    { "id": "n1", "name": "North Gate", "lat": 12.9500, "lng": 77.5850, "type": "gate", "tags": ["entrance", "exit", "parking"] },
    { "id": "n2", "name": "Glass House", "lat": 12.9495, "lng": 77.5847, "type": "poi", "tags": ["flower show", "famous", "glass"] },
    { "id": "n3", "name": "Path Junction A", "lat": 12.9497, "lng": 77.5849, "type": "junction", "tags": [] }
  ],
  "edges": [
    { "from": "n1", "to": "n3", "distance_m": 85 },
    { "from": "n3", "to": "n2", "distance_m": 40 }
  ],
  "sponsors": [
    {
      "id": "s1",
      "name": "MTR",
      "poi_id": "n1",
      "radius_m": 20,
      "banner_asset": "mtr-banner.png",
      "video_asset": "mtr-ad.mp4"
    }
  ]
};

const stampsData = {
  "version": 1,
  "stamps": [
    { "id": "st1", "name": "Glass House", "lat": 12.9495, "lng": 77.5847, "rarity": "common", "poi_link": "n2" },
    { "id": "st2", "name": "Hidden Bonsai Corner", "lat": 12.9488, "lng": 77.5832, "rarity": "rare", "poi_link": null }
  ]
};

async function seed() {
  const { data: gData, error: gErr } = await supabase.from('content_blobs').upsert({
    key: 'graph',
    data: graphData
  });
  console.log('Graph seed:', gErr || 'Success');

  const { data: sData, error: sErr } = await supabase.from('content_blobs').upsert({
    key: 'stamps',
    data: stampsData
  });
  console.log('Stamps seed:', sErr || 'Success');
}

seed();
