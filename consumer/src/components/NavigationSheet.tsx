import {useState, useMemo, useEffect} from 'react';
import {Drawer, DrawerContent, DrawerHeader, DrawerTitle} from '@wayontop/ui/components/ui/drawer';
import {Input} from '@wayontop/ui/components/ui/input';
import {Button} from '@wayontop/ui/components/ui/button';
import {Search, MapPin, X, ArrowDownUp, Navigation, LocateFixed} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import Fuse from 'fuse.js';
import type {GraphData, GraphNode} from '@wayontop/ui/lib/types';
import {findNearestNode} from '@wayontop/ui/lib/routing';
import {getPOIStyle} from '@wayontop/ui/lib/poiStyles';
import {showAlert} from '../lib/events';

interface NavigationSheetProps {
    isOpen: boolean;
    onClose: () => void;
    graph: GraphData | null;
    initialToNode: GraphNode | null;
    location: any | null;
    onStartNavigation: (fromNode: GraphNode, toNode: GraphNode) => void;
}

export function NavigationSheet({
                                    isOpen,
                                    onClose,
                                    graph,
                                    initialToNode,
                                    location,
                                    onStartNavigation
                                }: NavigationSheetProps) {
    const {t} = useTranslation();
    const [fromQuery, setFromQuery] = useState('Your Location');
    const [toQuery, setToQuery] = useState(initialToNode ? initialToNode.name : '');
    const [activeInput, setActiveInput] = useState<'from' | 'to' | null>(null);

    const [fromNode, setFromNode] = useState<GraphNode | 'current' | null>('current');
    const [toNode, setToNode] = useState<GraphNode | null>(initialToNode);

    useEffect(() => {
        if (isOpen) {
            setToNode(initialToNode);
            setToQuery(initialToNode ? initialToNode.name : '');
            setFromNode('current');
            setFromQuery('Your Location');
            setActiveInput('from');
        }
    }, [isOpen, initialToNode]);

    const pois = useMemo(() => {
        if (!graph) return [];
        return graph.nodes.filter(n => n.type !== 'track');
    }, [graph]);

    const fuse = useMemo(() => new Fuse(pois, {keys: ['name', 'tags'], threshold: 0.3}), [pois]);

    const searchResults = useMemo(() => {
        const query = activeInput === 'from' ? fromQuery : toQuery;
        if (!query || query === 'Your Location') return pois;
        return fuse.search(query).map(res => res.item);
    }, [activeInput, fromQuery, toQuery, pois, fuse]);

    const handleSelectNode = (node: GraphNode | 'current') => {
        if (activeInput === 'from') {
            setFromNode(node);
            setFromQuery(node === 'current' ? 'Your Location' : (node as GraphNode).name);
            setActiveInput('to');
        } else if (activeInput === 'to') {
            setToNode(node as GraphNode);
            setToQuery((node as GraphNode).name);
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

    const handleStart = () => {
        if (!toNode) return;

        if (fromNode === 'current') {
            if (!location) {
                showAlert('Waiting for GPS signal...');
                return;
            }

            // Check if user is out of Lalbagh bounds
            // Assuming Lalbagh center is approx 12.9500, 77.5850 and radius is ~1km
            const distToCenter = Math.hypot(location.lat - 12.9500, location.lng - 77.5850);
            const IS_OUT_OF_BOUNDS = distToCenter > 0.02; // Roughly 2km

            if (IS_OUT_OF_BOUNDS) {
                showAlert('You need to come to Lalbagh to try navigation');
                return;
            }

            // Find nearest node using Haversine distance
            const nearestStart = graph ? findNearestNode(graph, location.lat, location.lng) : null;

            if (nearestStart) {
                onStartNavigation(nearestStart, toNode);
            }
        } else if (fromNode) {
            onStartNavigation(fromNode, toNode);
        }
    };

    return (
        <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DrawerContent className="!h-[90svh] bg-transparent border-0 p-0 text-white !shadow-none z-[100]">
                <div
                    className="h-full w-full bg-[#1C1C1E]/95 backdrop-blur-3xl border-t border-white/10 rounded-t-[32px] flex flex-col shadow-[0_-20px_60px_rgba(0,0,0,0.5)]">
                    <DrawerHeader className="p-6 pb-4 relative border-b border-white/10 shrink-0">
                        <div className="w-10 h-1.5 bg-white/20 rounded-full mx-auto mb-4"></div>
                        <DrawerTitle className="text-white text-left sr-only">Route Planner</DrawerTitle>

                        <div className="flex gap-3 items-center">
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
                                            if (fromNode === 'current') setFromQuery('');
                                        }}
                                        onChange={(e) => setFromQuery(e.target.value)}
                                        placeholder="Choose start location"
                                        className="w-full bg-black/40 border-0 pl-4 py-5 text-[15px] rounded-xl text-white placeholder:text-white/40 focus-visible:ring-1 focus-visible:ring-emerald-500/50"
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
                                            if (toNode === null) setToQuery('');
                                        }}
                                        onChange={(e) => setToQuery(e.target.value)}
                                        placeholder="Choose destination"
                                        className="w-full bg-black/40 border-0 pl-4 py-5 text-[15px] rounded-xl text-white placeholder:text-white/40 focus-visible:ring-1 focus-visible:ring-emerald-500/50"
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
                    </DrawerHeader>

                    {activeInput ? (
                        <div className="flex-1 px-4 py-2 overflow-y-auto">
                            {activeInput === 'from' && (
                                <button
                                    onClick={() => handleSelectNode('current')}
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
                                        onClick={() => handleSelectNode(poi)}
                                        className="w-full flex items-center gap-4 p-3 hover:bg-white/5 rounded-2xl transition-all border-b border-white/5 last:border-0 text-left"
                                    >
                                        <div
                                            className={`w-10 h-10 rounded-full ${bgClass} flex items-center justify-center shrink-0`}>
                                            <Icon className={`${textClass} w-5 h-5`}/>
                                        </div>
                                        <div className="flex flex-col">
                                            <span
                                                className="font-semibold text-[16px] text-white tracking-tight">{t(poi.name)}</span>
                                            {poi.tags && <span
                                                className="text-[12px] text-white/50 capitalize">{poi.tags.join(', ')}</span>}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex-1 p-6 flex flex-col justify-end">
                            <Button
                                onClick={handleStart}
                                disabled={!fromNode || !toNode}
                                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl py-7 text-lg font-bold shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-50 disabled:shadow-none"
                            >
                                <Navigation className="w-5 h-5 mr-2"/>
                                Start Navigation
                            </Button>
                        </div>
                    )}
                </div>
            </DrawerContent>
        </Drawer>
    );
}
