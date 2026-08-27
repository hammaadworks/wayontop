import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@wayontop/ui/lib/supabase';
import { Button } from '@wayontop/ui/components/ui/button';
import { Input } from '@wayontop/ui/components/ui/input';
import { Card } from '@wayontop/ui/components/ui/card';
import { Navigation, LogOut, BarChart3, Save, AlertCircle, CheckCircle2, HelpCircle, Locate } from 'lucide-react';
import { ReportModal } from '../components/ReportModal';
import type { GraphData } from '@wayontop/ui/lib/types';

import Map, { Layer, Source, Marker } from 'react-map-gl/maplibre';
import { setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import * as turf from '@turf/turf';

setWorkerUrl(workerUrl);
const LALBAGH_CENTER = {lat: 12.9500, lng: 77.5850};


export default function SponsorsDashboard() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sponsor, setSponsor] = useState<any>(null);
  const [analytics, setAnalytics] = useState({ impressions: 0, clicks: 0, walk_ins: 0 });
  const mapRef = useRef<any>(null);
  const [graph, setGraph] = useState<GraphData | null>(null);
  const [zones, setZones] = useState<{id: string, name: string}[]>([]);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);
  const navigate = useNavigate();

  const calculateDaysLeft = (endDateStr?: string) => {
    if (!endDateStr) return 0;
    const diff = new Date(endDateStr).getTime() - new Date().getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 3600 * 24)));
  };

  useEffect(() => {
    const loadDashboard = async () => {
      const sponsorId = localStorage.getItem('wayontop_sponsor_id');
      
      if (!sponsorId) {
        navigate('/sponsors/login');
        return;
      }

      // Fetch sponsor profile
      const { data: sponsorData, error: sponsorError } = await supabase
        .from('sponsors')
        .select('*')
        .eq('id', sponsorId)
        .single();

      if (sponsorError || !sponsorData) {
        // Handle error (maybe they are logged in but don't have a sponsor record)
        console.error(sponsorError);
        navigate('/sponsors/login');
        return;
      } else {
        setSponsor(sponsorData);

        // Fetch analytics
        const { data: analyticsData } = await supabase
          .from('sponsor_analytics')
          .select('*')
          .eq('sponsor_id', sponsorData.id);

        if (analyticsData) {
          const totals = analyticsData.reduce((acc, curr) => ({
            impressions: acc.impressions + (curr.impressions || 0),
            clicks: acc.clicks + (curr.clicks || 0),
            walk_ins: acc.walk_ins + (curr.walk_ins || 0),
          }), { impressions: 0, clicks: 0, walk_ins: 0 });
          setAnalytics(totals);
        }
      }

      // Fetch venue zones and nodes
      const [zonesRes, nodesRes] = await Promise.all([
        supabase.from('sponsor_zones').select('*').eq('venue_key', 'lalbagh'),
        supabase.from('nodes').select('*').eq('venue_key', 'lalbagh')
      ]);

      if (zonesRes.data && nodesRes.data) {
        setGraph({
          nodes: nodesRes.data,
          edges: [],
          categories: [],
          events: [],
          sponsorZones: zonesRes.data,
          sponsors: []
        } as unknown as GraphData);
        setZones(zonesRes.data.map(z => ({ id: z.id, name: z.name })));
      }

      setLoading(false);
    };

    loadDashboard();
  }, [navigate]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const updateData: any = {
        name: sponsor.name,
        logo_asset: sponsor.logo_asset,
        creative_asset: sponsor.creative_asset,
        cta_link: sponsor.cta_link,
        tagline: sponsor.tagline,
        zone_ids: sponsor.zone_ids,
    };
    if (newPassword) {
        updateData.password = newPassword;
    }

    const { error } = await supabase
      .from('sponsors')
      .update(updateData)
      .eq('id', sponsor.id);

    setSaving(false);
    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ type: 'success', text: 'Campaign updated successfully.' });
      setNewPassword(''); // Clear password field on success
    }
  };

  const handleLogout = async () => {
    localStorage.removeItem('wayontop_sponsor_id');
    navigate('/sponsors/login');
  };

  const handleZoneChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
    setSponsor({ ...sponsor, zone_ids: selectedOptions });
  };


  // Generate GeoJSON for zones
  const zonesGeoJSON = {
    type: 'FeatureCollection',
    features: (graph?.sponsorZones || []).flatMap(zone => {
      const isOwned = sponsor?.zone_ids?.includes(zone.id);
      const zonePoiIds = zone.poi_ids || (zone.poi_id ? [zone.poi_id] : []);
      const nodes = graph?.nodes.filter(n => zonePoiIds.includes(n.id)) || [];
      if (nodes.length === 0) return [];

      return nodes.map(node => turf.circle([node.lng, node.lat], zone.radius_m, {
        units: 'meters',
        steps: 64,
        properties: {
          id: zone.id,
          radius_m: zone.radius_m,
          color: isOwned ? '#10b981' : '#94a3b8',
        }
      }));
    }).filter(Boolean) as any[]
  };

  const sponsorMarkerData = (graph?.sponsorZones || []).flatMap(zone => {
      const isOwned = sponsor?.zone_ids?.includes(zone.id);
      if (!isOwned) return [];

      const zonePoiIds = zone.poi_ids || (zone.poi_id ? [zone.poi_id] : []);
      const nodes = graph?.nodes.filter(n => zonePoiIds.includes(n.id)) || [];
      if (nodes.length === 0) return [];
      
      const mappedSponsors = [sponsor];
      
      return nodes.flatMap(node => {
          return mappedSponsors.map((mappedSponsor, idx) => {
              const hash = `${zone.id}-${node.id}`.split('').reduce((a, b) => {
                  a = ((a << 5) - a) + b.charCodeAt(0);
                  return a & a;
              }, 0);
              const randomDist = (Math.abs(hash) % 100) / 100;
              
              const baseAngle = (360 / mappedSponsors.length) * idx;
              const angleOffset = (Math.abs(hash) % 30) - 15;
              const angle = baseAngle + angleOffset;

              const distance_m = zone.radius_m * (0.5 + (randomDist * 0.3));
              
              const destination = turf.destination([node.lng, node.lat], distance_m, angle, {units: 'meters'});
              const [lng, lat] = destination.geometry.coordinates;
              return { id: `sponsor-${zone.id}-${node.id}-${idx}`, lat, lng, zone, mappedSponsor, node };
          });
      });
  });

  const mapBounds = graph?.nodes.reduce((acc, node) => {
    return [
      Math.min(acc[0], node.lng),
      Math.min(acc[1], node.lat),
      Math.max(acc[2], node.lng),
      Math.max(acc[3], node.lat)
    ];
  }, [180, 90, -180, -90]) || [LALBAGH_CENTER.lng - 0.01, LALBAGH_CENTER.lat - 0.01, LALBAGH_CENTER.lng + 0.01, LALBAGH_CENTER.lat + 0.01];
  
  const maxPanBounds = [mapBounds[0] - 0.01, mapBounds[1] - 0.01, mapBounds[2] + 0.01, mapBounds[3] + 0.01];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Navigation className="w-5 h-5 text-emerald-600 fill-emerald-600" />
            </div>
            <span className="font-bold tracking-tight text-slate-900"><span className="text-emerald-600">lalbagh</span>.top</span>
          </Link>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => setShowReportModal(true)} className="text-slate-500 hover:text-emerald-600 font-bold">
              <HelpCircle className="w-4 h-4 mr-2" /> Support
            </Button>
            <Button variant="ghost" onClick={handleLogout} className="text-slate-500 hover:text-red-600 font-bold">
              <LogOut className="w-4 h-4 mr-2" /> Logout
            </Button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-12 grid md:grid-cols-3 gap-8">
        
        {/* Sidebar / Stats */}
        <div className="space-y-6">
          <Card className="p-6 border-slate-200 shadow-sm bg-white">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Subscription</h2>
            <div className="mb-4">
              <p className="text-2xl font-black text-slate-900">{sponsor?.plan || 'No Plan Active'}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="text-emerald-600 font-medium">{calculateDaysLeft(sponsor?.end_date)} days remaining</span>
              </div>
            </div>
            <p className="text-sm text-slate-500">To upgrade your plan, please contact your account manager.</p>
          </Card>

          
          <Card className="p-6 border-slate-200 shadow-sm bg-white">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Your Coverage</h2>
            <div className="w-full h-[300px] rounded-xl overflow-hidden shadow-inner border border-slate-200 relative bg-slate-200 mb-2">
              {graph ? (
                <>
                  <div className="absolute top-2 left-2 z-10 pointer-events-none space-y-1">
                    <div className="bg-white/90 backdrop-blur-md text-slate-900 px-3 py-1.5 rounded-xl shadow-lg border border-slate-200 flex items-center gap-2">
                      <span className="font-bold text-xs tracking-wide">Live Map</span>
                    </div>
                    <div className="flex flex-col gap-1 text-[10px] font-bold">
                      <div className="bg-emerald-500 text-white px-2 py-1 rounded-md shadow flex items-center gap-1 w-fit">
                        <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span> Your Zone
                      </div>
                      <div className="bg-slate-400 text-white px-2 py-1 rounded-md shadow flex items-center gap-1 w-fit">
                        <span className="w-1.5 h-1.5 bg-white/70 rounded-full"></span> Other
                      </div>
                    </div>
                  </div>
                  <Map
                    ref={mapRef}
                    initialViewState={{
                    longitude: LALBAGH_CENTER.lng,
                    latitude: LALBAGH_CENTER.lat,
                    zoom: 15,
                    pitch: 0
                  }}
                  maxBounds={maxPanBounds as [number, number, number, number]}
                  minZoom={14.5}
                  maxZoom={18}
                  mapStyle={{
                      version: 8,
                      sources: {
                          'osm': {
                              type: 'raster',
                              tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
                              tileSize: 256, maxzoom: 19, scheme: "xyz"
                          }
                      },
                      layers: [
                          {
                              id: 'osm-base',
                              type: 'raster',
                              source: 'osm',
                              paint: {
                                  "raster-opacity": 1,
                                  "raster-saturation": -0.2,
                                  "raster-contrast": 0.05,
                                  "raster-fade-duration": 300
                              }
                          }
                      ]
                  }}
                  style={{width: '100%', height: '100%'}}
                >
                  <Source id="zones" type="geojson" data={zonesGeoJSON as any}>
                    <Layer
                      id="zone-fill"
                      type="fill"
                      paint={{
                        'fill-color': ['get', 'color'],
                        'fill-opacity': 0.2
                      }}
                    />
                    <Layer
                      id="zone-outline"
                      type="line"
                      paint={{
                        'line-color': ['get', 'color'],
                        'line-width': 2,
                        'line-dasharray': [2, 2]
                      }}
                    />
                    <Layer
                        id="zone-radius-label"
                        type="symbol"
                        layout={{
                            'symbol-placement': 'line',
                            'symbol-spacing': 250,
                            'text-field': ['concat', ['get', 'radius_m'], 'm Zone • '],
                            'text-size': 12,
                            'text-transform': 'uppercase',
                            'text-letter-spacing': 0.2,
                            'text-keep-upright': true
                        }}
                        paint={{
                            'text-color': ['get', 'color'],
                            'text-halo-color': 'rgba(255,255,255,0.9)',
                            'text-halo-width': 2
                        }}
                    />
                  </Source>
                  {sponsorMarkerData.map(({ id, lat, lng, mappedSponsor }) => (
                    <Marker key={id} longitude={lng} latitude={lat} anchor="center">
                      <div className="relative flex flex-col items-center justify-center pointer-events-auto cursor-pointer group">
                        <div className="w-10 h-10 bg-white rounded-full shadow-[0_8px_16px_rgba(0,0,0,0.15)] border-2 border-emerald-500 overflow-hidden flex items-center justify-center hover:scale-110 transition-transform">
                          {mappedSponsor.logo_asset ? (
                            <img src={mappedSponsor.logo_asset} alt={mappedSponsor.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-emerald-500 font-bold text-[10px] uppercase tracking-wider">{mappedSponsor.name?.substring(0, 2) || 'SP'}</span>
                          )}
                        </div>
                        <div className="absolute top-12 bg-black/90 backdrop-blur-md px-2 py-0.5 rounded-md text-[9px] font-bold text-white whitespace-nowrap border border-white/10 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity">
                           {mappedSponsor.name}
                        </div>
                      </div>
                    </Marker>
                  ))}
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute bottom-2 right-2 z-10 shadow-lg bg-white/90 backdrop-blur hover:bg-white text-slate-900 w-8 h-8"
                    onClick={() => mapRef.current?.flyTo({ center: [LALBAGH_CENTER.lng, LALBAGH_CENTER.lat], zoom: 15, duration: 1000 })}
                  >
                    <Locate className="w-4 h-4" />
                  </Button>
                </Map>
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6 border-slate-200 shadow-sm bg-slate-900 text-white">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" /> Performance
            </h2>
            <div className="space-y-6">
              <div>
                <p className="text-slate-400 text-sm font-medium mb-1">Total Impressions</p>
                <p className="text-3xl font-black">{analytics.impressions.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm font-medium mb-1">Click Throughs (CTA)</p>
                <p className="text-3xl font-black">{analytics.clicks.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm font-medium mb-1">Physical Walk-ins</p>
                <p className="text-3xl font-black text-emerald-400">{analytics.walk_ins.toLocaleString()}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Form Area */}
        <div className="md:col-span-2">
          <Card className="p-8 border-slate-200 shadow-sm bg-white">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Campaign Settings</h1>
            <p className="text-slate-500 mb-8">Update your AR assets, branding, and zone placements.</p>

            {message && (
              <div className={`p-4 rounded-xl flex items-center gap-2 mb-8 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
                <p className="text-sm font-medium">{message.text}</p>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Brand Name</label>
                  <Input
                    value={sponsor?.name || ''}
                    onChange={(e) => setSponsor({ ...sponsor, name: e.target.value })}
                    className="bg-slate-50 border-slate-200"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tagline</label>
                  <Input
                    value={sponsor?.tagline || ''}
                    onChange={(e) => setSponsor({ ...sponsor, tagline: e.target.value })}
                    className="bg-slate-50 border-slate-200"
                    placeholder="e.g. The best coffee in town"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Logo Asset URL</label>
                  <Input
                    value={sponsor?.logo_asset || ''}
                    onChange={(e) => setSponsor({ ...sponsor, logo_asset: e.target.value })}
                    className="bg-slate-50 border-slate-200"
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Creative Asset URL (AR)</label>
                  <Input
                    value={sponsor?.creative_asset || ''}
                    onChange={(e) => setSponsor({ ...sponsor, creative_asset: e.target.value })}
                    className="bg-slate-50 border-slate-200"
                    placeholder="https://... (.glb or image)"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Call to Action (CTA) Link</label>
                  <Input
                    value={sponsor?.cta_link || ''}
                    onChange={(e) => setSponsor({ ...sponsor, cta_link: e.target.value })}
                    className="bg-slate-50 border-slate-200"
                    placeholder="https://..."
                  />
                </div>

                <div className="sm:col-span-2 border-t border-slate-100 pt-6 mt-2">
                  <label className="block text-sm font-bold text-slate-900 mb-2">Target Zones</label>
                  <p className="text-sm text-slate-500 mb-4">Hold Cmd/Ctrl to select multiple zones depending on your plan.</p>
                  <select
                    multiple
                    value={sponsor?.zone_ids || []}
                    onChange={handleZoneChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none min-h-[160px]"
                  >
                    {zones.map((zone) => (
                      <option key={zone.id} value={zone.id} className="p-2 hover:bg-emerald-50 rounded-md">
                        {zone.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2 border-t border-slate-100 pt-6 mt-2">
                  <label className="block text-sm font-bold text-slate-900 mb-1">Update Password</label>
                  <p className="text-sm text-slate-500 mb-4">Leave blank if you don't want to change your password.</p>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="bg-slate-50 border-slate-200"
                    placeholder="New password"
                  />
                </div>
              </div>

              <div className="pt-6">
                <Button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 rounded-xl"
                >
                  {saving ? 'Saving...' : (
                    <>
                      <Save className="w-5 h-5 mr-2" /> Save Changes
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </main>

      {showReportModal && (
        <ReportModal 
          onClose={() => setShowReportModal(false)}
          defaultIssueType="sponsor"
          fixedIssueType={true}
        />
      )}
    </div>
  );
}
