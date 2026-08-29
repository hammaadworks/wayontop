import React, {useMemo, useState, useEffect} from 'react';
import Fuse from 'fuse.js';
import {Camera, Coffee, Droplets, Search, X} from 'lucide-react';
import {Input} from './ui/input';
import {Badge} from './ui/badge';
import {distanceInMeters} from '../lib/routing';
import {getPOIStyle} from '../lib/poiStyles';
import { NodeSearchResultItem } from './NodeSearchResultItem';
import type {GraphData, GraphNode} from '../lib/types';
import {useTranslation} from 'react-i18next';
import { getNodeName, getNodeCategoryName } from '../lib/utils';

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
    language?: string;
    onSearchEvent?: (query: string) => void;
    initialQuery?: string;
}

export function GlobalNodeSearch({
                                     graph,
                                     userLocation,
                                     onSelectNode,
                                     onClose,
                                     collectedStampIds = [],
                                     language = 'en',
                                     onSearchEvent,
                                     initialQuery = ''
                                 }: Readonly<GlobalNodeSearchProps>) {
    const {t} = useTranslation();
    const [searchQuery, setSearchQuery] = useState(initialQuery);
    const debouncedQuery = useDebounce(searchQuery, 300);
    const [selectedEvent, setSelectedEvent] = useState<MapEvent | null>(null);

    useEffect(() => {
        setSearchQuery(initialQuery);
    }, [initialQuery]);

    useEffect(() => {
        if (debouncedQuery.trim() && onSearchEvent) {
            onSearchEvent(debouncedQuery.trim());
        }
    }, [debouncedQuery, onSearchEvent]);

    const quickFilters = useMemo(() => {
        if (!graph) return [];
        
        // A. Pinned Categories
        const venueCategoryIds = new Set(graph.nodes.map(n => n.category_id));
        const pinned = graph.categories
            .filter(c => c.is_pinned && venueCategoryIds.has(c.id))
            .map(c => ({ label: getNodeCategoryName(c, language), type: 'category' as const, category: c }));

        // B. Active Events
        const now = new Date().toISOString();
        const activeEvents = (graph.events || [])
            .filter(e => e.is_active && now >= e.start_date && now <= e.end_date)
            .map(e => ({ label: e.name, type: 'event' as const, event: e }));

        // C. Top Frequent Categories
        const counts = new Map<string, { label: string, count: number, category: any }>();
        
        graph.nodes.forEach(n => {
            if (!n.category || n.category.base_type === 'intersection') return;
            const label = getNodeCategoryName(n.category, language);
            if (!label) return;
            if (!counts.has(label)) {
                counts.set(label, { label, count: 0, category: n.category });
            }
            counts.get(label)!.count++;
        });

        const sorted = Array.from(counts.values()).sort((a, b) => b.count - a.count);
        // Exclude intersection, stamp, and ANY category that is already in the `pinned` array
        const pinnedCodes = new Set(graph.categories.filter(c => c.is_pinned).map(c => c.code));
        
        const frequent = sorted
            .filter(f => f.category.base_type !== 'stamp' && f.category.base_type !== 'intersection' && !pinnedCodes.has(f.category.code))
            .slice(0, 5)
            .map(c => ({ label: c.label, type: 'category' as const, category: c.category }));
            
        return [...pinned, ...activeEvents, ...frequent];
    }, [graph, language]);

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

            let primaryName = getNodeName(n, language);
            
            // Apply Fog of War for stamps
            if (n.category?.base_type === 'stamp' && !collectedStampIds.includes(n.id)) {
                primaryName = 'Mystery Stamp';
                searchAliases = ['stamp', 'game', 'mystery', 'collectible'];
            }

            if (n.event_id) {
                const ev = graph.events?.find(e => e.id === n.event_id);
                if (ev) {
                    searchAliases.push(ev.name);
                }
            }

            return {
                ...n,
                searchName: primaryName,
                searchTags: searchAliases
            };
        });
    }, [graph, collectedStampIds, language]);

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
                    {quickFilters.map(filter => {
                        if (filter.type === 'event') {
                            return (
                                <button key={filter.label} onClick={() => setSearchQuery(filter.label.toLowerCase())}
                                        className="shrink-0 flex items-center gap-2 bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/30 rounded-full px-4 py-2 transition-all cursor-pointer">
                                    <span className="text-[13px] font-medium">{filter.label}</span>
                                </button>
                            );
                        }
                        
                        const {icon: Icon, iconColor} = getPOIStyle({category: filter.category});
                        return (
                            <button key={filter.label} onClick={() => setSearchQuery(filter.label.toLowerCase())}
                                    className="shrink-0 flex items-center gap-2 bg-white/5 hover:bg-white/10 active:bg-white/20 border border-white/10 rounded-full px-4 py-2 transition-all cursor-pointer">
                                <Icon className={`w-4 h-4 ${iconColor}`}/>
                                <span className="text-[13px] font-medium text-white">{filter.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-transparent">
                <div className="pb-8 pt-2">
                    {searchResults.map((poi: any) => {
                        const isUndiscoveredStamp = poi.category?.base_type === 'stamp' && !collectedStampIds.includes(poi.id);
                        return (
                            <NodeSearchResultItem
                                key={poi.id}
                                poi={poi}
                                onClick={() => {
                                    onSelectNode(poi);
                                    onClose?.();
                                }}
                                t={t as any}
                                isUndiscoveredStamp={isUndiscoveredStamp}
                                isSelectedEvent={false}
                                onSelectEvent={setSelectedEvent}
                                event={poi.event_id ? graph?.events.find(e => e.id === poi.event_id) : undefined}
                                language={language}
                            />
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
