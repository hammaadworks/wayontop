import React, {useState, useMemo, useEffect} from 'react';
import {Input} from '@wayontop/ui/components/ui/input';
import {Button} from '@wayontop/ui/components/ui/button';
import {MapPin, X, ArrowDownUp, Navigation, LocateFixed} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import Fuse from 'fuse.js';
import type {GraphData, GraphNode} from '@wayontop/ui/lib/types';
import {getPOIStyle} from '@wayontop/ui/lib/poiStyles';
import { calculateRoute } from '@wayontop/ui/lib/routingClient';

interface NavigationSheetProps {
    isOpen: boolean;
    onClose: () => void;
    graph: GraphData | null;
    initialToNode: GraphNode | null;
    location: any | null;
    onStartNavigation: (route: { path: GraphNode[]; totalDistance: number }, toNode: GraphNode) => void;
    onReportBug?: (issueType: string, message: string) => void;
}

export function NavigationSheet({
                                    isOpen,
                                    onClose,
                                    graph,
                                    initialToNode,
                                    location,
                                    onStartNavigation,
                                    onReportBug
                                }: NavigationSheetProps) {
    const {t} = useTranslation();
    const getTitle = (node: GraphNode | null) => node ? (node.name?.en || node.category?.name?.en || '') : '';
    const [fromQuery, setFromQuery] = useState('Your Location');
    const [toQuery, setToQuery] = useState(getTitle(initialToNode));
    const [activeInput, setActiveInput] = useState<'from' | 'to' | null>(null);

    const [fromNode, setFromNode] = useState<GraphNode | 'current' | null>('current');
    const [toNode, setToNode] = useState<GraphNode | null>(initialToNode);
    
    type NavError = { type: 'gps' | 'bounds' | 'nearest' | 'path' | 'graph', title: string, tip: string };
    const [error, setError] = useState<NavError | null>(null);
    
    // Tracks if the keyboard was open when the user touched a suggestion
    const wasKeyboardOpenRef = React.useRef(false);

    useEffect(() => {
        if (isOpen) {
            setToNode(initialToNode);
            setToQuery(getTitle(initialToNode));
            setFromNode('current');
            setFromQuery('Your Location');
            setActiveInput('from');
            setError(null);
        }
    }, [isOpen, initialToNode]);

    const pois = useMemo(() => {
        if (!graph) return [];
        return graph.nodes.filter(n => n.category?.base_type !== 'intersection').map(n => {
            let searchAliases: string[] = [];

            if (n.category?.synonyms) {
                Object.values(n.category.synonyms).forEach(arr => searchAliases.push(...arr));
            }
            if (n.synonyms) {
                Object.values(n.synonyms).forEach(arr => searchAliases.push(...arr));
            }

            const primaryName = n.name?.en || n.category?.name?.en || '';

            return {
                ...n,
                searchName: primaryName,
                searchTags: searchAliases
            };
        });
    }, [graph]);

    const fuse = useMemo(() => new Fuse(pois, {keys: ['searchName', 'searchTags'], threshold: 0.3}), [pois]);

    const searchResults = useMemo(() => {
        const query = activeInput === 'from' ? fromQuery : toQuery;
        if (!query || query === 'Your Location') return pois;
        return fuse.search(query).map(res => res.item);
    }, [activeInput, fromQuery, toQuery, pois, fuse]);

    const handleSelectNode = (node: any | 'current') => {
        if (activeInput === 'from') {
            setFromNode(node);
            setFromQuery(node === 'current' ? 'Your Location' : node.searchName);
            setActiveInput('to');
        } else if (activeInput === 'to') {
            setToNode(node);
            setToQuery(node.searchName);
            setActiveInput(null);
        }
    };

    const handleSwap = () => {
        const tempNode = fromNode;
        setFromNode(toNode);
        setToNode(tempNode === 'current' ? null : tempNode as GraphNode);

        const tempQuery = fromQuery;
        setFromQuery(toQuery);
        setToQuery(tempQuery);
    };

    const [isNavigating, setIsNavigating] = useState(false);
    const abortRef = React.useRef<AbortController | null>(null);

    // Clean up worker on unmount
    useEffect(() => {
        return () => {
            if (abortRef.current) {
                abortRef.current.abort();
            }
        };
    }, []);

    const handleNavigate = () => {
        setError(null);

        if (!toNode) {
            setError({ type: 'nearest', title: "Where are we going?", tip: "Please select a destination first." });
            return;
        }

        if (!graph) {
            setError({ type: 'graph', title: "Map is still loading", tip: "Give it a second to download the paths." });
            return;
        }

        let startNode: GraphNode | null = null;

        if (fromNode === 'current') {
            if (!location) {
                setError({ type: 'gps', title: "We need your location", tip: "Turn on your GPS or type a starting point manually." });
                return;
            }

            const distToCenter = Math.hypot(location.lat - 12.9500, location.lng - 77.5850);
            const IS_OUT_OF_BOUNDS = distToCenter > 0.02; // Roughly 2km

            if (IS_OUT_OF_BOUNDS) {
                setError({ type: 'bounds', title: "You're not in Lalbagh", tip: "This app is just for the park. You can still manually type a location to preview the paths." });
                return;
            }

            // Start node is handled dynamically in Web Worker via findNearestEdgePoint
            startNode = { id: -999, lat: location.lat, lng: location.lng, name: {en: "Your Location", kn: "", hi: ""}, category_id: 0, status: 'active', is_paid: false };
        } else if (fromNode) {
            startNode = fromNode as GraphNode;
        }
        
        if (!startNode) return;
        
        setIsNavigating(true);

        if (abortRef.current) {
            abortRef.current.abort();
        }
        
        const controller = new AbortController();
        abortRef.current = controller;

        const routeParams = (fromNode === 'current' && location)
            ? { graph, targetId: toNode.id, lat: location.lat, lng: location.lng, signal: controller.signal }
            : { graph, startId: startNode.id, targetId: toNode.id, signal: controller.signal };

        calculateRoute(routeParams)
            .then(route => {
                setIsNavigating(false);
                if (!route) {
                    setError({ type: 'path', title: "The math isn't mathing", tip: "There's no clear route between these spots. It might be a missing path in our data." });
                } else {
                    onStartNavigation(route, toNode);
                }
            })
            .catch(error => {
                if (error.name === 'AbortError') return;
                setIsNavigating(false);
                setError({ type: 'path', title: "Routing crashed", tip: "The navigation engine hit a snag." });
            });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full h-full max-h-[90dvh] max-w-md bg-[#1C1C1E] border border-white/10 rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Navigation className="w-5 h-5 text-emerald-400" />
                        Route Planner
                    </h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="flex-1 flex flex-col overflow-hidden">

                        <div className="flex gap-3 items-center shrink-0 p-4 pb-2">
                            <div className="flex flex-col items-center gap-1.5 pt-2">
                                <div className="w-3 h-3 rounded-full border-2 border-emerald-400"></div>
                                <div className="w-0.5 h-6 bg-white/20"></div>
                                <MapPin className="w-4 h-4 text-red-400"/>
                            </div>

                            <div className="flex-1 space-y-3">
                                <div className="relative">
                                    <Input
                                        value={fromQuery}
                                        onFocus={() => {
                                            setActiveInput('from');
                                            setError(null);
                                            if (fromNode === 'current') setFromQuery('');
                                        }}
                                        onChange={(e) => setFromQuery(e.target.value)}
                                        placeholder="Choose start location"
                                        className={`w-full border-0 pl-4 py-5 text-[15px] rounded-xl placeholder:text-white/40 transition-all outline-none focus-visible:ring-0 ${
                                            activeInput === 'from'
                                                ? 'bg-white/10 ring-2 ring-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                                                : 'bg-black/40 text-white/60 hover:bg-black/60 cursor-pointer'
                                        }`}
                                    />
                                    {fromQuery && activeInput === 'from' && (
                                        <button onClick={() => {
                                            setFromQuery('');
                                            setFromNode(null);
                                        }}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white">
                                            <X className="w-4 h-4"/>
                                        </button>
                                    )}
                                </div>
                                <div className="relative">
                                    <Input
                                        value={toQuery}
                                        onFocus={() => {
                                            setActiveInput('to');
                                            setError(null);
                                            if (toNode === null) setToQuery('');
                                        }}
                                        onChange={(e) => setToQuery(e.target.value)}
                                        placeholder="Choose destination"
                                        className={`w-full border-0 pl-4 py-5 text-[15px] rounded-xl placeholder:text-white/40 transition-all outline-none focus-visible:ring-0 ${
                                            activeInput === 'to'
                                                ? 'bg-white/10 ring-2 ring-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                                                : 'bg-black/40 text-white/60 hover:bg-black/60 cursor-pointer'
                                        }`}
                                    />
                                    {toQuery && activeInput === 'to' && (
                                        <button onClick={() => {
                                            setToQuery('');
                                            setToNode(null);
                                        }}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white">
                                            <X className="w-4 h-4"/>
                                        </button>
                                    )}
                                </div>
                            </div>

                            <button onClick={handleSwap}
                                    className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 active:bg-white/20 transition-all shrink-0">
                                <ArrowDownUp className="w-5 h-5 text-white/70"/>
                            </button>
                        </div>

                    {activeInput ? (
                        <div className="flex-1 px-4 py-2 overflow-y-auto">
                            {activeInput === 'from' && (
                                <button
                                    onPointerDown={(e) => {
                                        if (e.pointerType === 'touch' && document.activeElement?.tagName === 'INPUT') {
                                            wasKeyboardOpenRef.current = true;
                                        } else {
                                            wasKeyboardOpenRef.current = false;
                                        }
                                    }}
                                    onClick={() => {
                                        if (wasKeyboardOpenRef.current) {
                                            wasKeyboardOpenRef.current = false;
                                            if (document.activeElement?.tagName === 'INPUT') {
                                                (document.activeElement as HTMLElement).blur();
                                            }
                                            return;
                                        }
                                        handleSelectNode('current');
                                    }}
                                    className="w-full flex items-center gap-4 p-3 hover:bg-white/5 rounded-2xl transition-all border-b border-white/5 last:border-0"
                                >
                                    <div
                                        className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                                        <LocateFixed className="w-5 h-5 text-blue-400"/>
                                    </div>
                                    <span className="font-semibold text-[16px] text-blue-400">Your Location</span>
                                </button>
                            )}

                            {searchResults.map(poi => {
                                const {icon: Icon, bgClass, textClass} = getPOIStyle(poi);
                                return (
                                    <button
                                        key={poi.id}
                                        onPointerDown={(e) => {
                                            // If on mobile (touch) and an input is currently focused (keyboard is open),
                                            // we flag this tap so it only dismisses the keyboard instead of selecting.
                                            if (e.pointerType === 'touch' && document.activeElement?.tagName === 'INPUT') {
                                                wasKeyboardOpenRef.current = true;
                                            } else {
                                                wasKeyboardOpenRef.current = false;
                                            }
                                        }}
                                        onClick={() => {
                                            if (wasKeyboardOpenRef.current) {
                                                wasKeyboardOpenRef.current = false;
                                                // Explicitly blur to ensure keyboard closes smoothly
                                                if (document.activeElement?.tagName === 'INPUT') {
                                                    (document.activeElement as HTMLElement).blur();
                                                }
                                                return; // Stop here, don't select the node on the first tap
                                            }
                                            handleSelectNode(poi);
                                        }}
                                        className="w-full flex items-center gap-4 p-3 hover:bg-white/5 rounded-2xl transition-all border-b border-white/5 last:border-0 text-left"
                                    >
                                        <div
                                            className={`w-10 h-10 rounded-full ${bgClass} flex items-center justify-center shrink-0`}>
                                            <Icon className={`${textClass} w-5 h-5`}/>
                                        </div>
                                        <div className="flex flex-col">
                                            <span
                                                className="font-semibold text-[16px] text-white tracking-tight">{t(poi.searchName)}</span>
                                            <div className="flex gap-1.5 items-center mt-0.5">
                                                {poi.category?.name?.en && (
                                                    <span className="text-[12px] text-white/50 capitalize">{poi.category.name.en}</span>
                                                )}
                                                {poi.is_paid && (
                                                    <>
                                                        <span className="text-[10px] text-white/20">•</span>
                                                        <span className="text-[11px] font-bold text-amber-400">₹ Paid</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex-1 p-6 flex flex-col justify-end">
                            {error && (
                                <div className="bg-[#3b1219]/80 border border-red-500/40 rounded-[28px] p-6 mb-6 flex flex-col items-start gap-2 animate-in fade-in slide-in-from-bottom-4 shadow-[0_10px_40px_rgba(239,68,68,0.15)] backdrop-blur-xl">
                                    <h4 className="font-bold text-[20px] text-red-400 tracking-tight leading-none">{error.title}</h4>
                                    <p className="font-medium text-[15px] text-red-200/90 leading-relaxed mt-1">{error.tip}</p>
                                    {onReportBug && (
                                        <Button 
                                            onClick={() => {
                                                const issueType = error.type === 'path' ? 'data' : 'bug';
                                                const message = `Error Type: ${error.type}\nStart: '${fromQuery}'\nDestination: '${toQuery}'\nTitle: ${error.title}`;
                                                onReportBug(issueType, message);
                                            }}
                                            className="mt-4 w-full bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/60 shadow-[0_0_15px_rgba(239,68,68,0.1)] h-12 text-[15px] font-bold rounded-2xl transition-all"
                                        >
                                            Report Issue
                                        </Button>
                                    )}
                                </div>
                            )}
                            <Button
                                onClick={handleNavigate}
                                disabled={!fromNode || !toNode || isNavigating}
                                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl py-7 text-lg font-bold shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-50 disabled:shadow-none transition-all relative overflow-hidden"
                            >
                                {isNavigating ? (
                                    <>
                                        <div className="absolute inset-0 bg-emerald-600 animate-pulse"></div>
                                        <div className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full mr-3 relative z-10"/>
                                        <span className="relative z-10">Calculating Route...</span>
                                    </>
                                ) : (
                                    <>
                                        <Navigation className="w-5 h-5 mr-2"/>
                                        Start Navigation
                                    </>
                                )}
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
