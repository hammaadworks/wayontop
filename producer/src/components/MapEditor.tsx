import {useEffect, useMemo, useRef, useState} from 'react';
import Map, {Layer, Marker, Source} from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import * as turf from '@turf/turf';
import type * as GeoJSON from 'geojson';
import {toast} from 'sonner';
import {
    AlertCircle,
    ArrowRight,
    Camera,
    Check,
    DoorOpen,
    Eraser,
    GitBranch,
    Layers,
    Loader2,
    LocateFixed,
    MapPin,
    MousePointer2,
    Play,
    Redo2,
    Route,
    Save,
    Square,
    Star,
    Trash2,
    Undo2,
    WifiOff,
    X
} from 'lucide-react';

import {Button} from '@wayontop/ui/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@wayontop/ui/components/ui/card';
import {Input} from '@wayontop/ui/components/ui/input';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@wayontop/ui/components/ui/select';
import {Switch} from '@wayontop/ui/components/ui/switch';
import {Popover, PopoverContent, PopoverTrigger} from '@wayontop/ui/components/ui/popover';

import {CameraView} from './CameraView';
import {SponsorManager} from './SponsorManager';
import {distanceInMeters, findShortestPath} from '@wayontop/ui/lib/routing';
import type {GraphEdge, GraphNode} from '@wayontop/ui/lib/types';
import type {Venue} from '../hooks/useVenues';
import {useGraph} from '../hooks/useGraph';
import {useGeolocation} from '../hooks/useGeolocation';
import {useMapEditorState} from '../hooks/useMapEditorState';

export function MapEditor({currentVenue, onBack}: { currentVenue: Venue, onBack: () => void }) {
    const mapRef = useRef<any>(null);
    const {data, setData, loadingGraph, saveGraph, syncState, undo, redo, canUndo, canRedo} = useGraph(currentVenue);
    const editorState = useMapEditorState();
    const {
        mode,
        setMode,
        selectedNode,
        setSelectedNode,
        selectedEdge,
        setSelectedEdge,
        edgeStartNode,
        setEdgeStartNode,
        testRoutePath,
        setTestRoutePath,
        newNodeName,
        setNewNodeName,
        newNodeType,
        setNewNodeType,
        testingStamp,
        setTestingStamp
    } = editorState;

    const [layers, setLayers] = useState({
        paths: true,
        pois: true,
        junctions: true,
        filledSponsors: true,
        openSponsors: true,
        trace: true
    });
    const [mapSkin, setMapSkin] = useState<'satellite' | 'animated'>('satellite');

    const [recording, setRecording] = useState(false);
    const {currentLocation, rawTrace, setRawTrace} = useGeolocation(recording, setData);
    const [bearing, setBearing] = useState(0);

    const getDirection = (b: number) => {
        const normalized = (b + 360) % 360;
        const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
        return dirs[Math.round(normalized / 45) % 8];
    };

    useEffect(() => {
        if (mapRef.current && currentVenue) {
            mapRef.current.flyTo({
                center: [currentVenue.lng, currentVenue.lat],
                zoom: currentVenue.zoom,
                essential: true
            });
        }
    }, [currentVenue]);

    const handleMapClick = (latlng: { lat: number, lng: number }) => {
        if (mode === 'add_node') {
            const newNode: GraphNode = {
                id: `n_${Date.now()}`,
                name: newNodeName || `Node ${data.nodes.length + 1}`,
                lat: latlng.lat,
                lng: latlng.lng,
                type: newNodeType,
                tags: []
            };
            setData(prev => ({...prev, nodes: [...prev.nodes, newNode]}));
            setNewNodeName('');
            setMode('view');
        } else if (mode === 'add_edge') {
            const newNode: GraphNode = {
                id: `n_${Date.now()}`,
                name: '',
                lat: latlng.lat,
                lng: latlng.lng,
                type: 'junction',
                tags: []
            };
            setData(prev => {
                const newData = {...prev, nodes: [...prev.nodes, newNode]};
                if (edgeStartNode) {
                    const dist = distanceInMeters(edgeStartNode.lat, edgeStartNode.lng, newNode.lat, newNode.lng);
                    newData.edges = [...prev.edges, {from: edgeStartNode.id, to: newNode.id, distance_m: dist}];
                }
                return newData;
            });
            setEdgeStartNode(newNode);
        } else if (mode === 'view') {
            setSelectedNode(null);
            setSelectedEdge(null);
        }
    };

    const handleNodeClick = (node: GraphNode) => {
        if (mode === 'add_edge') {
            if (!edgeStartNode) {
                setEdgeStartNode(node);
            } else {
                if (edgeStartNode.id !== node.id) {
                    const exists = data.edges.some(e =>
                        (e.from === edgeStartNode.id && e.to === node.id) ||
                        (e.to === edgeStartNode.id && e.from === node.id)
                    );
                    if (!exists) {
                        const dist = distanceInMeters(edgeStartNode.lat, edgeStartNode.lng, node.lat, node.lng);
                        const newEdge: GraphEdge = {from: edgeStartNode.id, to: node.id, distance_m: dist};
                        setData(prev => ({...prev, edges: [...prev.edges, newEdge]}));
                        toast.success(`Edge added (${dist}m)`);
                    }
                }
                setEdgeStartNode(node);
            }
        } else if (mode === 'test_route') {
            if (!edgeStartNode) {
                setEdgeStartNode(node);
                setTestRoutePath(null);
                toast.info(`Start node selected: ${node.name || node.id}. Select destination.`);
            } else {
                const result = findShortestPath(data, edgeStartNode.id, node.id);
                if (result) {
                    setTestRoutePath(result);
                    toast.success(`Route found: ${Math.round(result.totalDistance)}m`);
                } else {
                    toast.error('No valid route found between these nodes.');
                    setTestRoutePath(null);
                }
                setEdgeStartNode(null);
            }
        } else {
            setSelectedNode(node);
            setSelectedEdge(null);
        }
    };

    const deleteNode = (id: string) => {
        setData(prev => ({
            ...prev,
            nodes: prev.nodes.filter(n => n.id !== id),
            edges: prev.edges.filter(e => e.from !== id && e.to !== id)
        }));
        setSelectedNode(null);
        toast.success('Node deleted');
    };

    const deleteEdge = (from: string, to: string) => {
        setData(prev => ({
            ...prev,
            edges: prev.edges.filter(e => !(e.from === from && e.to === to))
        }));
        setSelectedEdge(null);
        toast.success('Edge deleted');
    };

    const updateNodePosition = (id: string, lat: number, lng: number) => {
        setData(prev => {
            const newNodes = prev.nodes.map(n => n.id === id ? {...n, lat, lng} : n);
            const newEdges = prev.edges.map(e => {
                if (e.from === id || e.to === id) {
                    const fromNode = newNodes.find(n => n.id === e.from);
                    const toNode = newNodes.find(n => n.id === e.to);
                    if (fromNode && toNode) {
                        return {...e, distance_m: distanceInMeters(fromNode.lat, fromNode.lng, toNode.lat, toNode.lng)};
                    }
                }
                return e;
            });
            return {...prev, nodes: newNodes, edges: newEdges};
        });
        setSelectedNode(prev => (prev && prev.id === id) ? {...prev, lat, lng} : prev);
    };

    const updateNode = (id: string, updates: Partial<GraphNode>) => {
        setData(prev => ({
            ...prev,
            nodes: prev.nodes.map(n => n.id === id ? {...n, ...updates} : n)
        }));
        setSelectedNode(prev => prev && prev.id === id ? {...prev, ...updates} : prev);
    };

    const edgesGeoJSON = useMemo<GeoJSON.FeatureCollection>(() => ({
        type: 'FeatureCollection',
        features: data.edges.map(edge => {
            const start = data.nodes.find(n => n.id === edge.from);
            const end = data.nodes.find(n => n.id === edge.to);
            if (!start || !end) return null;
            const isSelected = selectedEdge?.from === edge.from && selectedEdge?.to === edge.to;
            return {
                type: 'Feature',
                properties: {...edge, isSelected},
                geometry: {type: 'LineString', coordinates: [[start.lng, start.lat], [end.lng, end.lat]]}
            };
        }).filter(Boolean) as GeoJSON.Feature[]
    }), [data.edges, data.nodes, selectedEdge]);

    const testRouteGeoJSON = useMemo<GeoJSON.Feature>(() => ({
        type: 'Feature',
        properties: {},
        geometry: {
            type: 'LineString',
            coordinates: testRoutePath ? testRoutePath.path.map((n: any) => [n.lng, n.lat]) : []
        }
    }), [testRoutePath]);

    const isSponsorFilled = (s: any) => !!(s.logo_asset || s.banner_asset || s.video_asset || s.tagline);

    const filledSponsorsGeoJSON = useMemo<GeoJSON.FeatureCollection>(() => ({
        type: 'FeatureCollection',
        features: data.sponsors.filter(isSponsorFilled).map(sponsor => {
            const node = data.nodes.find(n => n.id === sponsor.poi_id);
            if (!node) return null;
            return turf.circle([node.lng, node.lat], sponsor.radius_m, {steps: 64, units: 'meters'});
        }).filter(Boolean) as GeoJSON.Feature[]
    }), [data.sponsors, data.nodes]);

    const openSponsorsGeoJSON = useMemo<GeoJSON.FeatureCollection>(() => ({
        type: 'FeatureCollection',
        features: data.sponsors.filter(s => !isSponsorFilled(s)).map(sponsor => {
            const node = data.nodes.find(n => n.id === sponsor.poi_id);
            if (!node) return null;
            return turf.circle([node.lng, node.lat], sponsor.radius_m, {steps: 64, units: 'meters'});
        }).filter(Boolean) as GeoJSON.Feature[]
    }), [data.sponsors, data.nodes]);

    const traceGeoJSON = useMemo<GeoJSON.Feature>(() => ({
        type: 'Feature',
        properties: {},
        geometry: {type: 'LineString', coordinates: rawTrace.map(t => [t.lng, t.lat])}
    }), [rawTrace]);

    return (
        <div className="fixed inset-0 w-full font-sans text-slate-100 overflow-hidden bg-mesh-dark">
            <div className="absolute inset-0 z-0">
                {loadingGraph && (
                    <div
                        className="absolute inset-0 flex items-center justify-center bg-black/50 z-50 backdrop-blur-md">
                        <div
                            className="animate-spin w-10 h-10 border-4 border-white/20 border-t-emerald-500 rounded-full"></div>
                    </div>
                )}
                <Map
                    ref={mapRef}
                    initialViewState={{
                        longitude: currentVenue.lng,
                        latitude: currentVenue.lat,
                        zoom: currentVenue.zoom,
                        pitch: 0,
                        bearing: 0
                    }}
                    mapStyle={mapSkin === 'satellite' ? {
                        version: 8,
                        name: "Satellite",
                        sources: {
                            'satellite': {
                                type: 'raster',
                                tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
                                tileSize: 256, maxzoom: 19, scheme: "xyz"
                            }
                        },
                        layers: [{
                            id: 'satellite-base',
                            type: 'raster',
                            source: 'satellite',
                            paint: {
                                "raster-opacity": 1,
                                "raster-contrast": 0.15,
                                "raster-saturation": 0.2,
                                "raster-brightness-min": 0.05,
                                "raster-fade-duration": 300
                            }
                        }]
                    } : {
                        version: 8,
                        name: "Animated Map",
                        sources: {
                            'osm': {
                                type: 'raster',
                                tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
                                tileSize: 256, maxzoom: 19, scheme: "xyz"
                            }
                        },
                        layers: [{
                            id: 'osm-base',
                            type: 'raster',
                            source: 'osm',
                            paint: {
                                "raster-opacity": 1,
                                "raster-saturation": -0.2,
                                "raster-contrast": 0.05,
                                "raster-fade-duration": 300
                            }
                        }]
                    }}
                    style={{width: '100%', height: '100%', zIndex: 0}}
                    pitchWithRotate={true} dragRotate={true} maxPitch={85} maxZoom={22}
                    onMove={(e) => setBearing(e.viewState.bearing)}
                    onClick={(e) => {
                        if (mode === 'view') {
                            const edgeFeature = e.features?.find(f => f.layer.id === 'edges-core' || f.layer.id === 'edges-glow');
                            if (edgeFeature) {
                                const {from, to, distance_m} = edgeFeature.properties as any;
                                setSelectedEdge({from, to, distance_m});
                                setSelectedNode(null);
                                return;
                            }
                        }
                        handleMapClick({lat: e.lngLat.lat, lng: e.lngLat.lng});
                    }}
                    interactiveLayerIds={mode === 'view' ? ['edges-core', 'edges-glow'] : undefined}
                >
                    {currentLocation && (
                        <Marker longitude={currentLocation.lng} latitude={currentLocation.lat} anchor="center">
                            <div className="w-4 h-4 bg-blue-500 border-2 border-white rounded-full shadow-md">
                                <div
                                    className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-50"></div>
                            </div>
                        </Marker>
                    )}

                    {data.nodes.filter(n => {
                        if (!layers.pois && (n.type === 'poi' || n.type === 'stamp' || n.type === 'gate' || n.type === 'amenity')) return false;
                        if (!layers.junctions && n.type === 'junction') return false;
                        return true;
                    }).map(node => {
                        const isSelected = selectedNode?.id === node.id;
                        const color = node.type === 'poi' ? 'bg-amber-500' : node.type === 'stamp' ? 'bg-fuchsia-500' : 'bg-indigo-500';
                        const glow = node.type === 'poi' ? 'shadow-amber-500/50' : node.type === 'stamp' ? 'shadow-fuchsia-500/50' : 'shadow-indigo-500/50';
                        const scale = isSelected ? 'scale-125' : 'scale-100';
                        const border = isSelected ? 'border-[3px] border-white' : 'border-2 border-white/90';
                        const opacity = mode === 'add_edge' && edgeStartNode?.id === node.id ? 'opacity-50' : 'opacity-100';
                        return (
                            <Marker
                                key={node.id} longitude={node.lng} latitude={node.lat} anchor="center"
                                draggable={mode === 'view'}
                                onDragEnd={(e) => updateNodePosition(node.id, e.lngLat.lat, e.lngLat.lng)}
                                onClick={(e) => {
                                    e.originalEvent.stopPropagation();
                                    handleNodeClick(node);
                                }}
                            >
                                <div
                                    className={`relative flex items-center justify-center w-10 h-10 -ml-1 -mt-1 cursor-pointer ${opacity}`}>
                                    <div className={`absolute inset-0 rounded-full ${color} opacity-20`}></div>
                                    <div
                                        className={`relative w-4 h-4 rounded-full ${color} ${border} shadow-lg ${glow} ${scale} transition-all duration-300`}></div>
                                </div>
                            </Marker>
                        );
                    })}

                    {layers.paths && data.edges.length > 0 && (
                        <Source id="edges-source" type="geojson" data={edgesGeoJSON}>
                            <Layer id="edges-glow" type="line" paint={{
                                'line-color': '#6366f1',
                                'line-width': ['case', ['boolean', ['get', 'isSelected'], false], 16, 12],
                                'line-opacity': ['case', ['boolean', ['get', 'isSelected'], false], 0.3, 0.15]
                            }} layout={{'line-cap': 'round', 'line-join': 'round'}}/>
                            <Layer id="edges-core" type="line" paint={{
                                'line-color': ['case', ['boolean', ['get', 'isSelected'], false], '#f59e0b', '#6366f1'],
                                'line-width': ['case', ['boolean', ['get', 'isSelected'], false], 6, 4],
                                'line-dasharray': mode === 'view' ? [1] : [2, 2]
                            }} layout={{'line-cap': 'round', 'line-join': 'round'}}/>
                        </Source>
                    )}

                    {mode === 'test_route' && testRoutePath && (
                        <Source id="test-route-source" type="geojson" data={testRouteGeoJSON}>
                            <Layer id="test-route-layer-glow" type="line"
                                   paint={{'line-color': '#10b981', 'line-width': 14, 'line-opacity': 0.3}}
                                   layout={{'line-cap': 'round', 'line-join': 'round'}}/>
                            <Layer id="test-route-layer" type="line" paint={{
                                'line-color': '#10b981',
                                'line-width': 6,
                                'line-dasharray': [0.5, 1.5],
                                'line-opacity': 0.9
                            }} layout={{'line-cap': 'round', 'line-join': 'round'}}/>
                        </Source>
                    )}

                    {layers.filledSponsors && (
                        <Source id="filled-sponsors-source" type="geojson" data={filledSponsorsGeoJSON}>
                            <Layer id="filled-sponsors-layer" type="fill"
                                   paint={{'fill-color': '#eab308', 'fill-opacity': 0.25}}/>
                            <Layer id="filled-sponsors-outline" type="line"
                                   paint={{'line-color': '#eab308', 'line-width': 2}}/>
                        </Source>
                    )}

                    {layers.openSponsors && (
                        <Source id="open-sponsors-source" type="geojson" data={openSponsorsGeoJSON}>
                            <Layer id="open-sponsors-layer" type="fill"
                                   paint={{'fill-color': '#64748b', 'fill-opacity': 0.2}}/>
                            <Layer id="open-sponsors-outline" type="line"
                                   paint={{'line-color': '#94a3b8', 'line-width': 2, 'line-dasharray': [4, 4]}}/>
                        </Source>
                    )}

                    {layers.trace && rawTrace.length > 1 && (
                        <Source id="trace-source" type="geojson" data={traceGeoJSON}>
                            <Layer id="trace-layer-glow" type="line" paint={{
                                'line-color': '#ef4444',
                                'line-width': 8,
                                'line-opacity': 0.2,
                                'line-dasharray': [0.1, 1]
                            }} layout={{'line-cap': 'round', 'line-join': 'round'}}/>
                            <Layer id="trace-layer-core" type="line" paint={{
                                'line-color': '#ef4444',
                                'line-width': 3,
                                'line-opacity': 0.8,
                                'line-dasharray': [1, 2]
                            }} layout={{'line-cap': 'round', 'line-join': 'round'}}/>
                        </Source>
                    )}
                </Map>
            </div>

            {/* Top Navigation */}
            <div
                className="absolute top-[calc(env(safe-area-inset-top)+1rem)] left-1/2 -translate-x-1/2 z-30 w-[95%] max-w-[420px] pointer-events-none">
                <div
                    className="pointer-events-auto glass-pill p-1.5 shadow-[0_20px_40px_rgba(0,0,0,0.4)] border border-white/10 flex items-center w-full bg-black/60 backdrop-blur-3xl rounded-[2rem]">
                    <div className="flex-1 flex justify-start overflow-hidden">
                        <div
                            className="h-10 px-4 flex items-center hover:bg-emerald-500/10 transition-all rounded-full flex-shrink-0 cursor-pointer group border border-transparent hover:border-emerald-500/20"
                            onClick={() => {
                                saveGraph();
                                onBack();
                            }}>
              <span
                  className="text-xs font-black text-emerald-400 uppercase tracking-widest truncate max-w-[100px] group-hover:text-emerald-300 transition-colors drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]">
                {currentVenue.key}
              </span>
                        </div>
                    </div>
                    <div className="flex-shrink-0 flex justify-center">
                        <div
                            className="flex bg-black/40 backdrop-blur-3xl rounded-full p-1 border border-white/5 shadow-inner mx-auto">
                            <button onClick={() => setMapSkin('satellite')}
                                    className={`px-4 py-1.5 text-xs rounded-full font-bold transition-colors ${mapSkin === 'satellite' ? 'bg-white/20 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}>Sat
                            </button>
                            <button onClick={() => setMapSkin('animated')}
                                    className={`px-4 py-1.5 text-xs rounded-full font-bold transition-colors ${mapSkin === 'animated' ? 'bg-white/20 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}>Map
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 flex justify-end">
                        <Popover>
                            {/* @ts-ignore */}
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon"
                                        className="h-10 w-10 rounded-full bg-white/5 text-slate-300 hover:text-emerald-300 hover:bg-emerald-500/10 flex-shrink-0 transition-all border border-transparent hover:border-emerald-500/20 group">
                                    <Layers className="w-5 h-5 group-hover:drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]"/>
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent
                                className="w-52 p-3 glass-panel bg-black/90 backdrop-blur-3xl border-emerald-500/20 shadow-[0_10px_40px_rgba(0,0,0,0.8)] rounded-2xl text-white pointer-events-auto"
                                align="end" sideOffset={12}>
                                <div className="flex items-center gap-2 px-3 pb-3 border-b border-white/10 mb-3">
                                    <div
                                        className="p-1.5 bg-emerald-500/20 rounded-md border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                                        <Layers className="w-3.5 h-3.5 text-emerald-400 drop-shadow-md"/></div>
                                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Map Layers</span>
                                </div>
                                <div className="space-y-1">
                                    <label
                                        className="flex items-center justify-between px-3 cursor-pointer hover:bg-emerald-500/10 rounded-xl py-1.5 transition-colors group">
                                        <span
                                            className="text-[11px] font-bold text-slate-300 group-hover:text-emerald-400 transition-colors">Points of Interest</span>
                                        <input type="checkbox" checked={layers.pois}
                                               onChange={e => setLayers(l => ({...l, pois: e.target.checked}))}
                                               className="w-3.5 h-3.5 rounded text-emerald-500 bg-black/40 border-white/20 transition-all cursor-pointer"/>
                                    </label>
                                    <label
                                        className="flex items-center justify-between px-3 cursor-pointer hover:bg-emerald-500/10 rounded-xl py-1.5 transition-colors group">
                                        <span
                                            className="text-[11px] font-bold text-slate-300 group-hover:text-emerald-400 transition-colors">Junctions (Hidden)</span>
                                        <input type="checkbox" checked={layers.junctions}
                                               onChange={e => setLayers(l => ({...l, junctions: e.target.checked}))}
                                               className="w-3.5 h-3.5 rounded text-emerald-500 bg-black/40 border-white/20 transition-all cursor-pointer"/>
                                    </label>
                                    <label
                                        className="flex items-center justify-between px-3 cursor-pointer hover:bg-emerald-500/10 rounded-xl py-1.5 transition-colors group">
                                        <span
                                            className="text-[11px] font-bold text-slate-300 group-hover:text-emerald-400 transition-colors">Path Connections</span>
                                        <input type="checkbox" checked={layers.paths}
                                               onChange={e => setLayers(l => ({...l, paths: e.target.checked}))}
                                               className="w-3.5 h-3.5 rounded text-emerald-500 bg-black/40 border-white/20 transition-all cursor-pointer"/>
                                    </label>
                                    <div className="h-px bg-white/10 my-1 mx-3"/>
                                    <label
                                        className="flex items-center justify-between px-3 cursor-pointer hover:bg-emerald-500/10 rounded-xl py-1.5 transition-colors group">
                                        <span
                                            className="text-[11px] font-bold text-amber-300 group-hover:text-amber-400 transition-colors">Filled Sponsor Zones</span>
                                        <input type="checkbox" checked={layers.filledSponsors}
                                               onChange={e => setLayers(l => ({
                                                   ...l,
                                                   filledSponsors: e.target.checked
                                               }))}
                                               className="w-3.5 h-3.5 rounded text-emerald-500 bg-black/40 border-white/20 transition-all cursor-pointer"/>
                                    </label>
                                    <label
                                        className="flex items-center justify-between px-3 cursor-pointer hover:bg-emerald-500/10 rounded-xl py-1.5 transition-colors group">
                                        <span
                                            className="text-[11px] font-bold text-slate-400 group-hover:text-emerald-400 transition-colors">Open Sponsor Slots</span>
                                        <input type="checkbox" checked={layers.openSponsors}
                                               onChange={e => setLayers(l => ({...l, openSponsors: e.target.checked}))}
                                               className="w-3.5 h-3.5 rounded text-emerald-500 bg-black/40 border-white/20 transition-all cursor-pointer"/>
                                    </label>
                                    <div className="h-px bg-white/10 my-1 mx-3"/>
                                    <label
                                        className="flex items-center justify-between px-3 cursor-pointer hover:bg-emerald-500/10 rounded-xl py-1.5 transition-colors group"
                                        title="Shows your live recorded trail">
                                        <span
                                            className="text-[11px] font-bold text-red-300 group-hover:text-red-400 transition-colors">GPS Trace (Recording)</span>
                                        <input type="checkbox" checked={layers.trace}
                                               onChange={e => setLayers(l => ({...l, trace: e.target.checked}))}
                                               className="w-3.5 h-3.5 rounded text-emerald-500 bg-black/40 border-white/20 transition-all cursor-pointer"/>
                                    </label>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>
            </div>

            {mode === 'add_edge' && (
                <div
                    className="absolute top-24 left-1/2 -translate-x-1/2 z-20 bg-indigo-600 text-white px-5 py-2.5 rounded-full shadow-lg text-sm font-medium pointer-events-none flex items-center animate-pulse whitespace-nowrap">
                    <ArrowRight className="w-4 h-4 mr-2 hidden md:inline"/>
                    {edgeStartNode ? 'Select target node' : 'Select start node'}
                </div>
            )}

            {/* Left Floating Action Buttons */}
            <div
                className="absolute bottom-[calc(env(safe-area-inset-bottom)+7rem)] left-4 md:left-6 z-10 flex flex-col gap-2 items-center p-1.5 shadow-[0_20px_40px_rgba(0,0,0,0.5)] border border-white/10 bg-black/60 backdrop-blur-3xl rounded-full">
                <Button variant="ghost" size="icon"
                        className="rounded-full w-10 h-10 flex flex-col items-center justify-center p-0 bg-slate-500/20 hover:bg-slate-500/40 transition-all border border-transparent hover:border-slate-500/30 shadow-[0_0_15px_rgba(100,116,139,0.2)]"
                        onClick={() => {
                            if (mapRef.current) {
                                mapRef.current.easeTo({bearing: 0, pitch: 0, duration: 800});
                            }
                        }}>
                    <span
                        className={`text-[12px] font-black leading-none drop-shadow-md ${getDirection(bearing) === 'N' ? 'text-red-500' : 'text-slate-300'}`}>{getDirection(bearing)}</span>
                    <span
                        className="text-[8px] font-bold leading-none text-emerald-400 mt-0.5 drop-shadow-sm">{Math.round((bearing + 360) % 360)}°</span>
                </Button>
                <Button variant="ghost" size="icon" disabled={!canUndo}
                        className="rounded-full w-10 h-10 bg-slate-500/20 text-slate-300 hover:text-emerald-400 hover:bg-slate-500/40 transition-all border border-transparent hover:border-emerald-500/30 shadow-[0_0_15px_rgba(100,116,139,0.2)] disabled:opacity-30"
                        onClick={undo}>
                    <Undo2 className="w-5 h-5 drop-shadow-md"/>
                </Button>
                <Button variant="ghost" size="icon" disabled={!canRedo}
                        className="rounded-full w-10 h-10 bg-slate-500/20 text-slate-300 hover:text-emerald-400 hover:bg-slate-500/40 transition-all border border-transparent hover:border-emerald-500/30 shadow-[0_0_15px_rgba(100,116,139,0.2)] disabled:opacity-30"
                        onClick={redo}>
                    <Redo2 className="w-5 h-5 drop-shadow-md"/>
                </Button>
            </div>

            {/* Right Floating Action Buttons */}
            <div
                className="absolute bottom-[calc(env(safe-area-inset-bottom)+7rem)] right-4 md:right-6 z-10 flex flex-col gap-2 items-center p-1.5 shadow-[0_20px_40px_rgba(0,0,0,0.5)] border border-white/10 bg-black/60 backdrop-blur-3xl rounded-full">
                {rawTrace.length > 0 && (
                    <Button variant="ghost" size="icon"
                            className="rounded-full w-10 h-10 bg-red-500/20 text-red-400 hover:text-red-300 hover:bg-red-500/40 transition-all border border-transparent hover:border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                            onClick={() => {
                                setRawTrace([]);
                                toast.success('Cleared trace');
                            }}>
                        <Eraser className="w-5 h-5 drop-shadow-md"/>
                    </Button>
                )}
                <Button variant="ghost" size="icon"
                        className="rounded-full w-10 h-10 bg-cyan-500/20 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/40 transition-all border border-transparent hover:border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                        onClick={() => {
                            if (mapRef.current && currentLocation) {
                                mapRef.current.flyTo({
                                    center: [currentLocation.lng, currentLocation.lat],
                                    zoom: 18,
                                    essential: true
                                });
                            } else {
                                toast.error("Waiting for GPS signal...");
                            }
                        }}>
                    <LocateFixed className="w-5 h-5 drop-shadow-md"/>
                </Button>
                <Button variant="ghost" size="icon"
                        className={`rounded-full w-10 h-10 transition-all border ${mode === 'add_edge' ? 'bg-emerald-500 text-white border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.8)]' : 'bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/40 border-transparent hover:border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]'}`}
                        onClick={() => {
                            setMode(mode === 'add_edge' ? 'view' : 'add_edge');
                            setEdgeStartNode(null);
                            setTestRoutePath(null);
                        }}>
                    <Route className="w-5 h-5 drop-shadow-md"/>
                </Button>
                <Button variant="ghost" size="icon"
                        className={`rounded-full w-10 h-10 transition-all border ${!recording ? 'bg-amber-500/20 text-amber-400 hover:text-amber-300 hover:bg-amber-500/40 border-transparent hover:border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'bg-red-500 text-white border-red-400 shadow-[0_0_20px_rgba(239,68,68,0.8)] animate-pulse'}`}
                        onClick={() => {
                            if (recording) {
                                setRecording(false);
                                toast.info('Stopped recording path');
                            } else {
                                setRecording(true);
                                toast.success('Started recording path');
                            }
                        }}>
                    {recording ? <Square className="w-5 h-5 drop-shadow-md"/> :
                        <Play className="w-5 h-5 drop-shadow-md ml-0.5"/>}
                </Button>
            </div>

            {/* Editor Panels */} {selectedNode && mode === 'view' && (
            <div
                className="absolute bottom-[calc(env(safe-area-inset-bottom)+7.5rem)] left-1/2 -translate-x-1/2 w-[calc(100vw-152px)] max-w-[400px] z-20 transition-all duration-300">
                <Card
                    className="shadow-2xl glass-panel border-white/20 bg-[#09090b]/90 backdrop-blur-3xl text-white h-[148px] flex flex-col rounded-2xl overflow-hidden">
                    <CardHeader
                        className="py-2 px-3 flex flex-row items-center justify-between border-b border-white/10 shrink-0 bg-white/5">
                        <CardTitle
                            className="text-xs font-bold flex items-center text-white drop-shadow-md tracking-tight">
                            <MapPin className="w-3.5 h-3.5 mr-1.5 text-emerald-400"/> Edit Node
                        </CardTitle>
                        <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => setSelectedNode(null)}
                                    className="h-6 w-6 text-slate-400 hover:text-white hover:bg-white/10"><X
                                className="w-3.5 h-3.5"/></Button>
                            <Button variant="ghost" size="icon" onClick={() => deleteNode(selectedNode.id)}
                                    className="h-6 w-6 text-red-500 hover:bg-red-500/20"><Trash2
                                className="w-3.5 h-3.5"/></Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-2.5 flex-1 flex flex-col gap-1.5 justify-center">
                        {/* Name Input */}
                        {selectedNode.type !== 'junction' && (
                            <Input value={selectedNode.name}
                                   onChange={e => updateNode(selectedNode.id, {name: e.target.value})}
                                   placeholder="Node Name..."
                                   className="h-7 text-xs font-bold bg-black/60 border-white/10 text-white focus:border-emerald-500/50 transition-colors placeholder:text-slate-500 shadow-inner px-2.5"/>
                        )}

                        {/* Type Segmented Control */}
                        <div className="flex bg-black/40 rounded-md p-0.5 border border-white/10">
                            {['poi', 'stamp', 'gate', 'junction'].map(t => {
                                const icons: Record<string, any> = {
                                    poi: MapPin,
                                    stamp: Star,
                                    gate: DoorOpen,
                                    junction: GitBranch
                                };
                                const styles: Record<string, string> = {
                                    poi: 'amber',
                                    stamp: 'fuchsia',
                                    gate: 'blue',
                                    junction: 'indigo'
                                };
                                const Icon = icons[t];
                                const st = styles[t];
                                const isActive = selectedNode.type === t;
                                return (
                                    <button key={t} onClick={() => updateNode(selectedNode.id, {type: t as any})}
                                            title={t.toUpperCase()}
                                            className={`flex-1 flex justify-center items-center h-7 rounded-sm transition-all ${isActive ? `bg-${st}-500/20 text-${st}-400 shadow-sm border border-${st}-500/30` : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                                        <Icon className="w-3.5 h-3.5"/>
                                    </button>
                                )
                            })}
                        </div>

                        {/* Context Specific Third Row */}
                        {selectedNode.type === 'amenity' && (
                            <Select value={selectedNode.subtype || ''}
                                    onValueChange={(val) => updateNode(selectedNode.id, {subtype: val || undefined})}>
                                <SelectTrigger
                                    className="bg-black/40 border-white/10 text-white h-7 text-[11px] font-bold px-2.5"><SelectValue
                                    placeholder="Select Amenity Type..."/></SelectTrigger>
                                <SelectContent
                                    className="bg-[#09090b] backdrop-blur-2xl border-white/20 text-white z-50">
                                    <SelectItem value="washroom">Washroom</SelectItem>
                                    <SelectItem value="drinking_water">Drinking Water</SelectItem>
                                    <SelectItem value="food">Food</SelectItem>
                                    <SelectItem value="first_aid">First Aid</SelectItem>
                                </SelectContent>
                            </Select>
                        )}
                        {selectedNode.type === 'poi' && (
                            <div
                                className="flex items-center justify-between bg-black/40 border border-white/10 h-7 rounded-md px-2.5">
                                <span className="text-[10px] font-bold text-slate-300">CONTAINS STAMP?</span>
                                <Switch className="scale-[0.65] origin-right" checked={!!selectedNode.has_stamp}
                                        onCheckedChange={(checked: boolean) => updateNode(selectedNode.id, {has_stamp: checked})}/>
                            </div>
                        )}
                        {(selectedNode.type === 'stamp' || selectedNode.has_stamp) && (
                            <Button
                                className="w-full bg-gradient-to-r from-pink-500 to-emerald-500 text-white text-[11px] font-black tracking-widest h-7 border-0 shadow-[0_0_10px_rgba(16,185,129,0.3)] rounded-md"
                                onClick={() => setTestingStamp(selectedNode)}>
                                <Camera className="w-3.5 h-3.5 mr-1.5"/> TEST AR DROP
                            </Button>
                        )}
                    </CardContent>
                </Card>
            </div>
        )}

            {selectedEdge && mode === 'view' && (
                <div
                    className="absolute bottom-[calc(env(safe-area-inset-bottom)+7.5rem)] left-1/2 -translate-x-1/2 w-[calc(100vw-152px)] max-w-[400px] z-20 transition-all duration-300">
                    <Card
                        className="shadow-2xl glass-panel border-white/20 bg-[#09090b]/90 backdrop-blur-3xl text-white h-[148px] flex flex-col rounded-2xl overflow-hidden">
                        <CardHeader
                            className="py-2 px-3 flex flex-row items-center justify-between border-b border-white/10 shrink-0 bg-white/5">
                            <CardTitle
                                className="text-xs font-bold flex items-center text-white drop-shadow-md tracking-tight">
                                <Route className="w-3.5 h-3.5 mr-1.5 text-emerald-400"/> Path Segment
                            </CardTitle>
                            <div className="flex gap-1">
                                <Button variant="ghost" size="icon" onClick={() => setSelectedEdge(null)}
                                        className="h-6 w-6 text-slate-400 hover:text-white hover:bg-white/10"><X
                                    className="w-3.5 h-3.5"/></Button>
                                <Button variant="ghost" size="icon"
                                        onClick={() => deleteEdge(selectedEdge.from, selectedEdge.to)}
                                        className="h-6 w-6 text-red-500 hover:bg-red-500/20"><Trash2
                                    className="w-3.5 h-3.5"/></Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-3 flex-1 flex flex-col items-center justify-center gap-1.5">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Distance
                            </div>
                            <div
                                className="text-4xl font-black text-emerald-400 tracking-tighter drop-shadow-lg leading-none">{selectedEdge.distance_m}<span
                                className="text-xl text-emerald-500/50 ml-0.5">m</span></div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {mode === 'add_node' && (
                <div
                    className="absolute bottom-[calc(env(safe-area-inset-bottom)+7.5rem)] left-1/2 -translate-x-1/2 w-[calc(100vw-152px)] max-w-[400px] z-20 transition-all duration-300">
                    <Card
                        className="shadow-2xl glass-panel border-emerald-500/30 bg-[#09090b]/90 backdrop-blur-3xl text-white h-[148px] flex flex-col rounded-2xl overflow-hidden">
                        <CardHeader
                            className="py-2 px-3 flex flex-row items-center justify-between border-b border-emerald-500/20 shrink-0 bg-emerald-500/10">
                            <div className="flex items-center gap-2">
                                <CardTitle
                                    className="text-xs font-black text-emerald-400 tracking-tight drop-shadow-sm">New
                                    Node</CardTitle>
                                <span
                                    className="text-[9px] font-bold text-slate-400 uppercase border border-white/10 px-1.5 py-0.5 rounded bg-black/40 shadow-inner hidden sm:inline">Tap map</span>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setMode('view')}
                                    className="h-6 w-6 text-slate-400 hover:text-white hover:bg-white/10">
                                <X className="w-3.5 h-3.5"/>
                            </Button>
                        </CardHeader>
                        <CardContent className="p-2.5 flex-1 flex flex-col gap-2 justify-center">
                            <Input value={newNodeName} onChange={e => setNewNodeName(e.target.value)}
                                   placeholder="Node Name (Optional)"
                                   className="h-8 text-xs font-bold bg-black/60 border-white/10 text-white focus:border-emerald-500/50 transition-colors shadow-inner px-2.5"/>

                            <div className="flex bg-black/40 rounded-md p-0.5 border border-white/10">
                                {['poi', 'stamp', 'gate', 'junction'].map(t => {
                                    const icons: Record<string, any> = {
                                        poi: MapPin,
                                        stamp: Star,
                                        gate: DoorOpen,
                                        junction: GitBranch
                                    };
                                    const styles: Record<string, string> = {
                                        poi: 'amber',
                                        stamp: 'fuchsia',
                                        gate: 'blue',
                                        junction: 'indigo'
                                    };
                                    const Icon = icons[t];
                                    const st = styles[t];
                                    const isActive = newNodeType === t;
                                    return (
                                        <button key={t} onClick={() => setNewNodeType(t as any)} title={t.toUpperCase()}
                                                className={`flex-1 flex justify-center items-center h-8 rounded-sm transition-all ${isActive ? `bg-${st}-500/20 text-${st}-400 shadow-sm border border-${st}-500/30` : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                                            <Icon className="w-3.5 h-3.5"/>
                                        </button>
                                    )
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Main Editing Toolbar */}
            <div
                className="absolute bottom-[calc(env(safe-area-inset-bottom)+1rem)] left-1/2 -translate-x-1/2 z-30 w-[95%] max-w-[420px]">
                <div
                    className="glass-pill p-1.5 shadow-[0_20px_40px_rgba(0,0,0,0.4)] border border-white/10 flex justify-between items-center w-full bg-black/60 backdrop-blur-3xl rounded-[2rem]">
                    <Button variant="ghost"
                            className={`rounded-full flex-1 flex flex-col items-center justify-center gap-1 h-16 ${mode === 'view' ? 'bg-emerald-600/20 text-emerald-400' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                            onClick={() => {
                                setMode('view');
                                setEdgeStartNode(null);
                            }}>
                        <MousePointer2 className="w-5 h-5"/> <span className="text-[10px] font-bold">Select</span>
                    </Button>
                    <Button variant="ghost"
                            className={`rounded-full flex-1 flex flex-col items-center justify-center gap-1 h-16 ${mode === 'add_node' ? 'bg-emerald-600/20 text-emerald-400' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                            onClick={() => {
                                setMode('add_node');
                                setEdgeStartNode(null);
                            }}>
                        <MapPin className="w-5 h-5"/> <span className="text-[10px] font-bold">Add Node</span>
                    </Button>

                    <div className="px-1 flex items-center justify-center">
                        {(() => {
                            const buttonConfig = {
                                idle: {
                                    color: 'bg-emerald-600/40 border-emerald-400/20 text-emerald-200 shadow-none hover:bg-emerald-600/50',
                                    icon: Save,
                                    label: 'Saved',
                                    spin: false
                                },
                                unsaved: {
                                    color: 'bg-emerald-600 hover:bg-emerald-500 border-emerald-400/50 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]',
                                    icon: Save,
                                    label: 'Save',
                                    spin: false
                                },
                                saving: {
                                    color: 'bg-amber-500 border-amber-400/50 text-white shadow-[0_0_20px_rgba(245,158,11,0.3)]',
                                    icon: Loader2,
                                    label: 'Saving',
                                    spin: true
                                },
                                saved: {
                                    color: 'bg-green-500 border-green-400/50 text-white shadow-[0_0_20px_rgba(34,197,94,0.3)]',
                                    icon: Check,
                                    label: 'Saved',
                                    spin: false
                                },
                                error: {
                                    color: 'bg-red-600 hover:bg-red-500 border-red-400/50 text-white shadow-[0_0_20px_rgba(220,38,38,0.3)]',
                                    icon: AlertCircle,
                                    label: 'Retry',
                                    spin: false
                                },
                                offline: {
                                    color: 'bg-slate-600 border-slate-400/50 text-white shadow-[0_0_20px_rgba(71,85,105,0.3)]',
                                    icon: WifiOff,
                                    label: 'No Net',
                                    spin: false
                                }
                            }[syncState];
                            const Icon = buttonConfig.icon;

                            return (
                                <Button
                                    onClick={saveGraph}
                                    disabled={syncState === 'saving' || syncState === 'idle' || syncState === 'saved'}
                                    className={`rounded-full h-16 w-16 p-0 border-2 flex flex-col items-center justify-center gap-1 shrink-0 transition-transform hover:scale-105 active:scale-95 ${buttonConfig.color}`}
                                >
                                    <Icon className={`w-6 h-6 ${buttonConfig.spin ? 'animate-spin' : ''}`}/>
                                    <span
                                        className="text-[10px] uppercase font-black leading-none">{buttonConfig.label}</span>
                                </Button>
                            );
                        })()}
                    </div>

                    <SponsorManager data={data} setData={setData}/>

                    <Button variant="ghost"
                            className={`rounded-full flex-1 flex flex-col items-center justify-center gap-1 h-16 ${mode === 'test_route' ? 'bg-emerald-600/20 text-emerald-400' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                            onClick={() => {
                                setMode('test_route');
                                setEdgeStartNode(null);
                                setTestRoutePath(null);
                                toast.info('Select a start node');
                            }}>
                        <ArrowRight className="w-5 h-5"/> <span className="text-[10px] font-bold">Route</span>
                    </Button>
                </div>
            </div>

            {testingStamp && (
                <CameraView stampName={testingStamp.name || 'Unknown Stamp'} onClose={() => setTestingStamp(null)}/>
            )}
        </div>
    );
}
