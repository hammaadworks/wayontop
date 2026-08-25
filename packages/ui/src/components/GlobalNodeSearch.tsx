import React, {useMemo, useState, useEffect} from 'react';
import Fuse from 'fuse.js';
import {Camera, Coffee, Droplets, Search, X} from 'lucide-react';
import {Input} from './ui/input';
import {Badge} from './ui/badge';
import {distanceInMeters} from '../lib/routing';
import {getPOIStyle} from '../lib/poiStyles';
import type {GraphData, GraphNode} from '../lib/types';
import {useTranslation} from 'react-i18next';

import {Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerClose} from './ui/drawer';
import type {MapEvent} from '../lib/types';

// Simple debounce hook
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

interface GlobalNodeSearchProps {
    graph: GraphData | null;
    userLocation?: { lat: number; lng: number } | null;
    onSelectNode: (node: GraphNode) => void;
    onClose?: () => void;
    collectedStampIds?: number[];
    onSearchEvent?: (query: string) => void;
}

export function GlobalNodeSearch({
                                     graph,
                                     userLocation,
                                     onSelectNode,
                                     onClose,
                                     collectedStampIds = [],
                                     onSearchEvent
                                 }: Readonly<GlobalNodeSearchProps>) {
    const {t} = useTranslation();
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedQuery = useDebounce(searchQuery, 300);
    const [selectedEvent, setSelectedEvent] = useState<MapEvent | null>(null);

    useEffect(() => {
        if (debouncedQuery.trim() && onSearchEvent) {
            onSearchEvent(debouncedQuery.trim());
        }
    }, [debouncedQuery, onSearchEvent]);

    const pois = useMemo(() => {
        if (!graph) return [];

        return graph.nodes.map(n => {
            let searchAliases: string[] = [];

            if (n.category?.synonyms) {
                Object.values(n.category.synonyms).forEach(arr => searchAliases.push(...arr));
            }
            if (n.synonyms) {
                Object.values(n.synonyms).forEach(arr => searchAliases.push(...arr));
            }

            let primaryName = n.name?.en || n.category?.name?.en || '';
            
            // Apply Fog of War for stamps
            if (n.category?.base_type === 'stamp' && !collectedStampIds.includes(n.id)) {
                primaryName = 'Mystery Stamp';
                searchAliases = ['stamp', 'game', 'mystery', 'collectible'];
            }

            return {
                ...n,
                searchName: primaryName,
                searchTags: searchAliases
            };
        });
    }, [graph, collectedStampIds]);

    const fuse = useMemo(() => new Fuse(pois, {
        keys: ['searchName', 'searchTags'],
        threshold: 0.3
    }), [pois]);

    const searchResults = useMemo(() => {
        if (!graph) return [];
        let results = debouncedQuery
            ? fuse.search(debouncedQuery).map(result => result.item)
            : pois;

        const isSearchingMinor = debouncedQuery && /trash|garbage|bin|bench/i.test(debouncedQuery);
        
        // Remove intersections entirely from user-facing search
        results = results.filter(poi => poi.category?.base_type !== 'intersection');

        // Apply minor utility spam filter
        if (!isSearchingMinor) {
            results = results.filter(poi => poi.category?.base_type !== 'utility_minor');
        } else {
            // Keep only top 2 minor utilities if queried
            results = results.slice(0, 2);
        }

        // Apply event filter - already applied to graph in App.tsx typically, but safe to verify here
        
        // Calculate distance and anchor nodes
        let nodesWithStats = results.map(poi => {
            const distance = userLocation ? distanceInMeters(userLocation.lat, userLocation.lng, poi.lat, poi.lng) : undefined;
            return {
                ...poi,
                distance
            };
        });
        
        if (userLocation) {
            nodesWithStats = nodesWithStats.sort((a, b) => (a.distance || 0) - (b.distance || 0));
        }

        // Apply anchors to utilities
        const finalResults = nodesWithStats.map(poi => {
            let anchorName = null;
            if (poi.category?.base_type === 'utility_minor' || poi.category?.base_type === 'utility_major') {
                // Find nearest POI or Gate
                let nearestMajor = null;
                let minMajorDist = Infinity;
                pois.forEach(majorNode => {
                    if (majorNode.category?.base_type === 'poi' || majorNode.category?.base_type === 'gate') {
                        const dist = distanceInMeters(poi.lat, poi.lng, majorNode.lat, majorNode.lng);
                        if (dist < minMajorDist) {
                            minMajorDist = dist;
                            nearestMajor = majorNode.searchName;
                        }
                    }
                });
                anchorName = nearestMajor;
            }
            return { ...poi, anchorName };
        });

        // Ensure we cap results to prevent massive un-scrollable list
        return finalResults.slice(0, 50);

    }, [debouncedQuery, pois, fuse, userLocation, graph]);

    return (
        <div className="h-full w-full flex flex-col bg-transparent text-white">
            <div className="p-6 pb-4 relative shrink-0">
                <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={t('search_placeholder', 'Search here')}
                            className="w-full bg-white/5 border border-white/10 pl-4 pr-10 py-6 text-[17px] rounded-full text-white placeholder:text-white/40 focus-visible:ring-1 focus-visible:ring-emerald-500 shadow-inner"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer">
                                <X className="w-5 h-5 text-white/40 hover:text-white transition-colors"/>
                            </button>
                        )}
                    </div>
                </div>

                {/* Quick Filters */}
                <div className="flex items-center gap-4 mt-5 px-1 overflow-x-auto pb-2 scrollbar-hide">
                    <button onClick={() => setSearchQuery('photo')}
                            className="shrink-0 flex items-center gap-2 bg-white/5 hover:bg-white/10 active:bg-white/20 border border-white/10 rounded-full px-4 py-2 transition-all cursor-pointer">
                        <Camera className="w-4 h-4 text-emerald-400"/>
                        <span className="text-[13px] font-medium text-white">Photo Spots</span>
                    </button>
                    <button onClick={() => setSearchQuery('restroom')}
                            className="shrink-0 flex items-center gap-2 bg-white/5 hover:bg-white/10 active:bg-white/20 border border-white/10 rounded-full px-4 py-2 transition-all cursor-pointer">
                        <Droplets className="w-4 h-4 text-cyan-400"/>
                        <span className="text-[13px] font-medium text-white">Restrooms</span>
                    </button>
                    <button onClick={() => setSearchQuery('food')}
                            className="shrink-0 flex items-center gap-2 bg-white/5 hover:bg-white/10 active:bg-white/20 border border-white/10 rounded-full px-4 py-2 transition-all cursor-pointer">
                        <Coffee className="w-4 h-4 text-orange-400"/>
                        <span className="text-[13px] font-medium text-white">Food & Drink</span>
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-transparent">
                <div className="pb-8 pt-2">
                    {searchResults.map((poi: any) => {
                        const {icon: Icon, bgClass, textClass} = getPOIStyle(poi);
                        
                        // Handle Stamp display override
                        const isUndiscoveredStamp = poi.category?.base_type === 'stamp' && !collectedStampIds.includes(poi.id);

                        return (
                            <div
                                key={poi.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => {
                                    onSelectNode(poi);
                                    onClose?.();
                                }}
                                className="bg-transparent hover:bg-white/5 active:bg-white/10 px-4 py-3.5 transition-all cursor-pointer flex items-center justify-between border-b border-white/5 last:border-0"
                            >
                                <div className="flex items-center gap-4 w-full">
                                    {/* Avatar / Icon */}
                                    <div className="relative shrink-0">
                                        {poi.image_url && !isUndiscoveredStamp ? (
                                            <div className="w-12 h-12 rounded-full overflow-hidden border border-white/20 shadow-md">
                                                <img src={poi.image_url} alt="" className="w-full h-full object-cover" />
                                            </div>
                                        ) : (
                                            <div className={`w-12 h-12 rounded-full ${bgClass} flex items-center justify-center border border-white/10`}>
                                                {isUndiscoveredStamp ? (
                                                    <span className="text-white/80 font-black text-xl">?</span>
                                                ) : (
                                                    <Icon className={`${textClass} w-6 h-6`}/>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="flex flex-col min-w-0 flex-1">
                                        {/* Title Row */}
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className={`font-medium text-[16px] tracking-tight truncate ${poi.status === 'construction' ? 'line-through text-white/50' : 'text-white'}`}>
                                                {t(poi.searchName)}
                                            </h4>
                                            
                                            {/* Badges */}
                                            {poi.event_id && (() => {
                                                const event = graph?.events.find(e => e.id === poi.event_id);
                                                if (event && event.badge_name) {
                                                    return (
                                                        <Badge 
                                                            variant="secondary" 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedEvent(event);
                                                            }}
                                                            className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 px-1.5 py-0 text-[9px] uppercase tracking-widest shrink-0 cursor-pointer transition-colors"
                                                        >
                                                            ⭐ {event.badge_name}
                                                        </Badge>
                                                    );
                                                }
                                                return null;
                                            })()}
                                            {poi.is_paid && (
                                                <Badge variant="secondary" className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0 text-[9px] uppercase tracking-widest shrink-0">
                                                    ₹ Paid
                                                </Badge>
                                            )}
                                            {poi.status === 'construction' && (
                                                <Badge variant="secondary" className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0 text-[9px] uppercase tracking-widest shrink-0">
                                                    🚧 Closed
                                                </Badge>
                                            )}
                                            {isUndiscoveredStamp && (
                                                <Badge variant="secondary" className="bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-1.5 py-0 text-[9px] uppercase tracking-widest shrink-0">
                                                    ✨ Undiscovered
                                                </Badge>
                                            )}
                                            {poi.category?.base_type === 'stamp' && !isUndiscoveredStamp && (
                                                <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0 text-[9px] uppercase tracking-widest shrink-0">
                                                    🏆 Collected
                                                </Badge>
                                            )}
                                        </div>
                                        
                                        {/* Subtitle Row */}
                                        <div className="flex items-center gap-1.5 truncate text-white/60 text-[13px]">
                                            {poi.distance !== undefined && (
                                                <span className="text-emerald-400/90 font-medium">
                                                    {Math.round(poi.distance)}m away
                                                </span>
                                            )}
                                            {isUndiscoveredStamp && (
                                                <>
                                                    <span className="text-white/20">•</span>
                                                    <span>Go there to reveal and collect!</span>
                                                </>
                                            )}
                                            {poi.category?.base_type === 'stamp' && !isUndiscoveredStamp && (
                                                <>
                                                    <span className="text-white/20">•</span>
                                                    <span>View in your collection</span>
                                                </>
                                            )}
                                            {!isUndiscoveredStamp && poi.category?.base_type !== 'stamp' && poi.anchorName && (
                                                <>
                                                    <span className="text-white/20">•</span>
                                                    <span className="truncate">near {t(poi.anchorName)}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {searchResults.length === 0 && (
                        <div className="text-center text-white/40 mt-16 py-8 flex flex-col items-center">
                            <Search className="w-10 h-10 mb-3 opacity-20"/>
                            <p className="text-[15px] font-medium">{t('search_no_results', {query: searchQuery})}</p>
                        </div>
                    )}
                </div>
            </div>
            
            <Drawer open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
                <DrawerContent className="bg-[#1a1b1e] border-white/10 text-white">
                    <div className="mx-auto w-full max-w-sm">
                        <DrawerHeader>
                            <DrawerTitle className="text-xl font-bold">{selectedEvent?.name}</DrawerTitle>
                            <DrawerDescription className="text-white/70 text-sm mt-2">
                                {selectedEvent?.description || "A special event happening right now!"}
                            </DrawerDescription>
                        </DrawerHeader>
                        <div className="p-4 pb-8 flex flex-col gap-3">
                            <DrawerClose>
                                <button className="w-full bg-white/10 hover:bg-white/20 text-white font-medium py-3 rounded-xl transition-colors">
                                    Got it
                                </button>
                            </DrawerClose>
                        </div>
                    </div>
                </DrawerContent>
            </Drawer>
        </div>
    );
}
