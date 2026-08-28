import {useEffect, useMemo, useState, useRef} from 'react';
import {Globe, MapPin, Navigation, Settings, Sparkles, X, ArrowUp, Map} from 'lucide-react';
import {useTranslation} from 'react-i18next';

import html2canvas from 'html2canvas';
import {ARView} from './components/ARView';
import {MapView} from './components/MapView';
import {Sheet, SheetContent, SheetTitle, SheetTrigger} from '@wayontop/ui/components/ui/sheet';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@wayontop/ui/components/ui/select';
import {Button} from '@wayontop/ui/components/ui/button';
import {supabase, fetchAllPages} from '@wayontop/ui/lib/supabase';
import {getNextRouteCoordinate, getRouteCoordinateSegments, pointToLineSegment} from '@wayontop/ui/lib/routing';
import { calculateRoute } from '@wayontop/ui/lib/routingClient';
import { getNodeName, getNodeDescription } from '@wayontop/ui/lib/utils';
import {useLocation} from './hooks/useLocation';
import {PermissionGate} from '@wayontop/ui/components/PermissionGate';
import {InAppBrowserBlocker} from './components/InAppBrowserBlocker';
import {ConsumerBottom} from './components/ConsumerBottom';
import {RouteSummary} from './components/RouteSummary';
import {ReportModal} from './components/ReportModal';
import {POICard} from './components/POICard';
import {StampModal} from './components/StampModal';
import {ViralSharing} from './lib/sharing';
import {FEATURE_FLAGS} from './lib/featureFlags';
import {Gamification} from './lib/gamification';
import {NavigationSheet} from './components/NavigationSheet';
import type {GraphData, GraphNode, Stamp} from '@wayontop/ui/lib/types';
import {INITIAL_VENUE, LAST_VENUE_STORAGE_KEY, OFFLINE_GRAPH_STORAGE_KEY} from './lib/constants';
import {Analytics} from './lib/analytics';
import {SplashScreen} from './components/SplashScreen';


type MainAppProps = Readonly<{
    venueKey: string;
    setVenueKey: any;
    availableVenues: string[];
    prefetchedGraph: GraphData | null;
    prefetchedStamps: Stamp[] | null;
}>;

function MainApp({venueKey, setVenueKey, availableVenues, prefetchedGraph, prefetchedStamps}: MainAppProps) {
    const [mode, setMode] = useState<'ar' | 'map' | 'satellite'>('satellite');
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
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [navInitialTarget, setNavInitialTarget] = useState<GraphNode | null>(null);
    const [isStampModalOpen, setIsStampModalOpen] = useState(false);
    const [isExploreOpen, setIsExploreOpen] = useState(false);
    const [exploreQuery, setExploreQuery] = useState('');

    const {t, i18n} = useTranslation();

    const [stamps, setStamps] = useState<Stamp[]>([]);
    const [alertMessage, setAlertMessage] = useState<string | null>(null);

    const {
        location,
        routeTrack,
        distanceWalked,
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



    // Search logic moved to GlobalNodeSearch

    const handleRoute = (route: { path: GraphNode[]; totalDistance: number }, toNode: GraphNode) => {
        Analytics.logEvent('route_started', { 
            target_node_id: toNode.id, 
            target_node_name: getNodeName(toNode, i18n.language),
            distance: route.totalDistance 
        });
        setActiveRoute(route);
        setTargetNode(toNode);
        setIsNavSheetOpen(false);
    };

    const handlePOISelect = (poi: GraphNode) => {
        Analytics.logEvent('poi_viewed', { 
            node_id: poi.id, 
            node_name: getNodeName(poi, i18n.language) 
        });
        setSelectedPOI(poi);
    };

    const cancelRoute = () => {
        if (activeRoute) {
            Analytics.logEvent('route_canceled', { target_node_id: targetNode?.id });
        }
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

    const routeCoordinates = useMemo(() => {
        if (!activeRoute || !graph) return [];
        return getRouteCoordinateSegments(graph, activeRoute.path).flat();
    }, [activeRoute, graph]);

    const nextWaypoint = useMemo(() => {
        if (!routeCoordinates.length) return targetNode;

        const nextCoordinate = location
            ? getNextRouteCoordinate(routeCoordinates, location.lat, location.lng)
            : routeCoordinates[1] || routeCoordinates[0];

        return nextCoordinate ? {lat: nextCoordinate[1], lng: nextCoordinate[0]} : targetNode;
    }, [routeCoordinates, location, targetNode]);

    const [isRerouting, setIsRerouting] = useState(false);
    const abortRef = useRef<AbortController | null>(null);

    // Auto-Reroute Engine: Monitor Cross-Track Error
    useEffect(() => {
        if (!activeRoute || !graph || !location || !targetNode || isRerouting) return;
        
        const coordinates = routeCoordinates;
        if (coordinates.length < 2) return;

        let nearestDist = Infinity;
        for (let i = 0; i < coordinates.length - 1; i++) {
            const [fromLng, fromLat] = coordinates[i];
            const [toLng, toLat] = coordinates[i + 1];
            const { dist } = pointToLineSegment(location.lng, location.lat, fromLng, fromLat, toLng, toLat);
            if (dist < nearestDist) nearestDist = dist;
        }

        const OFF_ROUTE_THRESHOLD_METERS = 15;
        if (nearestDist > OFF_ROUTE_THRESHOLD_METERS) {
            console.log(`[Auto-Reroute] User is ${nearestDist.toFixed(1)}m off route. Recalculating...`);
            Analytics.logEvent('reroute_triggered', { distance_off_route: nearestDist, target_node_id: targetNode.id });
            
            setIsRerouting(true);
            
            const controller = new AbortController();
            abortRef.current = controller;
            
            calculateRoute({ graph, targetId: targetNode.id, lat: location.lat, lng: location.lng, signal: controller.signal })
                .then(route => {
                    setIsRerouting(false);
                    setActiveRoute(route);
                    abortRef.current = null;
                })
                .catch(error => {
                    if (error.name !== 'AbortError') {
                        setIsRerouting(false);
                        abortRef.current = null;
                    }
                });

        }
        
        return () => {
            if (abortRef.current) {
                abortRef.current.abort();
                abortRef.current = null;
            }
        };
    }, [location, activeRoute, graph, targetNode, isRerouting, routeCoordinates]);

    return (
        <InAppBrowserBlocker>
            <div id="ar-capture-zone"
                 className="h-[100dvh] w-full overflow-hidden bg-mesh-dark relative text-slate-100 flex flex-col font-sans selection:bg-amber-400/30">

                {/* DEV Venue Switcher is now moved to Settings Modal */}

                {/* 1. Main View Area (Behind everything) */}
                <div className="absolute inset-0 z-0 bg-transparent">
                    {mode === 'ar' ? (
                        <div className="w-full h-full">
                            <PermissionGate 
                                requiredPermissions="all" 
                                className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black p-4 sm:p-6 overflow-hidden"
                            >
                                <div
                                    className="h-full w-full flex items-center justify-center flex-col relative overflow-hidden bg-gradient-to-b from-slate-900 to-black">
                                    <ARView location={location} targetCoordinate={nextWaypoint || undefined} stamps={stamps}/>
                                </div>
                            </PermissionGate>
                        </div>
                    ) : (
                        <div className="h-full w-full bg-[#E5E3DF] flex items-center justify-center">
                            <MapView graph={graph} activeRoute={activeRoute} location={location} stamps={stamps} mode={mode} onSelectNode={setSelectedPOI} selectedNodeId={selectedPOI?.id} />
                        </div>
                    )}
                </div>

                {/* Unified Top Navigation Bar */}
                {!isSponsorModalOpen && (
                    <div
                        className="absolute top-[calc(env(safe-area-inset-top)+8px)] left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-[420px] pointer-events-none flex flex-col items-center gap-2">
                        
                        {/* Compact Dynamic Island Container */}
                        <div
                            className="pointer-events-auto p-1 shadow-[0_16px_32px_rgba(0,0,0,0.6)] border border-white/10 flex flex-col w-full bg-[#1C1C1E]/90 backdrop-blur-3xl rounded-[24px] relative gap-0.5">

                            {/* Top Row: Venue & GPS */}
                            <div className="flex items-center justify-between w-full relative z-10">
                                {/* 1. Venue (Left) */}
                                <div className="h-8 px-3 flex items-center relative z-10 flex-1 min-w-0">
                                    <span
                                        className="text-[12px] font-black text-emerald-400 uppercase tracking-widest truncate w-full text-left">
                                        {t(venueKey).toUpperCase()}
                                    </span>
                                </div>

                                {/* 2. GPS Accuracy (Right) */}
                                <div className="flex items-center justify-end relative z-10 pr-3 h-8 shrink-0">
                                    <div className="flex items-center gap-1.5">
                                        <div
                                            className={`w-2 h-2 rounded-full shadow-[0_0_8px_currentColor] ${!location ? 'bg-amber-500 text-amber-500 animate-pulse' : location.accuracy < 15 ? 'bg-emerald-400 text-emerald-400' : location.accuracy < 30 ? 'bg-amber-400 text-amber-400' : 'bg-red-500 text-red-500 animate-pulse'}`}/>
                                        <span className="text-[10px] font-bold tracking-wider uppercase text-slate-200 whitespace-nowrap">
                                            {!location ? 'Firing GPS...' : `GPS: ${Math.round(location.accuracy)}m`}
                                        </span>
                                        {location && location.accuracy > 15 && (
                                            <span className="text-[10px] text-red-300 font-semibold border-l border-white/20 pl-2 hidden sm:inline-block whitespace-nowrap">
                                                Go Out
                                            </span>
                                        )}
                                        {location && location.accuracy > 5 && location.accuracy <= 15 && (
                                            <span className="text-[10px] text-amber-300 font-semibold border-l border-white/20 pl-2 hidden sm:inline-block whitespace-nowrap">
                                                Wait
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Bottom Row: Map Mode Toggle */}
                            <div className="w-full px-0.5 pb-0.5" data-html2canvas-ignore={isCapturing}>
                                <div
                                    className="flex items-center bg-black/40 rounded-[20px] p-0.5 border border-white/5 shadow-inner w-full h-10">
                                    <button onClick={() => setMode('satellite')}
                                            className={`flex-1 h-full text-[11px] uppercase tracking-widest rounded-full font-bold transition-all flex items-center justify-center ${mode === 'satellite' ? 'bg-white/20 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}>{t('nav_sat')}
                                    </button>
                                    <button onClick={() => setMode('ar')}
                                            className={`flex-1 h-full text-[11px] uppercase tracking-widest rounded-full font-bold transition-all flex items-center justify-center gap-1.5 ${mode === 'ar' ? 'bg-white/20 text-white shadow-sm' : 'text-emerald-400 hover:text-emerald-300'}`}>
                                            <Sparkles className="w-3 h-3" /> {t('nav_ar')}
                                    </button>
                                    <button onClick={() => setMode('map')}
                                            className={`flex-1 h-full text-[11px] uppercase tracking-widest rounded-full font-bold transition-all flex items-center justify-center ${mode === 'map' ? 'bg-white/20 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}>{t('nav_map')}
                                    </button>
                                </div>
                            </div>

                        </div>

                    </div>
                )}
                
                {/* Settings Sheet */}
                <Sheet open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
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
                                            <p className="text-white/50 text-[13px] font-medium">
                                                {i18n.language === 'en' ? 'English' : i18n.language === 'kn' ? 'ಕನ್ನಡ (Kannada)' : 'Español (Spanish)'}
                                            </p>
                                        </div>
                                    </div>
                                    <Select value={i18n.language} onValueChange={(val) => { if (val) i18n.changeLanguage(val) }}>
                                        <SelectTrigger
                                            className="w-[120px] bg-white/10 text-white border-0 rounded-full font-bold h-9 focus:ring-0 focus:ring-offset-0">
                                            <SelectValue placeholder="Language"/>
                                        </SelectTrigger>
                                        <SelectContent
                                            className="bg-[#2C2C2E] text-white border-white/10 rounded-xl shadow-2xl">
                                            <SelectItem value="en" className="font-bold focus:bg-white/10 focus:text-white cursor-pointer">English</SelectItem>
                                            <SelectItem value="kn" className="font-bold focus:bg-white/10 focus:text-white cursor-pointer">ಕನ್ನಡ</SelectItem>
                                            <SelectItem value="es" className="font-bold focus:bg-white/10 focus:text-white cursor-pointer">Español</SelectItem>
                                        </SelectContent>
                                    </Select>
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
                            </div>
                        </div>
                    </SheetContent>
                </Sheet>

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
                                <h3 className="text-white font-black text-3xl tracking-tight leading-none drop-shadow-sm truncate">{t(getNodeName(targetNode, i18n.language))}</h3>
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
                            className="absolute bottom-[calc(env(safe-area-inset-bottom)+11rem)] left-1/2 -translate-x-1/2 w-full max-w-[420px] flex justify-start px-4 z-10 pointer-events-none hide-on-permission"
                            data-html2canvas-ignore={isCapturing}>
                            <button
                                onClick={() => setIsStampModalOpen(true)}
                                className="pointer-events-auto bg-[#1C1C1E]/90 backdrop-blur-3xl border border-white/10 rounded-full px-3 py-2 flex items-center gap-2 shadow-[0_20px_40px_rgba(0,0,0,0.5)] text-xs font-semibold text-white/90 hover:bg-[#1C1C1E] active:scale-95 transition-all cursor-pointer">
                                <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                                    <Sparkles
                                        className="w-3.5 h-3.5 text-amber-400 drop-shadow-[0_0_4px_rgba(245,158,11,0.8)]"/>
                                </div>
                                <span
                                    className="text-white font-bold text-sm drop-shadow-md">{stamps.filter(s => Gamification.getCollectedStamps().includes(s.id)).length}</span>
                                <span className="text-white/40 text-[10px] uppercase tracking-wider font-bold">Stamps</span>
                            </button>
                        </div>

                        {/* Unified Consumer Bottom (Sponsor Marquee + Bottom Bar) */}
                        <ConsumerBottom
                            graph={graph}
                            location={location}
                            isCapturing={isCapturing}
                            handleCapture={handleCapture}
                            endWalk={endWalk}
                            setShowReportModal={(show) => setReportModalConfig({show})}
                            handlePOISelect={handlePOISelect}
                            onSponsorModalChange={setIsSponsorModalOpen}
                            onOpenNavigation={() => {
                                setNavInitialTarget(null);
                                setIsNavSheetOpen(true);
                            }}
                            onOpenSettings={() => setIsSettingsOpen(true)}
                            collectedStampIds={stamps.filter(s => Gamification.getCollectedStamps().includes(s.id)).map(s => s.id)}
                            isExploreOpen={isExploreOpen}
                            onExploreOpenChange={setIsExploreOpen}
                            initialExploreQuery={exploreQuery}
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
                                <p className="text-white/60 font-semibold text-[15px] mt-2 truncate">{Math.round(activeRoute.totalDistance)} m • {t(getNodeName(targetNode, i18n.language))}</p>
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

                {isStampModalOpen && (
                    <StampModal
                        stamps={stamps}
                        collectedStampIds={Gamification.getCollectedStamps()}
                        onClose={() => setIsStampModalOpen(false)}
                        onFindStamps={() => {
                            setIsStampModalOpen(false);
                            setExploreQuery('stamp');
                            setIsExploreOpen(true);
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
                        setReportModalConfig({show: true, issueType: issueType || undefined, message: message || undefined, fixed: true});
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
                    <div className="absolute top-44 right-4 z-40 pointer-events-auto flex flex-col items-end gap-2 hide-on-permission"
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
                            style={{ WebkitMaskImage: '-webkit-radial-gradient(white, black)' }}
                        >
                            <div
                                className="absolute inset-0 origin-center opacity-90 pointer-events-none group-hover:scale-110 transition-transform duration-500">
                                <MapView graph={graph} activeRoute={activeRoute} location={location} stamps={stamps} isRadar={true} mode="satellite" />
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
                        defaultMessage={reportModalConfig.message || undefined}
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
    const [isDataLoading, setIsDataLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [loadAttempt, setLoadAttempt] = useState(0);

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
        if (!venueKey) return;

        let isCurrentRequest = true;

        async function loadData() {
            setIsDataLoading(true);
            setLoadError(null);
            
            const offlineKey = OFFLINE_GRAPH_STORAGE_KEY + venueKey;

            // 1. Instantly load from offline cache if available (Offline-First Architecture)
            try {
                const cached = localStorage.getItem(offlineKey);
                if (cached) {
                    const parsedGraph = JSON.parse(cached) as GraphData;
                    setPrefetchedGraph(parsedGraph);
                    // Extract stamps for cached data
                    const cachedStamps = parsedGraph.nodes
                        .filter(n => n.category?.base_type === 'stamp')
                        .map(n => ({
                            id: n.id,
                            name: getNodeName(n, i18n.language) || 'Mystery Stamp',
                            lat: n.lat,
                            lng: n.lng,
                            rarity: 'common' as const,
                            description: getNodeDescription(n, i18n.language) || 'You found a stamp!',
                            poi_link: null,
                            image_url: n.image_url || n.category?.image_url
                        }));
                    setPrefetchedStamps(cachedStamps);
                    setIsDataLoading(false); // Unblock the UI instantly!
                }
            } catch(e) {
                console.warn('Failed to parse offline cache', e);
            }

            // 2. Fetch fresh data silently in the background
            try {
                // Fetch the new tables using full pagination to guarantee complete extraction
                const [nodesData, edgesData, categoriesData, eventsData, sponsorsData, sponsorZonesData] = await Promise.all([
                    fetchAllPages(() => supabase.from('nodes').select('*, category:node_categories(*)').eq('venue_key', venueKey).order('id')),
                    fetchAllPages(() => supabase.from('edges').select('*').eq('venue_key', venueKey).order('id')),
                    fetchAllPages(() => supabase.from('node_categories').select('*').order('id')),
                    fetchAllPages(() => supabase.from('events').select('*').eq('venue_key', venueKey).order('id')),
                    fetchAllPages(() => supabase.from('sponsors').select('*').eq('venue_key', venueKey)),
                    fetchAllPages(() => supabase.from('sponsor_zones').select('*').eq('venue_key', venueKey))
                ]);

                if (!isCurrentRequest) return;

                let activeGraph: GraphData = {
                    nodes: nodesData || [],
                    edges: (edgesData || []).map((e: any) => ({
                        ...e,
                        from: e.from_node_id,
                        to: e.to_node_id
                    })),
                    categories: categoriesData || [],
                    events: eventsData || [],
                    sponsorZones: sponsorZonesData || [],
                    sponsors: (sponsorsData || []).filter(s => !s.is_default_ad),
                    defaultAds: (sponsorsData || []).filter(s => s.is_default_ad),
                    rawTraces: []
                };

                const now = new Date().toISOString();
                const validNodes = activeGraph.nodes.filter(node => {
                    if (node.event_id) {
                         const evt = activeGraph.events.find(e => e.id === node.event_id);
                         if (!evt || !evt.is_active || now < evt.start_date || now > evt.end_date) return false;
                    }
                    return true;
                });

                if (validNodes.length !== activeGraph.nodes.length) {
                    const validNodeIds = new Set(validNodes.map(n => n.id));
                    const validEdges = activeGraph.edges.filter(e => validNodeIds.has(e.from) && validNodeIds.has(e.to));
                    activeGraph = {...activeGraph, nodes: validNodes, edges: validEdges};
                }

                // Save latest graph to offline cache
                try {
                    localStorage.setItem(offlineKey, JSON.stringify(activeGraph));
                } catch (e) {
                    console.warn('Failed to cache graph offline', e);
                }

                setPrefetchedGraph(activeGraph);

                // Extract stamps
                const combinedStamps: Stamp[] = activeGraph.nodes
                    .filter(n => n.category?.base_type === 'stamp')
                    .map(n => ({
                        id: n.id,
                        name: getNodeName(n, i18n.language) || 'Mystery Stamp',
                        lat: n.lat,
                        lng: n.lng,
                        rarity: 'common',
                        description: getNodeDescription(n, i18n.language) || 'You found a stamp!',
                        poi_link: null,
                        image_url: n.image_url || n.category?.image_url
                    }));

                setPrefetchedStamps(combinedStamps);
            } catch (e) {
                console.error('Failed to fetch latest map data from network', e);
                if (isCurrentRequest) {
                    // Only show an error if we ALSO failed to load from cache
                    if (!localStorage.getItem(offlineKey)) {
                        setPrefetchedGraph(null);
                        setPrefetchedStamps(null);
                        setLoadError('We could not load Lalbagh’s map. Check your connection and try again.');
                    }
                }
            } finally {
                if (isCurrentRequest) {
                    setIsDataLoading(false);
                }
            }
        }

        void loadData();
        return () => {
            isCurrentRequest = false;
        };
    }, [venueKey, loadAttempt]);

    return (
        <>
            {!splashFinished && (
                <SplashScreen 
                    isLoading={isDataLoading} 
                    onFinish={() => setSplashFinished(true)} 
                />
            )}
            <div className="w-full h-full">
                <MainApp
                    venueKey={venueKey}
                    setVenueKey={handleVenueChange}
                    availableVenues={availableVenues}
                    prefetchedGraph={prefetchedGraph}
                    prefetchedStamps={prefetchedStamps}
                />
            </div>
            {loadError && splashFinished && (
                <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-slate-950/90 p-6 text-white backdrop-blur-xl">
                    <div className="glass-panel w-full max-w-sm p-6 text-center">
                        <h1 className="text-xl font-black">Map unavailable</h1>
                        <p className="mt-2 text-sm text-slate-300">{loadError}</p>
                        <Button
                            className="mt-6 w-full bg-emerald-500 font-bold text-white hover:bg-emerald-600"
                            onClick={() => setLoadAttempt(attempt => attempt + 1)}
                        >
                            Retry loading map
                        </Button>
                    </div>
                </div>
            )}
        </>
    );
}
