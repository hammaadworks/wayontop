import { useState, useEffect, useMemo } from 'react';
import { Navigation, Search, Camera, Droplet, List as ListIcon, MapPin, Globe, Aperture, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Fuse from 'fuse.js';
import html2canvas from 'html2canvas';
import { ARView } from './components/ARView';
import { MapView } from './components/MapView';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@wayontop/ui/components/ui/sheet';
import { Input } from '@wayontop/ui/components/ui/input';
import { Button } from '@wayontop/ui/components/ui/button';
import { supabase } from '@wayontop/ui/lib/supabase';
import { findShortestPath } from '@wayontop/ui/lib/routing';
import { useLocation } from './hooks/useLocation';
import { PermissionGate } from '@wayontop/ui/components/PermissionGate';
import { InAppBrowserBlocker } from './components/InAppBrowserBlocker';
import { SponsorMarquee } from './components/SponsorMarquee';
import { RouteSummary } from './components/RouteSummary';
import { POICard } from './components/POICard';
import { ViralSharing } from './lib/sharing';
import { FEATURE_FLAGS } from './lib/featureFlags';
import { showAlert } from './lib/events';

import type { GraphNode, GraphData, Stamp } from '@wayontop/ui/lib/types';

function MainApp() {
  const [venueKey, setVenueKey] = useState(() => {
    if (FEATURE_FLAGS.enableVenueSwitcher) {
      const params = new URLSearchParams(window.location.search);
      return params.get('venue') || 'lalbagh';
    }
    return 'lalbagh';
  });
  const [availableVenues, setAvailableVenues] = useState<string[]>(['lalbagh']);
  const [mode, setMode] = useState<'ar' | 'map'>('ar');
  const [searchQuery, setSearchQuery] = useState('');
  const [graph, setGraph] = useState<GraphData | null>(null);
  const [targetNode, setTargetNode] = useState<GraphNode | null>(null);
  const [activeRoute, setActiveRoute] = useState<{ path: GraphNode[]; totalDistance: number } | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [selectedPOI, setSelectedPOI] = useState<GraphNode | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  
  const { t, i18n } = useTranslation();
  
  const [stamps, setStamps] = useState<Stamp[]>([]);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [showRadar, setShowRadar] = useState(true);
  
  const { location, routeTrack, distanceWalked, startTime } = useLocation();

  useEffect(() => {
    const handler = (e: any) => setAlertMessage(e.detail);
    window.addEventListener('app-alert', handler);
    
    const switchHandler = (e: any) => setMode(e.detail.view);
    window.addEventListener('switch-view', switchHandler);
    
    return () => {
      window.removeEventListener('app-alert', handler);
      window.removeEventListener('switch-view', switchHandler);
    };
  }, []);

  useEffect(() => {
    if (FEATURE_FLAGS.enableVenueSwitcher) {
      supabase.from('venue_content').select('venue_key').eq('content_type', 'graph')
        .then(res => {
          if (res.data) {
            const keys = Array.from(new Set(res.data.map(d => d.venue_key)));
            if (!keys.includes('lalbagh')) keys.unshift('lalbagh');
            setAvailableVenues(keys);
          }
        });
    }
  }, []);

  useEffect(() => {
    async function loadData() {
      const [graphRes, stampsRes] = await Promise.all([
        supabase.from('venue_content').select('data').eq('venue_key', venueKey).eq('content_type', 'graph').single(),
        supabase.from('venue_content').select('data').eq('venue_key', venueKey).eq('content_type', 'stamps').single()
      ]);
      
      if (!graphRes.error && graphRes.data?.data) {
        setGraph(graphRes.data.data as GraphData);
      }
      if (!stampsRes.error && stampsRes.data?.data) {
        setStamps((stampsRes.data.data as any).stamps || []);
      }
    }
    loadData();
  }, [venueKey]);

  // Golden Stamp Spawning Logic
  useEffect(() => {
    if (!location) return;
    
    // Check every 30 seconds if we should spawn a golden stamp
    const interval = setInterval(() => {
      // 10% chance to spawn if there isn't one already
      if (Math.random() < 0.1 && !stamps.some(s => s.id.startsWith('golden'))) {
        const newLat = location.lat + (Math.random() * 0.0004 - 0.0002); // very close to user (within ~20-30 meters)
        const newLng = location.lng + (Math.random() * 0.0004 - 0.0002);
        const goldenStamp: Stamp = {
          id: `golden_stamp_${Date.now()}`,
          name: 'Golden Snitch Stamp',
          lat: newLat,
          lng: newLng,
          rarity: 'golden',
          poi_link: null
        };
        setStamps(prev => [...prev, goldenStamp]);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [location, stamps]);

  const pois = useMemo(() => {
    if (!graph) return [];
    return graph.nodes.filter(n => n.type !== 'junction');
  }, [graph]);

  const fuse = useMemo(() => new Fuse(pois, { keys: ['name', 'tags'], threshold: 0.3 }), [pois]);

  const searchResults = useMemo(() => {
    if (!searchQuery) return pois;
    return fuse.search(searchQuery).map(res => res.item);
  }, [searchQuery, pois, fuse]);

  const handleRoute = (destination: GraphNode) => {
    if (!graph || !location) return;
    
    // Find nearest node to user
    let nearestStart: GraphNode | null = null;
    let minDistance = Infinity;
    
    // Simple heuristic: just find closest node in graph to current GPS
    // A proper solution would snap to edge, but closest node works for MVP
    graph.nodes.forEach(n => {
      const dist = Math.hypot(n.lat - location.lat, n.lng - location.lng);
      if (dist < minDistance) {
        minDistance = dist;
        nearestStart = n;
      }
    });

    if (nearestStart) {
      const route = findShortestPath(graph, (nearestStart as GraphNode).id, destination.id);
      if (route) {
        setActiveRoute(route);
        setTargetNode(destination);
        setSheetOpen(false);
      } else {
        showAlert("Path not found");
      }
    }
  };

  const handlePOISelect = (poi: GraphNode) => {
    setSelectedPOI(poi);
  };

  const cancelRoute = () => {
    setActiveRoute(null);
    setTargetNode(null);
  };
  
  const endWalk = () => {
    setShowSummary(true);
  };

  const handleCapture = async () => {
    const element = document.getElementById('ar-capture-zone');
    if (!element) return;
    setIsCapturing(true);
    
    try {
      const canvas = await html2canvas(element, { 
        useCORS: true, 
        allowTaint: true,
        backgroundColor: '#000000'
      });
      canvas.toBlob(async (blob) => {
        if (blob) {
          await ViralSharing.shareImage(blob);
        }
        setIsCapturing(false);
      }, 'image/jpeg', 0.85);
    } catch (e) {
      console.error('Capture failed', e);
      setIsCapturing(false);
    }
  };

  const nextWaypoint = activeRoute?.path[1] || targetNode;

  return (
    <InAppBrowserBlocker>
    <div id="ar-capture-zone" className="h-[100dvh] w-full overflow-hidden bg-mesh-dark relative text-slate-100 flex flex-col font-sans selection:bg-amber-400/30">
      
      {FEATURE_FLAGS.enableVenueSwitcher && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[100] bg-black/60 backdrop-blur-xl border border-white/10 p-1.5 rounded-full flex items-center shadow-2xl pointer-events-auto" data-html2canvas-ignore>
           <span className="text-[10px] font-bold text-amber-400 px-2 uppercase tracking-widest">DEV</span>
           <select 
             className="bg-transparent text-white text-xs outline-none cursor-pointer pr-1"
             value={venueKey}
             onChange={(e) => {
               const newVenue = e.target.value;
               setVenueKey(newVenue);
               const url = new URL(window.location.href);
               url.searchParams.set('venue', newVenue);
               window.history.pushState({}, '', url.toString());
             }}
           >
             {availableVenues.map(v => <option key={v} value={v} className="bg-black">{v}</option>)}
           </select>
        </div>
      )}

      {/* 1. Main View Area (Behind everything) */}
      <div className="absolute inset-0 z-0 bg-transparent">
        {mode === 'ar' ? (
          <div className="h-full w-full flex items-center justify-center flex-col relative overflow-hidden bg-gradient-to-b from-slate-900 to-black">
             <ARView targetNode={nextWaypoint || undefined} stamps={stamps} />
          </div>
        ) : (
          <div className="h-full w-full bg-[#E5E3DF] flex items-center justify-center">
            <MapView graph={graph} activeRoute={activeRoute} stamps={stamps} />
          </div>
        )}
      </div>

      {/* Sponsor Marquee */}
      <SponsorMarquee 
        sponsors={graph?.sponsors} 
        graph={graph} 
        location={location} 
        className="absolute bottom-40 left-4 right-4 z-40 mx-auto" 
      />

      {/* 2. Top UI Bar */}
      <div className="relative z-20 p-5 pt-safe flex flex-col pointer-events-none items-center" data-html2canvas-ignore={isCapturing}>
        <div className="pointer-events-auto bg-black/40 backdrop-blur-3xl p-1 rounded-full flex shadow-lg w-48 border border-white/10">
          <button 
            onClick={() => setMode('ar')}
            className={`flex-1 py-2 rounded-full text-[13px] font-semibold tracking-wide transition-all duration-300 ${mode === 'ar' ? 'bg-white text-black shadow-md' : 'text-white/70 hover:text-white'}`}
          >
            AR
          </button>
          <button 
            onClick={() => setMode('map')}
            className={`flex-1 py-2 rounded-full text-[13px] font-semibold tracking-wide transition-all duration-300 ${mode === 'map' ? 'bg-white text-black shadow-md' : 'text-white/70 hover:text-white'}`}
          >
            Map
          </button>
        </div>

        <div className="absolute left-5 top-5 pt-safe flex flex-col gap-3 pointer-events-auto">
          {mode === 'ar' && (
            <button 
              onClick={handleCapture}
              disabled={isCapturing}
              className={`w-10 h-10 rounded-full bg-[#1C1C1E]/70 backdrop-blur-3xl border border-white/10 flex items-center justify-center shadow-lg active:scale-95 transition-all ${isCapturing ? 'text-white/40 animate-pulse' : 'text-emerald-400'}`}
            >
              <Aperture className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="absolute right-5 top-5 pt-safe flex flex-col gap-3 pointer-events-auto">
          <button 
            className="w-10 h-10 rounded-full bg-[#1C1C1E]/70 backdrop-blur-3xl border border-white/10 flex items-center justify-center shadow-lg active:scale-95 transition-all text-white/80"
            onClick={() => i18n.changeLanguage(i18n.language === 'en' ? 'kn' : 'en')}
          >
            <Globe className="w-5 h-5" />
            <span className="absolute -bottom-1 -right-1 text-[8px] bg-emerald-500 text-white rounded px-1 font-bold">
              {i18n.language === 'en' ? 'KN' : 'EN'}
            </span>
          </button>
          <button className="w-10 h-10 rounded-full bg-[#1C1C1E]/70 backdrop-blur-3xl border border-white/10 flex items-center justify-center shadow-lg active:scale-95 transition-all text-red-500 font-bold text-[10px] tracking-wider" onClick={endWalk}>
             {t('end_walk')}
          </button>
        </div>
      </div>

      {/* Active Route HUD */}
      {activeRoute && targetNode && (
        <div className="absolute top-24 left-4 right-4 z-20 pointer-events-auto animate-in slide-in-from-top-4 duration-500 max-w-[400px] mx-auto">
          <div className="bg-[#1C1C1E]/80 backdrop-blur-3xl p-4 rounded-2xl flex items-center justify-between border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
             <div>
                <h3 className="text-white font-semibold text-[17px] tracking-tight leading-tight">{targetNode.name}</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                   <Navigation className="w-3 h-3 text-emerald-400 -rotate-45" />
                   <p className="text-white/60 text-[13px] font-medium">{t('remaining_distance', { distance: Math.round(activeRoute.totalDistance) })}</p>
                </div>
             </div>
             <Button variant="ghost" size="icon" className="text-white/40 hover:bg-white/10 hover:text-white rounded-full h-8 w-8 transition-colors bg-black/20" onClick={cancelRoute}>
               <X className="w-4 h-4" />
             </Button>
          </div>
        </div>
      )}

      {/* 3. Sleek Instagram-style Bottom Bar */}
      <div className="absolute bottom-0 left-0 right-0 z-30 pointer-events-auto bg-gradient-to-t from-black via-black/80 to-transparent pt-12 pb-6 px-6" data-html2canvas-ignore={isCapturing}>
        <div className="flex items-center justify-between max-w-[400px] mx-auto w-full">
          
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger aria-label="Search" className="flex flex-col items-center justify-center p-2 rounded-full active:bg-white/10 hover:bg-white/5 transition-all cursor-pointer">
              <Search className="w-7 h-7 text-white stroke-[1.5]" />
            </SheetTrigger>
            
            <SheetContent side="bottom" className="h-[90vh] bg-transparent border-0 p-0 text-white !shadow-none z-[100]">
              <div className="h-full w-full bg-[#1C1C1E]/95 backdrop-blur-3xl border-t border-white/10 rounded-t-[32px] overflow-hidden flex flex-col shadow-[0_-20px_60px_rgba(0,0,0,0.5)]">
                <SheetHeader className="p-6 pb-2 relative">
                  <div className="w-10 h-1.5 bg-white/20 rounded-full mx-auto mb-6"></div>
                  <SheetTitle className="text-white text-left sr-only">Search Places</SheetTitle>
                  <div className="relative">
                    <Search className="w-5 h-5 text-white/40 absolute left-4 top-1/2 -translate-y-1/2" />
                    <Input 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t('search_placeholder')} 
                      className="w-full bg-black/40 border-0 pl-12 py-6 text-[17px] rounded-[14px] text-white placeholder:text-white/40 focus-visible:ring-0 shadow-inner"
                      autoFocus
                    />
                  </div>
                </SheetHeader>
              
                <div className="flex-1 px-4 overflow-y-auto">
                  <div className="space-y-1 pb-8">
                    {searchResults.map(poi => (
                      <div key={poi.id} onClick={() => handlePOISelect(poi)} className="bg-transparent hover:bg-white/5 active:bg-white/10 p-3 rounded-2xl transition-all cursor-pointer flex items-center justify-between border-b border-white/5 last:border-0">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                            {poi.type === 'gate' ? <Navigation className="text-emerald-400 w-5 h-5" /> : <MapPin className="text-emerald-400 w-5 h-5" />}
                          </div>
                          <div className="flex flex-col">
                            <h4 className="font-semibold text-[17px] text-white tracking-tight">{poi.name}</h4>
                            <div className="flex gap-1.5 mt-0.5">
                              {poi.tags && poi.tags.map(t => (
                                <span key={t} className="text-[12px] text-white/50 capitalize">
                                  {t}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {searchResults.length === 0 && (
                      <div className="text-center text-white/40 mt-16 py-8 flex flex-col items-center">
                        <Search className="w-10 h-10 mb-3 opacity-20" />
                        <p className="text-[15px] font-medium">{t('search_no_results', { query: searchQuery })}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <button className="flex flex-col items-center justify-center p-2 rounded-full active:bg-white/10 hover:bg-white/5 transition-all cursor-pointer" onClick={() => { setSearchQuery('photo'); setSheetOpen(true); }}>
            <Camera className="w-7 h-7 text-white stroke-[1.5]" />
          </button>
          
          {/* Main Shutter/Action Button in Center */}
          <button className="relative flex flex-col items-center justify-center w-14 h-14 rounded-full border-[3px] border-white active:scale-95 transition-transform" onClick={() => { setSearchQuery(''); setSheetOpen(true); }}>
            <div className="w-11 h-11 bg-white rounded-full"></div>
          </button>

          <button className="flex flex-col items-center justify-center p-2 rounded-full active:bg-white/10 hover:bg-white/5 transition-all cursor-pointer" onClick={() => { setSearchQuery('facility'); setSheetOpen(true); }}>
            <Droplet className="w-7 h-7 text-white stroke-[1.5]" />
          </button>
          
          <button className="flex flex-col items-center justify-center p-2 rounded-full active:bg-white/10 hover:bg-white/5 transition-all cursor-pointer" onClick={() => { setSearchQuery(''); setSheetOpen(true); }}>
            <ListIcon className="w-7 h-7 text-white stroke-[1.5]" />
          </button>

        </div>
      </div>

      {selectedPOI && (
        <POICard 
          poi={selectedPOI} 
          onClose={() => setSelectedPOI(null)}
          onNavigate={() => {
            handleRoute(selectedPOI);
            setSelectedPOI(null);
          }}
        />
      )}

      {showSummary && (
        <RouteSummary 
          onClose={() => setShowSummary(false)} 
          routeTrack={routeTrack} 
          distanceWalked={distanceWalked} 
          startTime={startTime} 
        />
      )}
      
      {/* Watermark only visible during capture */}
      {isCapturing && (
         <div className="absolute bottom-5 right-5 z-[100] text-white/50 font-bold text-sm pointer-events-none">
           @lalbagh.top
         </div>
      )}

      {/* Radar Map (PUBG style mini-map) */}
      {mode === 'ar' && (
        <div className="absolute top-24 right-4 z-40 pointer-events-auto flex flex-col items-end gap-2" data-html2canvas-ignore={isCapturing}>
          <button 
            onClick={() => setShowRadar(!showRadar)}
            className="bg-black/40 backdrop-blur-md border border-white/20 p-2 rounded-full text-white hover:bg-black/60 transition-colors shadow-lg active:scale-95"
            aria-label="Toggle Radar"
          >
            <MapPin className="w-5 h-5" />
          </button>
          
          {showRadar && (
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-[3px] border-emerald-500/30 shadow-[0_10px_30px_rgba(0,0,0,0.8)] overflow-hidden relative glass-panel transform-gpu transition-all animate-in zoom-in-95 duration-300">
               <div className="absolute inset-0 origin-center opacity-80 pointer-events-none">
                 <MapView graph={graph} activeRoute={activeRoute} stamps={stamps} isRadar={true} />
               </div>
               
               {/* Radar Crosshair & Sweep Effect */}
               <div className="absolute inset-0 pointer-events-none border border-emerald-500/20 rounded-full"></div>
               <div className="absolute left-1/2 top-0 bottom-0 w-px bg-emerald-500/20 pointer-events-none"></div>
               <div className="absolute top-1/2 left-0 right-0 h-px bg-emerald-500/20 pointer-events-none"></div>
               <div className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent_70%,rgba(52,211,153,0.5)_100%)] animate-[spin_4s_linear_infinite] rounded-full pointer-events-none mix-blend-screen"></div>
               
               {/* Center Dot */}
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-emerald-400 rounded-full shadow-[0_0_10px_rgba(52,211,153,1)]"></div>
               
               {/* Watermark */}
               <div className="absolute bottom-2 left-0 right-0 text-center pointer-events-none">
                 <span className="text-[8px] font-bold tracking-widest text-emerald-400/80 uppercase drop-shadow-md">Radar</span>
               </div>
            </div>
          )}
        </div>
      )}

      {/* Global Alert Modal */}
      {alertMessage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xl p-5 animate-in fade-in duration-300">
          <div className="glass-panel p-6 text-center max-w-[300px] shadow-2xl animate-in zoom-in-95 duration-300 spring-bounce border-white/20">
            <h3 className="text-xl font-bold text-white mb-2">Notice</h3>
            <p className="text-white/70 mb-6 text-sm">{alertMessage}</p>
            <button 
              onClick={() => setAlertMessage(null)}
              className="w-full bg-white text-black font-bold py-3 rounded-full active:scale-95 transition-transform"
            >
              OK
            </button>
          </div>
        </div>
      )}

    </div>
    </InAppBrowserBlocker>
  )
}

export default function App() {
  return (
    <PermissionGate>
      <MainApp />
    </PermissionGate>
  );
}
