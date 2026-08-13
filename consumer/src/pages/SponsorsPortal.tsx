import { useState, useEffect } from 'react';
import { Navigation, Target, LineChart, MapPin, ArrowRight, Plus, Maximize, Minimize } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@wayontop/ui/components/ui/button';
import { Card } from '@wayontop/ui/components/ui/card';
import { supabase } from '@wayontop/ui/lib/supabase';
import type { GraphData } from '@wayontop/ui/lib/types';
import Map, { Layer, Source, Marker } from 'react-map-gl/maplibre';
import { setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import * as turf from '@turf/turf';
import { ReportModal } from '../components/ReportModal';

setWorkerUrl(workerUrl);

const LALBAGH_CENTER = {lat: 12.9500, lng: 77.5850};

export default function SponsorsPortal() {
  const [showContactModal, setShowContactModal] = useState(false);
  const [prefilledMessage, setPrefilledMessage] = useState('');
  const [graph, setGraph] = useState<GraphData | null>(null);
  const [sponsors, setSponsors] = useState<any[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.from('venue_content')
      .select('data')
      .eq('venue_key', 'lalbagh')
      .eq('content_type', 'graph')
      .maybeSingle()
      .then(res => {
        if (res.data?.data) {
          setGraph(res.data.data as GraphData);
        }
      });
      
    supabase.from('sponsors').select('*').then(res => {
      if (res.data) setSponsors(res.data);
    });
  }, []);

  const handleLogin = () => {
    navigate('/sponsors/login');
  };

  // Generate GeoJSON for zones
  const zonesGeoJSON = {
    type: 'FeatureCollection',
    features: (graph?.sponsorZones || []).flatMap(zone => {
      const isFilled = zone.sponsor_ids && zone.sponsor_ids.length > 0;
      const zonePoiIds = zone.poi_ids || (zone.poi_id ? [zone.poi_id] : []);
      const nodes = graph?.nodes.filter(n => zonePoiIds.includes(n.id)) || [];
      if (nodes.length === 0) return [];

      return nodes.map(node => turf.circle([node.lng, node.lat], zone.radius_m, {
        units: 'meters',
        steps: 64,
        properties: {
          id: zone.id,
          radius_m: zone.radius_m,
          color: isFilled ? '#ef4444' : '#10b981', // red for filled, green for available
        }
      }));
    }).filter(Boolean) as any[]
  };

  const sponsorMarkerData = (graph?.sponsorZones || []).flatMap(zone => {
      const isFilled = zone.sponsor_ids && zone.sponsor_ids.length > 0;
      if (!isFilled) return [];
      
      const activeSponsors = zone.sponsor_ids!.map(id => sponsors.find(s => s.id === id)).filter(Boolean);
      if (activeSponsors.length === 0) return [];

      const zonePoiIds = zone.poi_ids || (zone.poi_id ? [zone.poi_id] : []);
      const nodes = graph?.nodes.filter(n => zonePoiIds.includes(n.id)) || [];
      if (nodes.length === 0) return [];
      
      return nodes.flatMap(node => {
          return activeSponsors.map((mappedSponsor, idx) => {
              const hash = `${zone.id}-${node.id}`.split('').reduce((a, b) => {
                  a = ((a << 5) - a) + b.charCodeAt(0);
                  return a & a;
              }, 0);
              const randomDist = (Math.abs(hash) % 100) / 100;
              
              const baseAngle = (360 / activeSponsors.length) * idx;
              const angleOffset = (Math.abs(hash) % 30) - 15;
              const angle = baseAngle + angleOffset;

              const distance_m = zone.radius_m * (0.5 + (randomDist * 0.3));
              
              const destination = turf.destination([node.lng, node.lat], distance_m, angle, {units: 'meters'});
              const [lng, lat] = destination.geometry.coordinates;
              return { id: `sponsor-${zone.id}-${node.id}-${idx}`, lat, lng, zone, mappedSponsor, node };
          });
      });
  });

  // Calculate bounds from all nodes to auto-focus map
  const bounds = graph?.nodes.reduce((acc, node) => {
    return [
      Math.min(acc[0], node.lng),
      Math.min(acc[1], node.lat),
      Math.max(acc[2], node.lng),
      Math.max(acc[3], node.lat)
    ];
  }, [180, 90, -180, -90]);

  // Fallback to center if bounds calculation fails or nodes are empty
  const mapBounds = bounds && bounds[0] !== 180 ? bounds : [
    LALBAGH_CENTER.lng - 0.01, LALBAGH_CENTER.lat - 0.01,
    LALBAGH_CENTER.lng + 0.01, LALBAGH_CENTER.lat + 0.01
  ];

  // Add some padding for the hard pan limit so users can still see the edges comfortably
  const maxPanBounds = [
    mapBounds[0] - 0.01,
    mapBounds[1] - 0.01,
    mapBounds[2] + 0.01,
    mapBounds[3] + 0.01,
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Navigation className="w-5 h-5 text-emerald-600 fill-emerald-600" />
            </div>
            <span className="font-bold tracking-tight">WayOnTop <span className="text-emerald-600">Brands</span></span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <Button 
              onClick={handleLogin}
              variant="ghost"
              className="font-bold text-slate-600 hover:text-slate-900"
            >
              Login
            </Button>
            <Button 
              onClick={() => setShowContactModal(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-full px-4 sm:px-6 transition-all shadow-md"
            >
              Sponsor
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Content Layout */}
      <main className="pt-20 px-4 sm:px-6 max-w-7xl mx-auto pb-24">
        {/* Mobile Hero (Hidden on Desktop) */}
        <section className="md:hidden text-center space-y-6 mb-8 pt-4">
          <h1 className="text-5xl font-black tracking-tight text-slate-900 leading-tight">
            Own the Map.<br />
            Capture the Footfall.
          </h1>
          <p className="text-xl text-slate-600 max-w-lg mx-auto">
            Turn high-traffic zones in Lalbagh Botanical Garden into interactive AR storefronts. Secure the green zones before they turn red.
          </p>
          <div className="pt-4 flex justify-center gap-4">
            <Button 
              onClick={() => setShowContactModal(true)}
              className="h-14 px-8 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg shadow-lg"
            >
              Sponsor a Zone <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </section>

        <div className="flex flex-col md:flex-row gap-8 md:gap-12 items-start relative">
          
          {/* Map Column (Sticky, Right on PC) */}
          <div className={`w-full md:w-1/2 md:sticky md:top-24 z-40 transition-all duration-300 ease-in-out md:order-2 ${isFullscreen ? 'fixed inset-0 z-[100] h-[100dvh] w-screen rounded-none bg-slate-900' : 'h-[45vh] md:h-[calc(100vh-8rem)] rounded-3xl overflow-hidden shadow-2xl border border-slate-200 bg-slate-200'}`}>
            {graph ? (
              <>
                <Map
                  initialViewState={{
                    longitude: LALBAGH_CENTER.lng,
                    latitude: LALBAGH_CENTER.lat,
                    zoom: 14.5,
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

                  {/* Scattered Bubbles for Filled Zones */}
                  {sponsorMarkerData.map(({ id, lat, lng, zone, mappedSponsor }) => (
                    <Marker key={id} longitude={lng} latitude={lat} anchor="center">
                      <div className="relative flex flex-col items-center justify-center pointer-events-auto cursor-pointer group z-40">
                        <div className="w-10 h-10 bg-white rounded-full shadow-[0_8px_16px_rgba(0,0,0,0.15)] border-2 border-red-500 overflow-hidden flex items-center justify-center hover:scale-110 transition-transform">
                          {mappedSponsor.logo_asset ? (
                            <img src={mappedSponsor.logo_asset} alt={mappedSponsor.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-slate-500 font-bold text-[10px] uppercase tracking-wider">{mappedSponsor.name?.substring(0, 2) || 'SP'}</span>
                          )}
                        </div>
                        <div className="absolute top-12 bg-red-50/90 backdrop-blur-md px-2 py-0.5 rounded-md text-[9px] font-bold text-red-600 whitespace-nowrap border border-red-200 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity z-50">
                           {mappedSponsor.name}
                        </div>
                      </div>
                    </Marker>
                  ))}

                  {/* Pulsing Target for Available Zones */}
                  {(graph.sponsorZones || []).filter(z => !z.sponsor_ids || z.sponsor_ids.length === 0).map(zone => {
                    const zonePoiIds = zone.poi_ids || (zone.poi_id ? [zone.poi_id] : []);
                    const poi = graph.nodes.find(n => n.id === zonePoiIds[0]);
                    if (!poi) return null;
                    
                    return (
                      <Marker key={zone.id} longitude={poi.lng} latitude={poi.lat} anchor="center">
                        <div className="flex flex-col items-center drop-shadow-md cursor-pointer group hover:scale-105 transition-transform relative pointer-events-auto z-30">
                          <div className="w-10 h-10 rounded-full border-2 border-white bg-emerald-500 shadow-[0_4px_10px_rgba(16,185,129,0.4)] flex items-center justify-center text-white animate-pulse">
                            <Plus className="w-5 h-5" />
                          </div>
                          <div className="text-[10px] font-bold px-2.5 py-1 rounded-md mt-2 border shadow-lg backdrop-blur-md absolute top-10 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 bg-emerald-50/90 text-emerald-700 border-emerald-200">
                            {zone.name}
                          </div>
                        </div>
                      </Marker>
                    );
                  })}
                </Map>
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute bottom-4 right-4 z-10 shadow-lg bg-white/90 backdrop-blur hover:bg-white text-slate-900"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                >
                  {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                </Button>
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>

          {/* Right/Bottom Column: Scrollable Content */}
          <div className="w-full md:w-1/2 space-y-24 z-10 pt-4 md:pt-12 md:order-1">
            
            {/* Hero Copy (Desktop only) */}
            <section className="hidden md:block md:text-left space-y-6">
              <h1 className="md:text-6xl lg:text-7xl font-black tracking-tight text-slate-900 leading-tight">
                Own the Map.<br />
                Capture the Footfall.
              </h1>
              <p className="text-xl text-slate-600 max-w-lg md:mx-0">
                Turn high-traffic zones in Lalbagh Botanical Garden into interactive AR storefronts. Secure the green zones before they turn red.
              </p>
              <div className="pt-4 flex md:justify-start gap-4">
                <Button 
                  onClick={() => setShowContactModal(true)}
                  className="h-14 px-8 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg shadow-lg"
                >
                  Sponsor a Zone <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </div>
            </section>

            {/* Pricing Packages */}
            <section className="space-y-8">
              <div className="text-center md:text-left">
                <h2 className="text-4xl font-black text-slate-900 mb-4">Transparent Pricing</h2>
                <p className="text-lg text-slate-600 max-w-lg mx-auto md:mx-0">Choose a plan that fits your campaign goals. No hidden fees. Secure your AR real estate across Lalbagh.</p>
              </div>
              
              <div className="grid gap-8">
                {/* August Pack */}
                <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-blue-100 text-blue-800 font-bold px-4 py-1 rounded-bl-xl text-xs md:text-sm">Most Popular</div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">Independence August Pack</h3>
                  <p className="text-slate-500 mb-6">Short-term burst campaign for August only.</p>
                  
                  <div className="space-y-4">
                    <div className="bg-slate-50 rounded-2xl p-4 md:p-5 border border-slate-100 flex items-center justify-between group hover:border-blue-200 transition-colors">
                      <div>
                        <h4 className="font-bold text-lg text-blue-700">Blue Pack</h4>
                        <p className="text-xs md:text-sm text-slate-600">Choose any 2 zones across Lalbagh</p>
                      </div>
                      <div className="text-right">
                        <div className="text-xl md:text-2xl font-black text-slate-900">₹1,500</div>
                        <Button 
                          size="sm" 
                          className="mt-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-xs md:text-sm"
                          onClick={() => {
                            setPrefilledMessage("Interested in Blue Pack\nBrand Name: ");
                            setShowContactModal(true);
                          }}
                        >Select</Button>
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-2xl p-4 md:p-5 border border-slate-100 flex items-center justify-between group hover:border-slate-300 transition-colors">
                      <div>
                        <h4 className="font-bold text-lg text-slate-700">White Pack</h4>
                        <p className="text-xs md:text-sm text-slate-600">Choose any 5 zones across Lalbagh</p>
                      </div>
                      <div className="text-right">
                        <div className="text-xl md:text-2xl font-black text-slate-900">₹2,000</div>
                        <Button 
                          size="sm" 
                          className="mt-2 bg-slate-800 hover:bg-slate-900 text-white rounded-full text-xs md:text-sm"
                          onClick={() => {
                            setPrefilledMessage("Interested in White Pack\nBrand Name: ");
                            setShowContactModal(true);
                          }}
                        >Select</Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Saver Bundle */}
                <div className="bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-800 shadow-xl relative overflow-hidden text-white">
                  <div className="absolute top-0 right-0 bg-yellow-400 text-slate-900 font-bold px-4 py-1 rounded-bl-xl text-xs md:text-sm">Best Value</div>
                  <h3 className="text-2xl font-bold text-white mb-2">2026 Saver Bundle Pack</h3>
                  <p className="text-slate-400 mb-6">Long-term brand presence from August to December.</p>
                  
                  <div className="space-y-4">
                    <div className="bg-white/5 rounded-2xl p-4 md:p-5 border border-white/10 flex items-center justify-between group hover:border-slate-400 transition-colors">
                      <div>
                        <h4 className="font-bold text-lg text-slate-300">Silver Pack</h4>
                        <p className="text-xs md:text-sm text-slate-400">Choose any 2 zones across Lalbagh</p>
                      </div>
                      <div className="text-right">
                        <div className="text-xl md:text-2xl font-black text-white">₹5,000</div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="mt-2 border-slate-500 hover:bg-slate-800 text-white rounded-full text-xs md:text-sm"
                          onClick={() => {
                            setPrefilledMessage("Interested in Silver Pack\nBrand Name: ");
                            setShowContactModal(true);
                          }}
                        >Select</Button>
                      </div>
                    </div>

                    <div className="bg-white/5 rounded-2xl p-4 md:p-5 border border-white/10 flex items-center justify-between group hover:border-yellow-400 transition-colors">
                      <div>
                        <h4 className="font-bold text-lg text-yellow-500">Gold Pack</h4>
                        <p className="text-xs md:text-sm text-slate-400">Choose any 5 zones across Lalbagh</p>
                      </div>
                      <div className="text-right">
                        <div className="text-xl md:text-2xl font-black text-white">₹7,500</div>
                        <Button 
                          size="sm" 
                          className="mt-2 bg-yellow-500 hover:bg-yellow-600 text-slate-900 font-bold rounded-full text-xs md:text-sm"
                          onClick={() => {
                            setPrefilledMessage("Interested in Gold Pack\nBrand Name: ");
                            setShowContactModal(true);
                          }}
                        >Select</Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Why Sponsor Section */}
            <section className="space-y-8">
              <div className="text-center md:text-left">
                <h2 className="text-4xl font-bold text-slate-900 mb-4">Real ROI. Not Just Views.</h2>
                <p className="text-lg text-slate-600 max-w-lg mx-auto md:mx-0">Physical billboards are dead. Our AR layers capture attention when intent is highest and track every single interaction.</p>
              </div>
              <div className="grid gap-6">
                <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100 flex gap-4 items-start">
                  <div className="bg-emerald-100 p-3 rounded-xl shrink-0"><Target className="w-6 h-6 text-emerald-600" /></div>
                  <div>
                    <h4 className="font-bold text-slate-900 mb-1">Hyper-Targeted</h4>
                    <p className="text-slate-600 text-sm">Users only see your AR ad when they are physically within your zone.</p>
                  </div>
                </div>
                <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100 flex gap-4 items-start">
                  <div className="bg-blue-100 p-3 rounded-xl shrink-0"><MapPin className="w-6 h-6 text-blue-600" /></div>
                  <div>
                    <h4 className="font-bold text-slate-900 mb-1">Guaranteed Walk-ins</h4>
                    <p className="text-slate-600 text-sm">Gamified stamps actively route users directly to your physical activation.</p>
                  </div>
                </div>
                <div className="bg-indigo-50 rounded-2xl p-6 border border-indigo-100 flex gap-4 items-start">
                  <div className="bg-indigo-100 p-3 rounded-xl shrink-0"><LineChart className="w-6 h-6 text-indigo-600" /></div>
                  <div>
                    <h4 className="font-bold text-slate-900 mb-1">100% Trackable</h4>
                    <p className="text-slate-600 text-sm">Live dashboard showing impressions, clicks, and physical footfall.</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Final Contact */}
            <section className="bg-slate-900 text-white text-center rounded-3xl p-8 border border-slate-800 shadow-2xl">
              <h2 className="text-3xl font-bold mb-4">Secure your zones today.</h2>
              <div className="flex flex-col sm:flex-row justify-center gap-4 mb-6">
                <Button 
                  onClick={() => {
                    setPrefilledMessage("");
                    setShowContactModal(true);
                  }}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold rounded-full px-8 h-12"
                >
                  Contact Sales
                </Button>
                <Button 
                  onClick={handleLogin}
                  variant="outline"
                  className="border-white/20 hover:bg-white/10 rounded-full px-8 h-12"
                >
                  Login to Dashboard
                </Button>
              </div>
              <p className="text-slate-400 text-sm">
                WhatsApp: +91 8310428923 <br className="sm:hidden"/> <span className="hidden sm:inline">&nbsp;|&nbsp;</span> Email: hammaadworks@gmail.com
              </p>
            </section>

          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 text-center text-slate-500 bg-slate-950 text-sm">
        <p>© 2026 WayOnTop. All rights reserved.</p>
      </footer>

      {/* Contact Modal */}
      {showContactModal && (
        <ReportModal 
          onClose={() => {
            setShowContactModal(false);
            setPrefilledMessage('');
          }} 
          defaultIssueType="sponsor" 
          fixedIssueType={true}
          defaultMessage={prefilledMessage}
        />
      )}
    </div>
  );
}
