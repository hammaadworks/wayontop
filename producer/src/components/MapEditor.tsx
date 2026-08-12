import {useEffect, useMemo, useRef, useState} from 'react';
import MapGL, {Layer, Marker, Source} from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

setWorkerUrl(workerUrl);
import * as turf from '@turf/turf';
import type * as GeoJSON from 'geojson';
import {toast} from 'sonner';
import {AlertTriangle, Crosshair, DoorClosed, Gem, HeartHandshake} from 'lucide-react';
import {BaseModal} from '@wayontop/ui/components/BaseModal';

import {MapNodeMarker} from '@wayontop/ui/components/MapNodeMarker';

import {CameraView} from './CameraView';
import {TopNavigationBar} from './map/TopNavigationBar';
import {MapFloatingControls} from './map/MapFloatingControls';
import {PiPCamera} from './PiPCamera';
import {MapBottomBar} from './map/MapBottomBar';
import {EditorPanels} from './map/EditorPanels';
import {distanceInMeters, findShortestPath} from '@wayontop/ui/lib/routing';
import type {GraphEdge, GraphNode} from '@wayontop/ui/lib/types';
import type {Venue} from '../hooks/useVenues';
import {useGraph} from '../hooks/useGraph';
import {useGeolocation} from '../hooks/useGeolocation';
import {useMapEditorState} from '../hooks/useMapEditorState';
import {Save, Map as MapIcon, RotateCcw, MousePointer2, Plus, PenTool, Trash2, Undo2, MapPin, Navigation, Tag, Loader2, Store, Users, MapPinOff, Layers} from 'lucide-react';
import {SponsorReelsModal} from '@wayontop/ui/components/SponsorReelsModal';
import {PRODUCER_MAP_ZOOM_TIERS} from '@wayontop/ui/lib/constants';
import {useMarkerCollision} from '@wayontop/ui/hooks/useMarkerCollision';

const SATELLITE_STYLE: any = {
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
        source: 'satellite'
    }]
};

const ANIMATED_MAP_STYLE: any = {
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
};

const INTERACTIVE_LAYER_IDS = ['edges-core', 'edges-glow', 'trace-layer-core', 'trace-layer-glow'];

const EDGES_GLOW_PAINT: any = {
    'line-color': ['case', ['boolean', ['get', 'isSelected'], false], '#f59e0b', '#3b82f6'],
    'line-width': ['case', ['boolean', ['get', 'isSelected'], false], 12, 8],
    'line-opacity': 0.3
};
const ROUND_LAYOUT: any = {'line-cap': 'round', 'line-join': 'round'};
const EDGES_CORE_PAINT_VIEW: any = {
    'line-color': ['case', ['boolean', ['get', 'isSelected'], false], '#fbbf24', '#60a5fa'],
    'line-width': ['case', ['boolean', ['get', 'isSelected'], false], 6, 4],
    'line-opacity': 1
};
const EDGES_CORE_PAINT_ADD: any = {...EDGES_CORE_PAINT_VIEW, 'line-dasharray': [2, 2], 'line-opacity': 0.8};

const TEST_ROUTE_GLOW_PAINT: any = {
    'line-color': '#059669',
    'line-width': 16, 
    'line-opacity': 0.4
};
const TEST_ROUTE_PAINT: any = {
    'line-color': '#34d399', 
    'line-width': 8,
    'line-opacity': 1
};

const SPONSOR_FILL_COLOR: any = [
    'match',
    ['get', 'type'],
    'poi', '#fbbf24',
    'stamp', '#e879f9',
    'gate', '#34d399',
    'facility', '#fb7185',
    'track', '#60a5fa',
    '#94a3b8'
];

const FILLED_SPONSORS_PAINT: any = {'fill-color': SPONSOR_FILL_COLOR, 'fill-opacity': 0.25};
const FILLED_SPONSORS_OUTLINE_PAINT: any = {'line-color': SPONSOR_FILL_COLOR, 'line-width': 2};

const OPEN_SPONSORS_PAINT: any = {'fill-color': '#ffffff', 'fill-opacity': 0.3};
const OPEN_SPONSORS_OUTLINE_PAINT: any = {'line-color': '#ffffff', 'line-width': 2, 'line-dasharray': [4, 4]};

const SPONSOR_CIRCUMFERENCE_LAYOUT: any = {
    'symbol-placement': 'line',
    'symbol-spacing': 250,
    'text-field': ['concat', ['get', 'radius'], 'm Zone • '],
    'text-size': 13,
    'text-transform': 'uppercase',
    'text-letter-spacing': 0.2,
    'text-offset': [0, -0.75],
    'text-keep-upright': true
};

const SPONSOR_CIRCUMFERENCE_PAINT: any = {
    'text-color': '#ffffff',
    'text-halo-color': 'rgba(0,0,0,0.8)',
    'text-halo-width': 1.5,
    'text-opacity': 0.8
};

const TRACE_GLOW_PAINT: any = {
    'line-color': '#ef4444',
    'line-width': 14,
    'line-opacity': 0.3
};
const TRACE_CORE_PAINT: any = {
    'line-color': '#f87171', 
    'line-width': 6, 
    'line-opacity': 1
};

const isSponsorFilled = (mappedSponsor: any) => !!(mappedSponsor && (mappedSponsor.logo_asset || mappedSponsor.creative_asset || mappedSponsor.tagline));

export function MapEditor({currentVenue, onBack}: Readonly<{ currentVenue: Venue, onBack: () => void }>) {
    const mapRef = useRef<any>(null);
    const {
        data,
        setData,
        loadingGraph,
        saveGraph,
        syncState,
        undo,
        redo,
        canUndo,
        canRedo,
        timeUntilSync
    } = useGraph(currentVenue);
    const editorState = useMapEditorState();
    const {
        mode,
        setMode,
        selectedNode,
        setSelectedNode,
        selectedEdge,
        setSelectedEdge,
        edgeStartNode, setEdgeStartNode,
        testRoutePath, setTestRoutePath,
        testingStamp, setTestingStamp,
        selectedTrace, setSelectedTrace,
        isLocked,
        setIsLocked
    } = editorState;

    const [layers, setLayers] = useState({
        paths: true,
        pois: true,
        tracks: true,
        filledSponsors: true,
        openSponsors: true,
        trace: true
    });
    const [mapSkin, setMapSkin] = useState<'satellite' | 'animated'>('satellite');
    const [zoom, setZoom] = useState(currentVenue.zoom);
    const [showLayerMenu, setShowLayerMenu] = useState(false);
    const [selectedSponsorForModal, setSelectedSponsorForModal] = useState<any>(null);

    const [recording, setRecording] = useState(false);
    const {currentLocation, currentAccuracy, rawTrace, setRawTrace} = useGeolocation(recording, setData);
    const [bearing, setBearing] = useState(0);
    const [pipVisible, setPipVisible] = useState(false);


    const [lassoPoints, setLassoPoints] = useState<[number, number][]>([]);
    const [mergeModalOpen, setMergeModalOpen] = useState(false);
    const [nodesToMerge, setNodesToMerge] = useState<GraphNode[]>([]);

    const confirmMerge = () => {
        if (nodesToMerge.length < 2) return;

        let primaryNode = nodesToMerge[0];
        let maxScore = -1;
        for (const n of nodesToMerge) {
            let score = 0;
            if (n.type !== 'track') score += 10;
            if (n.name && n.name.trim() !== '') score += 5;
            if (score > maxScore) {
                maxScore = score;
                primaryNode = n;
            }
        }

        const primaryId = primaryNode.id;
        const idsToRemove = new Set(nodesToMerge.map(n => n.id).filter(id => id !== primaryId));

        setData(prev => {
            const newNodes = prev.nodes.filter(n => !idsToRemove.has(n.id));

            let newEdges = prev.edges.map(e => {
                let from = e.from;
                let to = e.to;
                if (idsToRemove.has(from)) from = primaryId;
                if (idsToRemove.has(to)) to = primaryId;
                return {from, to, distance_m: 0}; // distance updated below
            });

            newEdges = newEdges.filter(e => e.from !== e.to);
            const edgeSet = new Set<string>();
            const uniqueEdges: GraphEdge[] = [];
            for (const e of newEdges) {
                const key1 = `${e.from}-${e.to}`;
                const key2 = `${e.to}-${e.from}`;
                if (!edgeSet.has(key1) && !edgeSet.has(key2)) {
                    edgeSet.add(key1);
                    uniqueEdges.push(e);
                }
            }

            const nodesMap = new Map(newNodes.map(n => [n.id, n]));
            uniqueEdges.forEach(e => {
                const n1 = nodesMap.get(e.from);
                const n2 = nodesMap.get(e.to);
                if (n1 && n2) {
                    e.distance_m = distanceInMeters(n1.lat, n1.lng, n2.lat, n2.lng);
                }
            });

            return {...prev, nodes: newNodes, edges: uniqueEdges};
        });

        setMergeModalOpen(false);
        setNodesToMerge([]);
        setMode('view');
        setLassoPoints([]);
        toast.success(`Merged ${nodesToMerge.length} nodes into one`);
    };

    const handleLassoMerge = (points: [number, number][]) => {
        if (points.length < 3) {
            setLassoPoints([]);
            return;
        }

        const polygon = turf.polygon([[...points, points[0]]]);

        const selected = data.nodes.filter(n => {
            const pt = turf.point([n.lng, n.lat]);
            return turf.booleanPointInPolygon(pt, polygon);
        });

        if (selected.length > 1) {
            setNodesToMerge(selected);
            setMergeModalOpen(true);
        } else {
            toast.error('Select at least two nodes to merge within the drawn area');
            setLassoPoints([]);
        }
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

    const availableTags = useMemo(() => {
        const tags = new Set<string>();
        data.nodes.forEach(n => n.tags?.forEach(t => tags.add(t)));
        return Array.from(tags).sort();
    }, [data.nodes]);

    const handleMapClick = (latlng: { lat: number, lng: number }) => {
        if (mode === 'add_node') {
            const newNode: GraphNode = {
                id: `n_${Date.now()}`,
                name: `Node ${data.nodes.length + 1}`,
                lat: latlng.lat,
                lng: latlng.lng,
                type: 'poi',
                tags: []
            };
            setData(prev => ({...prev, nodes: [...prev.nodes, newNode]}));
            setMode('view');
        } else if (mode === 'add_edge') {
            const newNode: GraphNode = {
                id: `n_${Date.now()}`,
                name: '',
                lat: latlng.lat,
                lng: latlng.lng,
                type: 'track',
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
        } else if (mode === 'merge_nodes') {
            setLassoPoints(prev => [...prev, [latlng.lng, latlng.lat]]);
        } else {
            setMode('view');
            setSelectedNode(null);
            setSelectedEdge(null);
            setSelectedTrace(null);
            setTestRoutePath(null);
        }
    };

    const handleAddEdgeModeClick = (node: GraphNode) => {
        if (!edgeStartNode) {
            setEdgeStartNode(node);
            return;
        }
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
    };

    const handleTestRouteModeClick = (node: GraphNode) => {
        if (!edgeStartNode) {
            setEdgeStartNode(node);
            setTestRoutePath(null);
            return;
        }
        const result = findShortestPath(data, edgeStartNode.id, node.id);
        if (result) {
            setTestRoutePath(result);
        } else {
            setTestRoutePath(null);
        }
        setEdgeStartNode(null);
        setMode('view');
    };

    const handleNodeClick = (node: GraphNode) => {
        if (mode === 'add_edge') {
            handleAddEdgeModeClick(node);
        } else if (mode === 'test_route') {
            handleTestRouteModeClick(node);
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

    const updateEdge = (from: string, to: string, updates: Partial<GraphEdge>) => {
        setData(prev => ({
            ...prev,
            edges: prev.edges.map(e => (e.from === from && e.to === to) ? { ...e, ...updates } : e)
        }));
        setSelectedEdge(prev => (prev?.from === from && prev?.to === to) ? { ...prev, ...updates } : prev);
    };

    const updateNodePosition = (id: string, lat: number, lng: number) => {
        setData(prev => {
            const newNodes = prev.nodes.map(n => n.id === id ? {...n, lat, lng} : n);
            const nodesMap = new Map(newNodes.map(n => [n.id, n]));
            const newEdges = prev.edges.map(e => {
                if (e.from !== id && e.to !== id) return e;
                const fromNode = nodesMap.get(e.from);
                const toNode = nodesMap.get(e.to);
                if (!fromNode || !toNode) return e;
                return {...e, distance_m: distanceInMeters(fromNode.lat, fromNode.lng, toNode.lat, toNode.lng)};
            });
            return {...prev, nodes: newNodes, edges: newEdges};
        });
        setSelectedNode(prev => (prev?.id === id) ? {...prev, lat, lng} : prev);
    };

    const updateNode = (id: string, updates: Partial<GraphNode>) => {
        setData(prev => ({
            ...prev,
            nodes: prev.nodes.map(n => n.id === id ? {...n, ...updates} : n)
        }));
        setSelectedNode(prev => prev?.id === id ? {...prev, ...updates} : prev);
    };

    const latestFns = useRef({updateNodePosition, handleNodeClick});
    latestFns.current = {updateNodePosition, handleNodeClick};

    const showVenuePin = zoom < PRODUCER_MAP_ZOOM_TIERS.VENUE_PIN_MAX;
    const showMajorPins = zoom >= PRODUCER_MAP_ZOOM_TIERS.MAJOR_PINS_MIN;
    const showAllPins = zoom >= PRODUCER_MAP_ZOOM_TIERS.ALL_PINS_MIN;
    const showRoutes = zoom >= PRODUCER_MAP_ZOOM_TIERS.ROUTES_MIN;
    const showMajorNames = zoom >= PRODUCER_MAP_ZOOM_TIERS.MAJOR_NAMES_MIN;
    const showAllNames = zoom >= PRODUCER_MAP_ZOOM_TIERS.ALL_NAMES_MIN;
    const showSponsorZones = zoom >= PRODUCER_MAP_ZOOM_TIERS.SPONSOR_ZONES_AND_RADIUS_MIN;
    const showSponsorLogos = zoom >= PRODUCER_MAP_ZOOM_TIERS.SPONSOR_LOGOS_MIN;

    const sponsorMarkerData = useMemo(() => {
        return (data.sponsorZones || []).flatMap(zone => {
            const nodes = data.nodes.filter(n => zone.poi_ids?.includes(n.id) || n.id === zone.poi_id);
            if (nodes.length === 0) return [];
            
            const sponsorIds = zone.sponsor_ids || (zone.sponsor_id ? [zone.sponsor_id] : []);
            const mappedSponsors = sponsorIds.length > 0 
                ? sponsorIds.map(id => (data.sponsors || []).find(s => s.id === id)).filter(Boolean)
                : [undefined];
                
            return nodes.flatMap(node => {
                return mappedSponsors.map((mappedSponsor, idx) => {
                    if (node.type === 'track' && !mappedSponsor?.logo_asset) return null;
                    
                    const hash = `${zone.id}-${node.id}`.split('').reduce((a, b) => {
                        a = ((a << 5) - a) + b.charCodeAt(0);
                        return a & a;
                    }, 0);
                    const randomDist = (Math.abs(hash) % 100) / 100;
                    
                    // Distribute bubbles evenly in a circle to prevent overlap
                    const baseAngle = (360 / mappedSponsors.length) * idx;
                    const angleOffset = (Math.abs(hash) % 30) - 15; // slight random jitter
                    const angle = baseAngle + angleOffset;

                    // Place them at 50% to 80% of the radius to keep them inside the zone but not on dead center
                    const distance_m = zone.radius_m * (0.5 + (randomDist * 0.3));
                    
                    const destination = turf.destination([node.lng, node.lat], distance_m, angle, {units: 'meters'});
                    const [lng, lat] = destination.geometry.coordinates;
                    return { id: `sponsor-${zone.id}-${node.id}-${idx}`, lat, lng, zone, mappedSponsor, node };
                });
            });
        }).filter(Boolean) as any[];
    }, [data.sponsorZones, data.sponsors, data.nodes]);

    const collisionNodes = useMemo(() => [...data.nodes, ...sponsorMarkerData], [data.nodes, sponsorMarkerData]);
    const { visibleLabels, calculateCollisions } = useMarkerCollision(mapRef, collisionNodes, showMajorNames || showSponsorLogos);

    useEffect(() => {
        const raf = requestAnimationFrame(() => calculateCollisions());
        return () => cancelAnimationFrame(raf);
    }, [zoom, collisionNodes, showMajorNames, showAllNames, showSponsorLogos, calculateCollisions]);

    const nodeMarkers = useMemo(() => {
        if (!showMajorPins) return null;
        return data.nodes.filter(n => {
            if (!layers.pois && (n.type === 'poi' || n.type === 'stamp' || n.type === 'gate' || n.type === 'facility')) return false;
            if (!layers.tracks && n.type === 'track') return false;
            
            const isMajorNode = n.type === 'poi' || n.type === 'facility' || n.type === 'gate';
            if (!isMajorNode && !showAllPins) return false;

            return true;
        }).map(node => {
            const isSelected = selectedNode?.id === node.id;
            const opacity = mode === 'add_edge' && edgeStartNode?.id === node.id ? 'opacity-50' : 'opacity-100';
            
            const isMajorNode = node.type === 'poi' || node.type === 'facility' || node.type === 'gate';
            const showThisMarkerName = isMajorNode ? showMajorNames : showAllNames;

            return (
                <Marker
                    key={node.id} longitude={node.lng} latitude={node.lat} anchor="center"
                    draggable={mode === 'view' && !isLocked}
                    onDragEnd={(e) => latestFns.current.updateNodePosition(node.id, e.lngLat.lat, e.lngLat.lng)}
                    onClick={(e) => {
                        e.originalEvent.stopPropagation();
                        latestFns.current.handleNodeClick(node);
                    }}
                >
                    <MapNodeMarker
                        type={node.type}
                        name={node.name}
                        isZoomedIn={showThisMarkerName}
                        isLabelVisible={visibleLabels.has(node.id)}
                        isSelected={isSelected}
                        opacity={opacity}
                        tags={node.tags}
                    />
                </Marker>
            );
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data.nodes, layers.pois, layers.tracks, selectedNode, edgeStartNode, mode, isLocked, showMajorNames, showAllNames, showMajorPins, showAllPins, visibleLabels]);

    const sponsorMarkers = useMemo(() => {
        if (!showSponsorLogos) return null;
        if (!layers.filledSponsors && !layers.openSponsors) return null;

        return sponsorMarkerData.map(({id, lat, lng, zone, mappedSponsor, node}) => {
            const isFilled = isSponsorFilled(mappedSponsor);
            if (!isFilled && !layers.openSponsors) return null;
            if (isFilled && !layers.filledSponsors) return null;

            const type = node.type || 'unknown';
            let Icon = AlertTriangle;
            let bgClass = 'bg-slate-500/20';
            let textClass = 'text-slate-400';
            let borderClass = 'border-slate-500/50';
            let shadowClass = 'shadow-slate-500/20';

            if (type === 'poi') {
                Icon = MapPin;
                textClass = 'text-amber-400';
                bgClass = 'bg-amber-500/20';
                borderClass = 'border-amber-500/50';
                shadowClass = 'shadow-amber-500/20';
            } else if (type === 'stamp') {
                Icon = Gem;
                textClass = 'text-fuchsia-400';
                bgClass = 'bg-fuchsia-500/20';
                borderClass = 'border-fuchsia-500/50';
                shadowClass = 'shadow-fuchsia-500/20';
            } else if (type === 'gate') {
                Icon = DoorClosed;
                textClass = 'text-emerald-400';
                bgClass = 'bg-emerald-500/20';
                borderClass = 'border-emerald-500/50';
                shadowClass = 'shadow-emerald-500/20';
            } else if (type === 'facility') {
                Icon = HeartHandshake;
                textClass = 'text-rose-400';
                bgClass = 'bg-rose-500/20';
                borderClass = 'border-rose-500/50';
                shadowClass = 'shadow-rose-500/20';
            } else if (type === 'track') {
                Icon = Crosshair;
                textClass = 'text-blue-400';
                bgClass = 'bg-blue-500/20';
                borderClass = 'border-blue-500/50';
                shadowClass = 'shadow-blue-500/20';
            }

            if (type === 'track' && !mappedSponsor?.logo_asset) {
                return null;
            }

            const isLabelVisible = visibleLabels.has(id);
            const displayName = mappedSponsor?.name || zone.name || 'Unnamed';

            return (
                <Marker key={id} longitude={lng} latitude={lat} anchor="center">
                    <div
                        onClick={(e) => {
                            e.stopPropagation();
                            if (mappedSponsor) {
                                setSelectedSponsorForModal(mappedSponsor);
                            }
                        }}
                        className={`relative pointer-events-auto cursor-pointer flex flex-col items-center justify-center transition-all duration-300 z-50 ${showSponsorLogos ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
                        
                        <div className={`rounded-full border shadow-[0_0_20px_rgba(0,0,0,0.5)] backdrop-blur-xl flex items-center justify-center overflow-hidden
                            ${mappedSponsor?.logo_asset ? 'w-12 h-12 bg-black/80' : `p-2 w-10 h-10 ${isFilled ? bgClass : 'bg-black/60'}`} ${borderClass} ${shadowClass}`}>
                            {mappedSponsor?.logo_asset ? (
                                <img src={mappedSponsor.logo_asset} alt="Sponsor Logo"
                                     className="w-full h-full object-cover"/>
                            ) : (
                                <Icon className={`w-5 h-5 ${textClass}`}/>
                            )}
                        </div>
                    </div>
                </Marker>
            );
        });
    }, [sponsorMarkerData, layers.filledSponsors, layers.openSponsors, showSponsorLogos, visibleLabels]);

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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }), [data.edges, data.nodes, selectedEdge]);

    const testRouteGeoJSON = useMemo<GeoJSON.Feature>(() => ({
        type: 'Feature',
        properties: {},
        geometry: {
            type: 'LineString',
            coordinates: testRoutePath ? testRoutePath.path.map((n: any) => [n.lng, n.lat]) : []
        }
    }), [testRoutePath]);


    const filledSponsorsGeoJSON = useMemo<GeoJSON.FeatureCollection>(() => ({
        type: 'FeatureCollection',
        features: (data.sponsorZones || []).filter(z => {
            const sponsorIds = z.sponsor_ids || (z.sponsor_id ? [z.sponsor_id] : []);
            const sponsors = sponsorIds.map(id => (data.sponsors || []).find(s => s.id === id));
            return sponsors.some(sp => isSponsorFilled(sp));
        }).flatMap(zone => {
            const nodes = data.nodes.filter(n => zone.poi_ids?.includes(n.id) || n.id === zone.poi_id);
            const sponsorIds = zone.sponsor_ids || (zone.sponsor_id ? [zone.sponsor_id] : []);
            const names = sponsorIds.map(id => (data.sponsors || []).find(s => s.id === id)?.name).filter(Boolean);
            const title = names.length > 0 ? names.join(', ') : zone.name || 'Unnamed';
            
            return nodes.map(node => turf.circle([node.lng, node.lat], zone.radius_m, {
                steps: 64,
                units: 'meters',
                properties: {name: title, radius: zone.radius_m, type: node.type}
            }));
        }).filter(Boolean) as GeoJSON.Feature[]
    }), [data.sponsorZones, data.sponsors, data.nodes]);

    const openSponsorsGeoJSON = useMemo<GeoJSON.FeatureCollection>(() => ({
        type: 'FeatureCollection',
        features: (data.sponsorZones || []).filter(z => {
            const sponsorIds = z.sponsor_ids || (z.sponsor_id ? [z.sponsor_id] : []);
            if (sponsorIds.length === 0) return true;
            const sponsors = sponsorIds.map(id => (data.sponsors || []).find(s => s.id === id));
            return !sponsors.some(sp => isSponsorFilled(sp));
        }).flatMap(zone => {
            const nodes = data.nodes.filter(n => zone.poi_ids?.includes(n.id) || n.id === zone.poi_id);
            const sponsorIds = zone.sponsor_ids || (zone.sponsor_id ? [zone.sponsor_id] : []);
            const names = sponsorIds.map(id => (data.sponsors || []).find(s => s.id === id)?.name).filter(Boolean);
            const title = names.length > 0 ? names.join(', ') : zone.name || 'Unnamed';

            return nodes.map(node => turf.circle([node.lng, node.lat], zone.radius_m, {
                steps: 64,
                units: 'meters',
                properties: {name: title, radius: zone.radius_m, type: node.type}
            }));
        }).filter(Boolean) as GeoJSON.Feature[]
    }), [data.sponsorZones, data.sponsors, data.nodes]);

    const traceGeoJSON = useMemo<GeoJSON.FeatureCollection>(() => {
        const features: GeoJSON.Feature[] = [];
        if (data.rawTraces) {
            data.rawTraces.forEach((trace: any, idx: number) => {
                if (trace.length > 1) {
                    let totalDistance = 0;
                    for (let i = 1; i < trace.length; i++) {
                        totalDistance += distanceInMeters(trace[i-1].lat, trace[i-1].lng, trace[i].lat, trace[i].lng);
                    }
                    features.push({
                        type: 'Feature',
                        properties: { isTrace: true, index: idx, distance_m: Math.round(totalDistance) },
                        geometry: {type: 'LineString', coordinates: trace.map((t: any) => [t.lng, t.lat])}
                    });
                }
            });
        }
        if (rawTrace.length > 1) {
            let totalDistance = 0;
            for (let i = 1; i < rawTrace.length; i++) {
                totalDistance += distanceInMeters(rawTrace[i-1].lat, rawTrace[i-1].lng, rawTrace[i].lat, rawTrace[i].lng);
            }
            features.push({
                type: 'Feature',
                properties: { isTrace: true, index: -1, distance_m: Math.round(totalDistance) },
                geometry: {type: 'LineString', coordinates: rawTrace.map(t => [t.lng, t.lat])}
            });
        }
        return { type: 'FeatureCollection', features };
    }, [data.rawTraces, rawTrace]);

    return (
        <div className="fixed inset-0 w-full font-sans text-slate-100 overflow-hidden bg-mesh-dark">
            <PiPCamera isVisible={pipVisible} />
            <div className="absolute inset-0 z-0">
                {loadingGraph && (
                    <div
                        className="absolute inset-0 flex items-center justify-center bg-black/50 z-50 backdrop-blur-md">
                        <div
                            className="animate-spin w-10 h-10 border-4 border-white/20 border-t-emerald-500 rounded-full"/>
                    </div>
                )}
                <MapGL
                    ref={mapRef}
                    initialViewState={{
                        longitude: currentVenue.lng,
                        latitude: currentVenue.lat,
                        zoom: currentVenue.zoom,
                        pitch: 0,
                        bearing: 0
                    }}
                    onMove={(e) => {
                        setZoom(e.viewState.zoom);
                        setBearing(e.viewState.bearing);
                    }}
                    mapStyle={mapSkin === 'satellite' ? SATELLITE_STYLE : ANIMATED_MAP_STYLE}
                    style={{width: '100%', height: '100%', zIndex: 0}}
                    pitchWithRotate={true} dragRotate={true} maxPitch={85} maxZoom={22}
                    dragPan={true}
                    onClick={(e) => {
                        if (mode === 'view') {
                            const traceFeature = e.features?.find(f => f.layer.id === 'trace-layer-core' || f.layer.id === 'trace-layer-glow');
                            if (traceFeature) {
                                const {index, distance_m} = traceFeature.properties as any;
                                setSelectedTrace({index, distance_m});
                                setSelectedEdge(null);
                                setSelectedNode(null);
                                return;
                            }
                            const edgeFeature = e.features?.find(f => f.layer.id === 'edges-core' || f.layer.id === 'edges-glow');
                            if (edgeFeature) {
                                const {from, to, distance_m} = edgeFeature.properties as any;
                                setSelectedEdge({from, to, distance_m});
                                setSelectedTrace(null);
                                setSelectedNode(null);
                                return;
                            }
                        }
                        handleMapClick({lat: e.lngLat.lat, lng: e.lngLat.lng});
                    }}
                    interactiveLayerIds={mode === 'view' ? INTERACTIVE_LAYER_IDS : undefined}
                >
                    {currentLocation && (
                        <Marker longitude={currentLocation.lng} latitude={currentLocation.lat} anchor="center">
                            <div className="w-4 h-4 bg-blue-500 border-2 border-white rounded-full shadow-md">
                                <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-50"/>
                            </div>
                        </Marker>
                    )}

                    {showVenuePin && (
                        <Marker longitude={currentVenue.lng} latitude={currentVenue.lat} anchor="center">
                            <div
                                className="flex flex-col items-center justify-center transition-all duration-500 cursor-default pointer-events-none drop-shadow-xl">
                                <div
                                    className="p-4 bg-black/90 backdrop-blur-2xl border border-white/20 shadow-2xl rounded-full mb-3 animate-pulse">
                                    <MapPin
                                        className="w-8 h-8 text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.8)]"/>
                                </div>
                                <span
                                    className="text-lg font-black tracking-widest uppercase drop-shadow-md text-emerald-100 bg-black/80 px-4 py-1.5 rounded-full border border-emerald-500/30">
                                    {currentVenue.name}
                                </span>
                            </div>
                        </Marker>
                    )}

                    {nodeMarkers}
                    {sponsorMarkers}

                    {showRoutes && layers.paths && data.edges.length > 0 && (
                        <Source id="edges-source" type="geojson" data={edgesGeoJSON}>
                            <Layer id="edges-glow" type="line" paint={EDGES_GLOW_PAINT} layout={ROUND_LAYOUT}/>
                            <Layer id="edges-core" type="line"
                                   paint={mode === 'view' ? EDGES_CORE_PAINT_VIEW : EDGES_CORE_PAINT_ADD}
                                   layout={ROUND_LAYOUT}/>
                        </Source>
                    )}

                    {testRoutePath && (
                        <Source id="test-route-source" type="geojson" data={testRouteGeoJSON}>
                            <Layer id="test-route-layer-glow" type="line" paint={TEST_ROUTE_GLOW_PAINT}
                                   layout={ROUND_LAYOUT}/>
                            <Layer id="test-route-layer" type="line" paint={TEST_ROUTE_PAINT} layout={ROUND_LAYOUT}/>
                        </Source>
                    )}

                    {showSponsorZones && layers.filledSponsors && (
                        <Source id="filled-sponsors-source" type="geojson" data={filledSponsorsGeoJSON}>
                            <Layer id="filled-sponsors-layer" type="fill" paint={FILLED_SPONSORS_PAINT}/>
                            <Layer id="filled-sponsors-outline" type="line" paint={FILLED_SPONSORS_OUTLINE_PAINT}/>
                        </Source>
                    )}

                    {showSponsorZones && layers.openSponsors && (
                        <Source id="open-sponsors-source" type="geojson" data={openSponsorsGeoJSON}>
                            <Layer id="open-sponsors-layer" type="fill" paint={OPEN_SPONSORS_PAINT}/>
                            <Layer id="open-sponsors-outline" type="line" paint={OPEN_SPONSORS_OUTLINE_PAINT}/>
                        </Source>
                    )}

                    {layers.trace && traceGeoJSON.features.length > 0 && (
                        <Source id="trace-source" type="geojson" data={traceGeoJSON}>
                            <Layer id="trace-layer-glow" type="line" paint={TRACE_GLOW_PAINT} layout={ROUND_LAYOUT}/>
                            <Layer id="trace-layer-core" type="line" paint={TRACE_CORE_PAINT} layout={ROUND_LAYOUT}/>
                        </Source>
                    )}
                    {lassoPoints.length > 0 && mode === 'merge_nodes' && (
                        <Marker
                            longitude={lassoPoints[0][0]}
                            latitude={lassoPoints[0][1]}
                            anchor="center"
                            onClick={(e) => {
                                e.originalEvent.stopPropagation();
                                if (lassoPoints.length >= 3) {
                                    handleLassoMerge(lassoPoints);
                                } else {
                                    import('sonner').then(m => m.toast.error('You need at least 3 points to form an area'));
                                }
                            }}
                        >
                            <div
                                className="w-5 h-5 bg-indigo-500 border-2 border-white rounded-full shadow-[0_0_10px_rgba(99,102,241,0.8)] animate-pulse cursor-pointer flex items-center justify-center"
                                title="Click to close area">
                                <div className="w-2 h-2 bg-white rounded-full"/>
                            </div>
                        </Marker>
                    )}
                    {lassoPoints.length > 1 && mode === 'merge_nodes' && lassoPoints.slice(1).map((pt, i) => (
                        <Marker key={`lasso-pt-${i}`} longitude={pt[0]} latitude={pt[1]} anchor="center">
                            <div
                                className="w-3 h-3 bg-indigo-400 border-2 border-white rounded-full shadow-md pointer-events-none"/>
                        </Marker>
                    ))}
                    {lassoPoints.length > 1 && mode === 'merge_nodes' && (
                        <Source id="lasso-source" type="geojson" data={{
                            type: 'FeatureCollection',
                            features: [
                                {
                                    type: 'Feature',
                                    properties: {},
                                    geometry: {type: 'LineString', coordinates: lassoPoints}
                                },
                                ...(lassoPoints.length >= 3 ? [{
                                    type: 'Feature',
                                    properties: {isFill: true},
                                    geometry: {type: 'Polygon', coordinates: [[...lassoPoints, lassoPoints[0]]]}
                                }] : [])
                            ]
                        } as any}>
                            <Layer id="lasso-line" type="line" filter={['!has', 'isFill']}
                                   paint={{'line-color': '#6366f1', 'line-width': 2, 'line-dasharray': [2, 2]}}/>
                            <Layer id="lasso-fill" type="fill" filter={['has', 'isFill']}
                                   paint={{'fill-color': '#6366f1', 'fill-opacity': 0.2}}/>
                        </Source>
                    )}
                </MapGL>
            </div>

            <BaseModal
                open={mergeModalOpen}
                onOpenChange={setMergeModalOpen}
                title={<span className="text-indigo-400">Merge Nodes</span>}
                description={`Merge these ${nodesToMerge.length} nodes into a single primary node? All connected paths will be automatically re-routed.`}
                onConfirm={confirmMerge}
                onCancel={() => {
                    setMergeModalOpen(false);
                    setLassoPoints([]);
                }}
                confirmText="Yes, merge them"
                confirmClassName="bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_15px_rgba(79,70,229,0.4)]"
            />

            {/* UI Overlays */}
            <TopNavigationBar
                venueKey={currentVenue.key}
                mapSkin={mapSkin}
                setMapSkin={setMapSkin}
                layers={layers}
                setLayers={setLayers}
                currentAccuracy={currentAccuracy}
                saveGraph={saveGraph}
                onBack={onBack}
                isLocked={isLocked}
                mode={mode}
                setMode={setMode}
                pipVisible={pipVisible}
                togglePip={() => setPipVisible(prev => !prev)}
            />


            <MapFloatingControls
                mapRef={mapRef}
                bearing={bearing}
                canUndo={canUndo}
                canRedo={canRedo}
                undo={undo}
                redo={redo}
                currentLocation={currentLocation}
                recording={recording}
                setRecording={setRecording}
                mode={mode}
                setMode={setMode}
                setEdgeStartNode={setEdgeStartNode}
                isLocked={isLocked}
            />

            <EditorPanels
                mode={mode}
                selectedNode={selectedNode}
                setSelectedNode={setSelectedNode}
                selectedEdge={selectedEdge}
                setSelectedEdge={setSelectedEdge}
                deleteNode={deleteNode}
                deleteEdge={deleteEdge}
                updateEdge={updateEdge}
                updateNode={updateNode}
                isLocked={isLocked}
                setTestingStamp={setTestingStamp}
                testRoutePath={testRoutePath}
                setTestRoutePath={setTestRoutePath}
                availableTags={availableTags}
                selectedTrace={selectedTrace}
                setSelectedTrace={setSelectedTrace}
                deleteTrace={(index) => {
                    if (index === -1) {
                        setRawTrace([]);
                    } else {
                        setData(prev => ({
                            ...prev,
                            rawTraces: prev.rawTraces?.filter((_, i) => i !== index)
                        }));
                    }
                    setSelectedTrace(null);
                }}
            />

            <MapBottomBar
                mode={mode}
                setMode={setMode}
                isLocked={isLocked}
                setIsLocked={setIsLocked}
                edgeStartNode={edgeStartNode}
                setEdgeStartNode={setEdgeStartNode}
                setTestRoutePath={setTestRoutePath}
                setSelectedNode={setSelectedNode}
                setSelectedEdge={setSelectedEdge}
                syncState={syncState}
                saveGraph={saveGraph}
                data={data}
                setData={setData}
                timeUntilSync={timeUntilSync}
            />

            {testingStamp && (
                <CameraView stampName={testingStamp.name || 'Unknown Stamp'} onClose={() => setTestingStamp(null)}/>
            )}

            {(() => {
                const modalSponsors = data.sponsors || [];
                const initialIndex = selectedSponsorForModal 
                    ? Math.max(0, modalSponsors.findIndex(s => s.id === selectedSponsorForModal.id)) 
                    : 0;
                
                return (
                    <SponsorReelsModal
                        isOpen={!!selectedSponsorForModal}
                        onClose={() => setSelectedSponsorForModal(null)}
                        slideItems={modalSponsors.length > 0 ? modalSponsors : (selectedSponsorForModal ? [selectedSponsorForModal] : [])}
                        initialSlideIndex={initialIndex}
                    />
                );
            })()}
        </div>
    );
}
