import {useEffect, useMemo, useState} from 'react';
import {Globe, MapPin, Navigation, Settings, Sparkles, X, ArrowUp} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import Fuse from 'fuse.js';
import html2canvas from 'html2canvas';
import {ARView} from './components/ARView';
import {MapView} from './components/MapView';
import {Sheet, SheetContent, SheetTitle, SheetTrigger} from '@wayontop/ui/components/ui/sheet';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@wayontop/ui/components/ui/select';
import {Button} from '@wayontop/ui/components/ui/button';
import {supabase} from '@wayontop/ui/lib/supabase';
import {distanceInMeters} from '@wayontop/ui/lib/routing';
import {useLocation} from './hooks/useLocation';
import {PermissionGate} from '@wayontop/ui/components/PermissionGate';
import {InAppBrowserBlocker} from './components/InAppBrowserBlocker';
import {ConsumerBottom} from './components/ConsumerBottom';
import {RouteSummary} from './components/RouteSummary';
import {ReportModal} from './components/ReportModal';
import {POICard} from './components/POICard';
import {ViralSharing} from './lib/sharing';
import {FEATURE_FLAGS} from './lib/featureFlags';
import {Gamification} from './lib/gamification';
import {NavigationSheet} from './components/NavigationSheet';
import type {GraphData, GraphNode, Stamp} from '@wayontop/ui/lib/types';
import {GARBAGE_REGEX, isGarbageNode, TAG_SYNONYMS} from '@wayontop/ui/lib/types';
import {INITIAL_VENUE, LAST_VENUE_STORAGE_KEY} from './lib/constants';
import {SplashScreen} from './components/SplashScreen';


type MainAppProps = Readonly<{
    venueKey: string;
    setVenueKey: any;
    availableVenues: string[];
    prefetchedGraph: GraphData | null;
    prefetchedStamps: Stamp[] | null;
}>;

function MainApp({venueKey, setVenueKey, availableVenues, prefetchedGraph, prefetchedStamps}: MainAppProps) {
    const [mode, setMode] = useState<'ar' | 'map' | 'satellite'>('map');
    const [searchQuery, setSearchQuery] = useState('');
    const [graph, setGraph] = useState<GraphData | null>(null);
    const [targetNode, setTargetNode] = useState<GraphNode | null>(null);
    const [activeRoute, setActiveRoute] = useState<{ path: GraphNode[]; totalDistance: number } | null>(null);
    const [showSummary, setShowSummary] = useState(false);
    const [selectedPOI, setSelectedPOI] = useState<GraphNode | null>(null);
    const [isCapturing, setIsCapturing] = useState(false);
    const [reportModalConfig, setReportModalConfig] = useState<{
        show: boolean,
        issueType?: string,
        message?: string,
        fixed?: boolean
    }>({show: false});
    const [isSponsorModalOpen, setIsSponsorModalOpen] = useState(false);
    const [isNavSheetOpen, setIsNavSheetOpen] = useState(false);
    const [navInitialTarget, setNavInitialTarget] = useState<GraphNode | null>(null);

    const {t, i18n} = useTranslation();

    const [stamps, setStamps] = useState<Stamp[]>([]);
    const [alertMessage, setAlertMessage] = useState<string | null>(null);

    const {
        location,
        routeTrack,
        distanceWalked,
        startTime,
        elapsedTime,
        status,
        startTracking,
        pauseTracking,
        resumeTracking,
        endTracking
    } = useLocation();

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
        if (prefetchedGraph) setGraph(prefetchedGraph);
    }, [prefetchedGraph]);

    useEffect(() => {
        if (prefetchedStamps) setStamps(prefetchedStamps);
    }, [prefetchedStamps]);

    // Data is now prefetched in App.tsx

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
                    name: prefetchedGraph?.goldenStampName || 'Golden Snitch Stamp',
                    lat: newLat,
                    lng: newLng,
                    rarity: 'golden',
                    poi_link: null
                };
                setStamps(prev => [...prev, goldenStamp]);
            }
        }, 30000);

        return () => clearInterval(interval);
    }, [location, stamps, prefetchedGraph?.goldenStampName]);

    const pois = useMemo(() => {
        if (!graph) return [];
        const today = new Date().toISOString().split('T')[0];

        return graph.nodes.filter(n => {
            if (n.type === 'track') return false;
            if (n.active_from && today < n.active_from) return false;
            if (n.active_to && today > n.active_to) return false;
            return true;
        }).map(n => {
            let searchAliases: string[] = [];
            (n.tags || []).forEach(tag => {
                if (TAG_SYNONYMS[tag]) {
                    searchAliases.push(...TAG_SYNONYMS[tag]);
                }
            });
            return {
                ...n,
                searchTags: [...(n.tags || []), ...searchAliases]
            };
        });
    }, [graph]);

    const fuse = useMemo(() => new Fuse(pois, {keys: ['name', 'searchTags'], threshold: 0.3}), [pois]);

    const searchResults = useMemo(() => {
        let results = pois;
        if (searchQuery) {
            results = fuse.search(searchQuery).map(res => res.item);
        }

        const isSearchingTrash = searchQuery && GARBAGE_REGEX.test(searchQuery);
        if (!isSearchingTrash) {
            results = results.filter(poi => !isGarbageNode(poi));
        }

        // Calculate distance and sort
        if (location) {
            results = results.map(poi => ({
                ...poi,
                distance: distanceInMeters(location.lat, location.lng, poi.lat, poi.lng)
            })).sort((a: any, b: any) => a.distance - b.distance);
        }

        return results;
    }, [searchQuery, pois, fuse, location]);

    const handleRoute = (route: { path: GraphNode[]; totalDistance: number }, toNode: GraphNode) => {
        setActiveRoute(route);
        setTargetNode(toNode);
        setIsNavSheetOpen(false);
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
            <div id="ar-capture-zone"
                 className="h-[100dvh] w-full overflow-hidden bg-mesh-dark relative text-slate-100 flex flex-col font-sans selection:bg-amber-400/30">

                {/* DEV Venue Switcher is now moved to Settings Modal */}

                {/* 1. Main View Area (Behind everything) */}
                <div className="absolute inset-0 z-0 bg-transparent">
                    {mode === 'ar' ? (
                        <div
                            className="h-full w-full flex items-center justify-center flex-col relative overflow-hidden bg-gradient-to-b from-slate-900 to-black">
                            <ARView targetNode={nextWaypoint || undefined} stamps={stamps}/>
                        </div>
                    ) : (
                        <div className="h-full w-full bg-[#E5E3DF] flex items-center justify-center">
                            <MapView graph={graph} activeRoute={activeRoute} stamps={stamps} mode={mode}/>
                        </div>
                    )}
                </div>

                {/* Unified Top Navigation Bar & Status */}
                {!isSponsorModalOpen && (
                    <div
                        className="absolute top-[calc(env(safe-area-inset-top)+12px)] left-1/2 -translate-x-1/2 z-[60] w-[92%] max-w-[420px] pointer-events-none flex flex-col items-center gap-3">
                        <div
                            className="pointer-events-auto p-1.5 shadow-[0_20px_40px_rgba(0,0,0,0.4)] border border-white/10 flex items-center justify-between w-full bg-[#1C1C1E]/90 backdrop-blur-3xl rounded-full relative">

                            {/* 1. Venue (Left) */}
                            <div className="h-10 px-3 flex items-center shrink-0 relative z-10">
                            <span
                                className="text-[13px] font-black text-emerald-400 uppercase tracking-widest truncate max-w-[90px]">
                                {t(venueKey).toUpperCase()}
                            </span>
                            </div>

                            {/* 2. Map/AR/Sat (Middle) */}
                            <div
                                className="absolute left-1/2 -translate-x-1/2 flex items-center bg-black/50 backdrop-blur-3xl rounded-full p-1 border border-white/5 shadow-inner w-[170px] justify-between z-0">
                                <button onClick={() => setMode('map')}
                                        className={`flex-1 py-1.5 text-[10px] uppercase tracking-wider rounded-full font-bold transition-all flex items-center justify-center ${mode === 'map' ? 'bg-white/20 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}>Map
                                </button>
                                <button onClick={() => setMode('ar')}
                                        className={`flex-1 py-1.5 text-[10px] uppercase tracking-wider rounded-full font-bold transition-all flex items-center justify-center ${mode === 'ar' ? 'bg-white/20 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}>AR
                                </button>
                                <button onClick={() => setMode('satellite')}
                                        className={`flex-1 py-1.5 text-[10px] uppercase tracking-wider rounded-full font-bold transition-all flex items-center justify-center ${mode === 'satellite' ? 'bg-white/20 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}>Sat
                                </button>
                            </div>

                            {/* 3. Settings (Right) */}
                            <Sheet>
                                <SheetTrigger
                                    className="flex flex-col items-center justify-center w-10 h-10 rounded-full active:bg-white/10 hover:bg-white/5 transition-all cursor-pointer shrink-0 mr-1 relative z-10">
                                    <Settings className="w-5 h-5 text-white/80 stroke-[1.5]"/>
                                </SheetTrigger>
                                <SheetContent side="bottom"
                                              className="h-[auto] max-h-[90svh] bg-transparent border-0 p-0 text-white !shadow-none z-[100]">
                                    <div
                                        className="h-full w-full bg-[#1C1C1E]/95 backdrop-blur-3xl border-t border-white/10 rounded-t-[32px] overflow-hidden flex flex-col shadow-[0_-20px_60px_rgba(0,0,0,0.5)] p-6">
                                        <div className="w-10 h-1.5 bg-white/20 rounded-full mx-auto mb-6"></div>
                                        <SheetTitle
                                            className="text-2xl font-black text-white mb-6 tracking-tight text-left">Preferences</SheetTitle>
                                        <div className="space-y-6">
                                            <div
                                                className="bg-white/5 p-4 rounded-2xl border border-white/10 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                                                        <Globe className="w-5 h-5"/>
                                                    </div>
                                                    <div>
                                                        <p className="text-white font-bold text-[15px]">Language</p>
                                                        <p className="text-white/50 text-[13px] font-medium">{i18n.language === 'en' ? 'English' : 'ಕನ್ನಡ (Kannada)'}</p>
                                                    </div>
                                                </div>
                                                <Button variant="secondary"
                                                        className="bg-white/10 hover:bg-white/20 text-white rounded-full font-bold px-4 border-0"
                                                        onClick={() => i18n.changeLanguage(i18n.language === 'en' ? 'kn' : 'en')}>
                                                    {i18n.language === 'en' ? 'ಕನ್ನಡ' : 'English'}
                                                </Button>
                                            </div>
                                            {FEATURE_FLAGS.enableVenueSwitcher && (
                                                <div
                                                    className="bg-white/5 p-4 rounded-2xl border border-white/10 flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400">
                                                            <MapPin className="w-5 h-5"/>
                                                        </div>
                                                        <div>
                                                            <p className="text-white font-bold text-[15px]">Venue</p>
                                                            <p className="text-white/50 text-[13px] font-medium">Exploring: {venueKey}</p>
                                                        </div>
                                                    </div>
                                                    <Select value={venueKey} onValueChange={setVenueKey}>
                                                        <SelectTrigger
                                                            className="w-[130px] bg-white/10 text-white border-0 rounded-full font-bold h-9 focus:ring-0 focus:ring-offset-0 capitalize">
                                                            <SelectValue placeholder="Select Venue"/>
                                                        </SelectTrigger>
                                                        <SelectContent
                                                            className="bg-[#2C2C2E] text-white border-white/10 rounded-xl shadow-2xl">
                                                            {availableVenues.map(v => (
                                                                <SelectItem key={v} value={v}
                                                                            className="font-bold focus:bg-white/10 focus:text-white capitalize cursor-pointer">
                                                                    {v}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            )}
                                            {/* Report Issue moved to Bottom Bar */}
                                        </div>
                                    </div>
                                </SheetContent>
                            </Sheet>
                        </div>

                        {/* Status Pills (Accuracy) */}
                        <div className="flex justify-center pointer-events-auto mt-1"
                             data-html2canvas-ignore={isCapturing}>
                            <div
                                className="glass-pill bg-black/60 backdrop-blur-3xl border border-white/10 rounded-full px-3 py-1.5 flex items-center gap-2 shadow-[0_20px_40px_rgba(0,0,0,0.4)]"
                            >
                                <div
                                    className={`w-2 h-2 rounded-full shadow-[0_0_8px_currentColor] ${!location ? 'bg-amber-500 text-amber-500 animate-pulse' : location.accuracy < 15 ? 'bg-emerald-400 text-emerald-400' : location.accuracy < 30 ? 'bg-amber-400 text-amber-400' : 'bg-red-500 text-red-500 animate-pulse'}`}/>
                                <span className="text-[10px] font-black tracking-wider uppercase text-slate-200">
                                {!location ? 'Connecting GPS...' : `GPS: ${Math.round(location.accuracy)}m`}
                            </span>
                                {location && location.accuracy > 15 && (
                                    <span
                                        className="text-[10px] text-red-300 font-bold border-l border-white/20 pl-2 hidden sm:inline-block">
                                    Move outdoors / Calibrate compass
                                </span>
                                )}
                                {location && location.accuracy > 5 && location.accuracy <= 15 && (
                                    <span
                                        className="text-[10px] text-amber-300 font-bold border-l border-white/20 pl-2 hidden sm:inline-block">
                                    Stay still to improve
                                </span>
                                )}
                            </div>
                        </div>
                    </div>
                )}


                {/* Active Route HUD - Google Maps Style (Top Banner) */}
                {activeRoute && targetNode && (
                    <div
                        className="absolute top-0 left-0 right-0 z-30 pointer-events-auto animate-in slide-in-from-top-4 duration-500">
                        <div className="bg-[#124230]/95 backdrop-blur-xl shadow-2xl rounded-b-[32px] px-6 pt-[calc(env(safe-area-inset-top)+24px)] pb-6 flex items-center gap-5 border-b border-emerald-900/50">
                            <div className="flex flex-col items-center shrink-0">
                                <ArrowUp className="w-10 h-10 text-white" strokeWidth={3.5} />
                                <p className="text-[12px] font-bold mt-1.5 text-emerald-300 uppercase tracking-widest">Head</p>
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-white font-black text-3xl tracking-tight leading-none drop-shadow-sm truncate">{targetNode.name}</h3>
                                <p className="text-emerald-100/80 text-[15px] font-semibold mt-2 tracking-wide truncate">Lalbagh Botanical Garden</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Normal State UI (Hidden during navigation) */}
                {!activeRoute && (
                    <>
                        {/* Stamps Pill (Bottom Left) */}
                        <div
                            className="absolute bottom-[calc(env(safe-area-inset-bottom)+11rem)] left-4 z-10 pointer-events-auto"
                            data-html2canvas-ignore={isCapturing}>
                            <div
                                className="bg-[#1C1C1E]/90 backdrop-blur-3xl border border-white/10 rounded-full px-3 py-2 flex items-center gap-2 shadow-[0_20px_40px_rgba(0,0,0,0.5)] text-xs font-semibold text-white/90">
                                <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                                    <Sparkles
                                        className="w-3.5 h-3.5 text-amber-400 drop-shadow-[0_0_4px_rgba(245,158,11,0.8)]"/>
                                </div>
                                <span
                                    className="text-white font-bold text-sm drop-shadow-md">{stamps.filter(s => Gamification.getCollectedStamps().includes(s.id)).length}</span>
                                <span className="text-white/40 text-[10px] uppercase tracking-wider font-bold">Stamps</span>
                            </div>
                        </div>

                        {/* Unified Consumer Bottom (Sponsor Marquee + Bottom Bar) */}
                        <ConsumerBottom
                            graph={graph}
                            location={location}
                            isCapturing={isCapturing}
                            handleCapture={handleCapture}
                            endWalk={endWalk}
                            setShowReportModal={(show) => setReportModalConfig({show})}
                            searchQuery={searchQuery}
                            setSearchQuery={setSearchQuery}
                            searchResults={searchResults}
                            handlePOISelect={handlePOISelect}
                            onSponsorModalChange={setIsSponsorModalOpen}
                            onOpenNavigation={() => {
                                setNavInitialTarget(null);
                                setIsNavSheetOpen(true);
                            }}
                        />
                    </>
                )}

                {/* Active Route HUD - Google Maps Style (Bottom Panel) */}
                {activeRoute && targetNode && (
                    <div
                        className="absolute bottom-0 left-0 right-0 z-40 pointer-events-auto animate-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-[#1C1C1E]/95 backdrop-blur-3xl border-t border-white/10 px-7 pt-6 pb-[calc(env(safe-area-inset-bottom)+24px)] rounded-t-[36px] shadow-[0_-20px_50px_rgba(0,0,0,0.6)] flex items-center justify-between">
                            <div className="flex flex-col min-w-0 pr-4">
                                <div className="flex items-end gap-2">
                                    <h2 className="text-emerald-400 font-black text-4xl leading-none tracking-tighter drop-shadow-sm">{Math.max(1, Math.round(activeRoute.totalDistance / 1.4 / 60))}</h2>
                                    <span className="text-xl font-bold text-emerald-400/80 mb-0.5 tracking-tight">min</span>
                                </div>
                                <p className="text-white/60 font-semibold text-[15px] mt-2 truncate">{Math.round(activeRoute.totalDistance)} m • {targetNode.name}</p>
                            </div>
                            <Button 
                                onClick={cancelRoute}
                                className="bg-red-500 hover:bg-red-600 text-white rounded-full px-8 h-14 font-black text-[18px] shadow-[0_0_20px_rgba(239,68,68,0.3)] active:scale-95 transition-all shrink-0"
                            >
                                Exit
                            </Button>
                        </div>
                    </div>
                )}

                {selectedPOI && (
                    <POICard
                        poi={selectedPOI}
                        onClose={() => setSelectedPOI(null)}
                        onNavigate={() => {
                            setNavInitialTarget(selectedPOI);
                            setIsNavSheetOpen(true);
                            setSelectedPOI(null);
                        }}
                    />
                )}

                <NavigationSheet
                    isOpen={isNavSheetOpen}
                    onClose={() => setIsNavSheetOpen(false)}
                    graph={graph}
                    initialToNode={navInitialTarget}
                    location={location}
                    onStartNavigation={handleRoute}
                    onReportBug={(issueType, message) => {
                        setReportModalConfig({show: true, issueType, message, fixed: true});
                        setIsNavSheetOpen(false);
                    }}
                />

                {showSummary && (
                    <RouteSummary
                        onClose={() => setShowSummary(false)}
                        routeTrack={routeTrack}
                        distanceWalked={distanceWalked}
                        elapsedTime={elapsedTime}
                        status={status}
                        onStart={startTracking}
                        onPause={pauseTracking}
                        onResume={resumeTracking}
                        onEnd={endTracking}
                    />
                )}

                {/* Watermark only visible during capture */}
                {isCapturing && (
                    <div
                        className="absolute bottom-5 right-5 z-[100] text-white/50 font-bold text-sm pointer-events-none">
                        @{venueKey}.top
                    </div>
                )}


                {/* Global Alert Modal */}
                {/* Sleek Top-Center Toast Notifications */}
                {alertMessage && (
                    <div
                        className="absolute top-safe pt-4 left-1/2 -translate-x-1/2 z-[200] pointer-events-auto w-[90%] max-w-[320px]">
                        <div
                            className="bg-[#1C1C1E]/95 backdrop-blur-xl border border-white/20 rounded-2xl p-4 shadow-2xl flex items-center justify-between animate-in slide-in-from-top-10 fade-in duration-300">
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                                    <Navigation className="w-4 h-4 text-emerald-400"/>
                                </div>
                                <p className="text-white/90 text-sm font-medium leading-tight">{alertMessage}</p>
                            </div>
                            <button
                                onClick={() => setAlertMessage(null)}
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 transition-colors shrink-0 ml-3"
                            >
                                <X className="w-4 h-4 text-white/70"/>
                            </button>
                        </div>
                    </div>
                )}

                {/* Radar Map (PUBG/PoGo style mini-map) */}
                {mode === 'ar' && (
                    <div className="absolute top-44 right-4 z-40 pointer-events-auto flex flex-col items-end gap-2"
                         data-html2canvas-ignore={isCapturing}>
                        <div
                            role="button"
                            tabIndex={0}
                            onClick={() => setMode('map')}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setMode('map');
                                }
                            }}
                            className="w-32 h-32 rounded-full border-[3px] border-white/30 shadow-[0_12px_40px_rgba(0,0,0,0.6)] overflow-hidden relative bg-black/20 backdrop-blur-md transform-gpu transition-all animate-in zoom-in-95 duration-300 cursor-pointer group"
                        >
                            <div
                                className="absolute inset-0 origin-center opacity-90 pointer-events-none group-hover:scale-110 transition-transform duration-500">
                                <MapView graph={graph} activeRoute={activeRoute} stamps={stamps} isRadar={true}
                                         mode={mode}/>
                            </div>

                            {/* Expand hint overlay */}
                            <div
                                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none">
                                <span
                                    className="text-white font-bold text-xs uppercase tracking-widest drop-shadow-md">Expand</span>
                            </div>

                            {/* Radar Crosshair & Sweep Effect */}
                            <div
                                className="absolute inset-0 pointer-events-none border border-emerald-500/20 rounded-full"></div>
                            <div
                                className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent_70%,rgba(52,211,153,0.3)_100%)] animate-[spin_4s_linear_infinite] rounded-full pointer-events-none mix-blend-screen"></div>

                            {/* Center Dot */}
                            <div
                                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-emerald-400 rounded-full shadow-[0_0_12px_rgba(52,211,153,1)]"></div>
                        </div>
                    </div>
                )}

                {reportModalConfig.show && (
                    <ReportModal
                        onClose={() => setReportModalConfig({show: false})}
                        defaultIssueType={reportModalConfig.issueType}
                        defaultMessage={reportModalConfig.message}
                        fixedIssueType={reportModalConfig.fixed}
                    />
                )}

            </div>
        </InAppBrowserBlocker>
    )
}

export default function App() {
    const [venueKey, setVenueKey] = useState(localStorage.getItem(LAST_VENUE_STORAGE_KEY) || '');
    const [availableVenues, setAvailableVenues] = useState<string[]>([]);
    const [prefetchedGraph, setPrefetchedGraph] = useState<GraphData | null>(null);
    const [prefetchedStamps, setPrefetchedStamps] = useState<Stamp[] | null>(null);
    const [splashFinished, setSplashFinished] = useState(false);

    const handleVenueChange = (newVenue: string) => {
        setVenueKey(newVenue);
        localStorage.setItem(LAST_VENUE_STORAGE_KEY, newVenue);
    };

    // 1. Fetch available venues list
    useEffect(() => {
        if (FEATURE_FLAGS.enableVenueSwitcher) {
            supabase.from('venues').select('key').eq('public', true)
                .then(res => {
                    if (res.data && res.data.length > 0) {
                        const keys = Array.from(new Set(res.data.map(d => d.key)));
                        setAvailableVenues(keys);

                        const storedVenue = localStorage.getItem(LAST_VENUE_STORAGE_KEY);
                        if (storedVenue && keys.includes(storedVenue)) {
                            setVenueKey(storedVenue);
                        } else if (keys.includes(INITIAL_VENUE)) {
                            setVenueKey(INITIAL_VENUE);
                            localStorage.setItem(LAST_VENUE_STORAGE_KEY, INITIAL_VENUE);
                        } else {
                            setVenueKey(keys[0]);
                            localStorage.setItem(LAST_VENUE_STORAGE_KEY, keys[0]);
                        }
                    }
                });
        } else {
            const storedVenue = localStorage.getItem(LAST_VENUE_STORAGE_KEY);
            if (storedVenue) {
                setVenueKey(storedVenue);
            } else {
                setVenueKey(INITIAL_VENUE);
                localStorage.setItem(LAST_VENUE_STORAGE_KEY, INITIAL_VENUE);
            }
        }
    }, []);

    // 2. Prefetch data outside the permissions gate (Optimistic Data Loading)
    useEffect(() => {
        async function loadData() {
            try {
                const [graphRes, stampsRes] = await Promise.all([
                    supabase.from('venue_content').select('data').eq('venue_key', venueKey).eq('content_type', 'graph').maybeSingle(),
                    supabase.from('venue_content').select('data').eq('venue_key', venueKey).eq('content_type', 'stamps').maybeSingle()
                ]);

                let activeGraph = graphRes.data?.data ? (graphRes.data.data as GraphData) : null;

                if (activeGraph) {
                    const now = new Date().toISOString().split('T')[0]; // Current date as YYYY-MM-DD
                    const validNodes = activeGraph.nodes.filter(node => {
                        if (node.active_from && node.active_from > now) return false;
                        if (node.active_to && node.active_to < now) return false;
                        return true;
                    });

                    if (validNodes.length !== activeGraph.nodes.length) {
                        const validNodeIds = new Set(validNodes.map(n => n.id));
                        const validEdges = activeGraph.edges.filter(e => validNodeIds.has(e.from) && validNodeIds.has(e.to));
                        activeGraph = {...activeGraph, nodes: validNodes, edges: validEdges};
                    }
                }

                setPrefetchedGraph(activeGraph);

                let loadedStamps = stampsRes.data?.data ? ((stampsRes.data.data as any).stamps || []) : [];

                const graphStamps: Stamp[] = (activeGraph?.nodes || [])
                    .filter(n => n.type === 'stamp')
                    .map(n => ({
                        id: n.id,
                        name: n.name || 'Venue Stamp',
                        lat: n.lat,
                        lng: n.lng,
                        rarity: 'common',
                        description: `You found a stamp at ${n.name || 'this location'}!`,
                        poi_link: null
                    })) || [];

                const combinedStamps = [...loadedStamps, ...graphStamps];
                setPrefetchedStamps(combinedStamps);
            } catch (e) {
                console.error('Failed to load data', e);
                setPrefetchedGraph(null);
                setPrefetchedStamps([]);
            }
        }

        loadData();
    }, [venueKey]);

    return (
        <>
            {!splashFinished && (
                <SplashScreen 
                    isLoading={!prefetchedGraph} 
                    onFinish={() => setSplashFinished(true)} 
                />
            )}
            <PermissionGate>
                <MainApp
                    venueKey={venueKey}
                    setVenueKey={handleVenueChange}
                    availableVenues={availableVenues}
                    prefetchedGraph={prefetchedGraph}
                    prefetchedStamps={prefetchedStamps}
                />
            </PermissionGate>
        </>
    );
}
