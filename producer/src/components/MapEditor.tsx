import {useEffect, useMemo, useRef, useState} from 'react';
import MapGL, {Layer, Marker, Source} from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

setWorkerUrl(workerUrl);
import * as turf from '@turf/turf';
import type * as GeoJSON from 'geojson';
import {toast} from 'sonner';
import {AlertTriangle, Crosshair, DoorClosed, Gem, HeartHandshake, Check} from 'lucide-react';
import {BaseModal} from '@wayontop/ui/components/BaseModal';

import {MapNodeMarker} from '@wayontop/ui/components/MapNodeMarker';
import {ProducerToast} from '@wayontop/ui/components/ui/ProducerToast.tsx';

import {CameraView} from './CameraView';
import {TopNavigationBar} from './map/TopNavigationBar';
import {MapFloatingControls} from './map/MapFloatingControls';
import {PiPCamera} from './PiPCamera';
import {MapBottomBar} from './map/MapBottomBar';
import {EditorPanels} from './map/EditorPanels';
import {distanceInMeters, findShortestPath} from '@wayontop/ui/lib/routing';
import {type GraphEdge, type GraphNode} from '@wayontop/ui/lib/types';
import type {Venue} from '../hooks/useVenues';
import {useGraph} from '../hooks/useGraph';
import {useGeolocation} from '../hooks/useGeolocation';
import {useMapEditorState} from '../hooks/useMapEditorState';
import {MapPin} from 'lucide-react';
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
    'line-color': [
        'case', 
        ['boolean', ['get', 'isSelected'], false], '#f59e0b', 
        ['boolean', ['get', 'is_hidden'], false], '#fb923c',
        '#3b82f6'
    ],
    'line-width': ['case', ['boolean', ['get', 'isSelected'], false], 12, 8],
    'line-opacity': 0.3
};
const ROUND_LAYOUT: any = {'line-cap': 'round', 'line-join': 'round'};
const EDGES_CORE_PAINT_VIEW: any = {
    'line-color': [
        'case', 
        ['boolean', ['get', 'isSelected'], false], '#fbbf24', 
        ['boolean', ['get', 'is_hidden'], false], '#f97316',
        '#60a5fa'
    ],
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
    ['get', 'type'], // 'type' is set via properties in the geojson generator below
    'poi', '#fbbf24',
    'stamp', '#e879f9',
    'gate', '#34d399',
    'utility_major', '#fb7185',
    'intersection', '#60a5fa',
    '#94a3b8'
];

const FILLED_SPONSORS_PAINT: any = {'fill-color': SPONSOR_FILL_COLOR, 'fill-opacity': 0.25};
const FILLED_SPONSORS_OUTLINE_PAINT: any = {'line-color': SPONSOR_FILL_COLOR, 'line-width': 2};

const OPEN_SPONSORS_PAINT: any = {'fill-color': '#ffffff', 'fill-opacity': 0.3};
const OPEN_SPONSORS_OUTLINE_PAINT: any = {'line-color': '#ffffff', 'line-width': 2, 'line-dasharray': [4, 4]};

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
    const [selectedSponsorForModal, setSelectedSponsorForModal] = useState<any>(null);

    const [recording, setRecording] = useState(false);
    const {currentLocation, currentAccuracy, rawTrace, setRawTrace} = useGeolocation(recording, setData);
    const [bearing, setBearing] = useState(0);
    const [pipVisible, setPipVisible] = useState(false);


    const [lassoPoints, setLassoPoints] = useState<[number, number][]>([]);
    const [mergeModalOpen, setMergeModalOpen] = useState(false);
    const [nodesToMerge, setNodesToMerge] = useState<GraphNode[]>([]);
    const [edgeGeometry, setEdgeGeometry] = useState<[number, number][]>([]);

    const [autoLinkLassoPoints, setAutoLinkLassoPoints] = useState<[number, number][]>([]);
    const [autoLinkNodes, setAutoLinkNodes] = useState<GraphNode[]>([]);
    const [autoLinkStartNode, setAutoLinkStartNode] = useState<GraphNode | null>(null);

    useEffect(() => {
        if (mode !== 'auto_link') {
            setAutoLinkLassoPoints([]);
            setAutoLinkNodes([]);
            setAutoLinkStartNode(null);
        }
    }, [mode]);

    useEffect(() => {
        if (!edgeStartNode) setEdgeGeometry([]);
    }, [edgeStartNode]);

    const confirmMerge = () => {
        if (nodesToMerge.length < 2) return;

        const markerNodes = nodesToMerge.filter(n => n.category?.base_type !== 'intersection');
        
        if (markerNodes.length > 1) {
            toast.error('2+ marker nodes cannot be merged');
            setMergeModalOpen(false);
            setNodesToMerge([]);
            setMode('view');
            setLassoPoints([]);
            return;
        }

        let primaryNode = nodesToMerge[0];
        let maxScore = -1;
        for (const n of nodesToMerge) {
            let score = 0;
            if (n.category?.base_type !== 'intersection') score += 10;
            if (n.name && typeof n.name === 'object' && Object.values(n.name).some(v => v.trim() !== '')) score += 5;
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
                let changed = false;
                
                if (idsToRemove.has(from)) { from = primaryId; changed = true; }
                if (idsToRemove.has(to)) { to = primaryId; changed = true; }
                
                if (!changed) return e;
                return {...e, from, to, distance_m: 0}; // distance updated below
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
            
            const updatedUniqueEdges = uniqueEdges.map(e => {
                if (e.distance_m !== 0) return e; // Untouched edges (since we set distance_m: 0 on changed ones)
                
                const n1 = nodesMap.get(e.from);
                const n2 = nodesMap.get(e.to);
                if (n1 && n2) {
                    return {...e, distance_m: distanceInMeters(n1.lat, n1.lng, n2.lat, n2.lng)};
                }
                return e;
            });

            return {...prev, nodes: newNodes, edges: updatedUniqueEdges};
        });

        setMergeModalOpen(false);
        setNodesToMerge([]);
        setMode('view');
        setLassoPoints([]);
        toast.success(`Merged ${nodesToMerge.length} nodes into one`);
    };

    const collapsePath = (pathNodes: GraphNode[]) => {
        if (pathNodes.length < 2) return;
        let currentAnchor = pathNodes[0];
        let intermediateGeometry: [number, number][] = [];
        let edgesToAdd: GraphEdge[] = [];
        let nodeIdsToDelete: Set<number> = new Set();

        for (let i = 1; i < pathNodes.length; i++) {
            const node = pathNodes[i];
            const isEnd = (i === pathNodes.length - 1);
            const isIntersection = node.category?.base_type === 'intersection';

            if (isIntersection && !isEnd) {
                intermediateGeometry.push([node.lng, node.lat]);
                nodeIdsToDelete.add(node.id);
            } else {
                let totalDist = 0;
                let prevPt = [currentAnchor.lng, currentAnchor.lat];
                for (const geomPt of intermediateGeometry) {
                    totalDist += distanceInMeters(prevPt[1], prevPt[0], geomPt[1], geomPt[0]);
                    prevPt = geomPt;
                }
                totalDist += distanceInMeters(prevPt[1], prevPt[0], node.lat, node.lng);

                edgesToAdd.push({
                    from: currentAnchor.id,
                    to: node.id,
                    distance_m: Math.round(totalDist),
                    geometry: intermediateGeometry.length > 0 ? [...intermediateGeometry] : undefined
                });

                currentAnchor = node;
                intermediateGeometry = [];
            }
        }

        setData((prev: any) => {
            const newNodes = prev.nodes.filter((n: any) => !nodeIdsToDelete.has(n.id));
            const newEdges = prev.edges.filter((e: any) => !nodeIdsToDelete.has(e.from) && !nodeIdsToDelete.has(e.to));
            
            const edgesToAddKeys = new Set(edgesToAdd.map(e => `${e.from}-${e.to}`));
            const edgesToAddKeysRev = new Set(edgesToAdd.map(e => `${e.to}-${e.from}`));
            
            const finalEdges = newEdges.filter((e: any) => {
                const k1 = `${e.from}-${e.to}`;
                const k2 = `${e.to}-${e.from}`;
                if (edgesToAddKeys.has(k1) || edgesToAddKeys.has(k2) || edgesToAddKeysRev.has(k1) || edgesToAddKeysRev.has(k2)) return false;
                return true;
            });

            return { ...prev, nodes: newNodes, edges: [...finalEdges, ...edgesToAdd] };
        });
        
        toast.success(`Linked path into ${edgesToAdd.length} edge(s) & removed ${nodeIdsToDelete.size} intermediate nodes.`);
        setMode('view');
    };

    const handleAutoLinkLassoConfirm = (points: [number, number][]) => {
        if (points.length < 3) {
            setAutoLinkLassoPoints([]);
            return;
        }

        const polygon = turf.polygon([[...points, points[0]]]);
        const selected = data.nodes.filter(n => {
            const pt = turf.point([n.lng, n.lat]);
            return turf.booleanPointInPolygon(pt, polygon);
        });

        if (selected.length > 1) {
            setAutoLinkNodes(selected);
            setAutoLinkLassoPoints([]);
            toast.info('Select the Start Node from the highlighted area');
        } else {
            toast.error('Select at least two nodes within the drawn area');
            setAutoLinkLassoPoints([]);
        }
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

    const availableTags: string[] = [];

    const handleMapClick = (latlng: { lat: number, lng: number }) => {
        if (mode === 'add_node') {
            const newNode = {
                id: -(Date.now() % 1000000000),
                _clientId: -(Date.now() % 1000000000),
                name: {en: `Node ${data.nodes.length + 1}`, kn: '', hi: ''},
                lat: latlng.lat,
                lng: latlng.lng,
                status: 'active',
                is_paid: false,
                category_id: data.categories[0]?.id || 1,
                category: data.categories[0] || {
                    id: 1,
                    code: 'poi',
                    base_type: 'poi',
                    name: {en: 'POI', kn: '', hi: ''},
                    icon_key: 'MapPin',
                    color_theme: 'cyan',
                    synonyms: {en: [], kn: [], hi: []}
                }
            } as GraphNode & { _clientId: number };
            setData(prev => ({...prev, nodes: [...prev.nodes, newNode]}));
            setMode('view');
        } else if (mode === 'add_edge') {
            if (!edgeStartNode) {
                const newNode = {
                    id: -(Date.now() % 1000000000),
                    _clientId: -(Date.now() % 1000000000),
                    name: {en: `Track ${data.nodes.length + 1}`, kn: '', hi: ''},
                    lat: latlng.lat,
                    lng: latlng.lng,
                    status: 'active',
                    is_paid: false,
                    category_id: 8,
                    category: data.categories.find(c => c.id === 8) || {
                        id: 8,
                        code: 'intersection_default',
                        base_type: 'intersection',
                        name: {en: 'Intersection', kn: '', hi: ''},
                        icon_key: 'Crosshair',
                        color_theme: 'slate',
                        synonyms: {en: [], kn: [], hi: []}
                    }
                } as GraphNode & { _clientId: number };
                setData(prev => ({...prev, nodes: [...prev.nodes, newNode]}));
                setEdgeStartNode(newNode);
                return;
            }
            setEdgeGeometry(prev => [...prev, [latlng.lng, latlng.lat]]);
        } else if (mode === 'merge_nodes') {
            setLassoPoints(prev => [...prev, [latlng.lng, latlng.lat]]);
        } else if (mode === 'auto_link' && autoLinkNodes.length === 0 && !autoLinkStartNode) {
            setAutoLinkLassoPoints(prev => [...prev, [latlng.lng, latlng.lat]]);
        } else {
            setMode('view');
            setSelectedNode(null);
            setSelectedEdge(null);
            setSelectedTrace(null);
            setTestRoutePath(null);
            setEdgeStartNode(null);
            setEdgeGeometry([]);
        }
    };

    const finishPencilTrack = () => {
        if (!edgeStartNode || edgeGeometry.length === 0) return;

        const lastPt = edgeGeometry[edgeGeometry.length - 1];
        const newGeom = edgeGeometry.slice(0, -1);
        
        const endNode = {
            id: -(Date.now() % 1000000000) - 1,
            _clientId: -(Date.now() % 1000000000) - 1,
            name: {en: `Track ${data.nodes.length + 2}`, kn: '', hi: ''},
            lat: lastPt[1],
            lng: lastPt[0],
            status: 'active',
            is_paid: false,
            category_id: 8,
            category: data.categories.find(c => c.id === 8) || {
                id: 8,
                code: 'intersection_default',
                base_type: 'intersection',
                name: {en: 'Intersection', kn: '', hi: ''},
                icon_key: 'Crosshair',
                color_theme: 'slate',
                synonyms: {en: [], kn: [], hi: []}
            }
        } as GraphNode & { _clientId: number };

        let totalDist = 0;
        let prevPt = [edgeStartNode.lng, edgeStartNode.lat];
        for (const pt of newGeom) {
            totalDist += distanceInMeters(prevPt[1], prevPt[0], pt[1], pt[0]);
            prevPt = pt;
        }
        totalDist += distanceInMeters(prevPt[1], prevPt[0], endNode.lat, endNode.lng);
        
        const currentStartNode = data.nodes.find(n => n.id === edgeStartNode.id || (n as any)._clientId === edgeStartNode.id) || edgeStartNode;
        const newEdge: GraphEdge = {
            from: currentStartNode.id, 
            to: endNode.id, 
            distance_m: Math.round(totalDist),
            geometry: newGeom.length > 0 ? newGeom : undefined
        };

        setData(prev => ({
            ...prev, 
            nodes: [...prev.nodes, endNode],
            edges: [...prev.edges, newEdge]
        }));
        
        toast.success(`Track created (${Math.round(totalDist)}m)`);
        setEdgeStartNode(null);
        setEdgeGeometry([]);
        setMode('view');
    };

    const handleAddEdgeModeClick = (node: GraphNode) => {
        if (!edgeStartNode) {
            setEdgeStartNode(node);
            setEdgeGeometry([]);
            return;
        }
        if (edgeStartNode.id !== node.id) {
            const exists = data.edges.some(e =>
                (e.from === edgeStartNode.id && e.to === node.id) ||
                (e.to === edgeStartNode.id && e.from === node.id)
            );
            if (!exists) {
                let totalDist = 0;
                let prevPt = [edgeStartNode.lng, edgeStartNode.lat];
                for (const pt of edgeGeometry) {
                    totalDist += distanceInMeters(prevPt[1], prevPt[0], pt[1], pt[0]);
                    prevPt = pt;
                }
                totalDist += distanceInMeters(prevPt[1], prevPt[0], node.lat, node.lng);
                
                const currentStartNode = data.nodes.find(n => n.id === edgeStartNode.id || (n as any)._clientId === edgeStartNode.id) || edgeStartNode;
                const newEdge: GraphEdge = {
                    from: currentStartNode.id, 
                    to: node.id, 
                    distance_m: Math.round(totalDist),
                    geometry: edgeGeometry.length > 0 ? edgeGeometry : undefined
                };
                setData(prev => ({...prev, edges: [...prev.edges, newEdge]}));
                toast.success(`Edge added (${Math.round(totalDist)}m)`);
            } else {
                toast.error('Edge already exists between these nodes');
            }
        }
        setEdgeStartNode(null);
        setEdgeGeometry([]);
        setMode('view');
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
        if (mode === 'erase') {
            if (node.category?.base_type === 'intersection') {
                if (mapRef.current) {
                    const pt = mapRef.current.project([node.lng, node.lat]);
                    const bbox: [number, number][] = [
                        [pt.x - 10, pt.y - 10],
                        [pt.x + 10, pt.y + 10]
                    ];
                    const features = mapRef.current.queryRenderedFeatures(bbox, { layers: INTERACTIVE_LAYER_IDS });
                    
                    const traceFeature = features.find((f: any) => f.layer.id === 'trace-layer-core' || f.layer.id === 'trace-layer-glow');
                    if (traceFeature) {
                        const {index} = traceFeature.properties as any;
                        deleteTracePoint(index, node.lat, node.lng);
                        return;
                    }

                    const orangeEdge = features.find((f: any) => (f.layer.id === 'edges-core' || f.layer.id === 'edges-glow') && f.properties.is_hidden);
                    if (orangeEdge) {
                        const {from, to} = orangeEdge.properties as any;
                        deleteEdge(from, to);
                        return;
                    }
                }
                deleteNode(node.id);
            } else {
                toast.error('Eraser tool only works on track nodes or paths');
            }
        } else if (mode === 'auto_link') {
            if (autoLinkNodes.length > 0) {
                if (!autoLinkNodes.find(n => n.id === node.id)) {
                    import('sonner').then(m => m.toast.error('Select a node from within the drawn area'));
                    return;
                }
                if (!autoLinkStartNode) {
                    setAutoLinkStartNode(node);
                    import('sonner').then(m => m.toast.info('Select the End Node'));
                } else if (autoLinkStartNode.id !== node.id) {
                    const startPt = turf.point([autoLinkStartNode.lng, autoLinkStartNode.lat]);
                    const endPt = turf.point([node.lng, node.lat]);
                    const line = turf.lineString([startPt.geometry.coordinates, endPt.geometry.coordinates]);

                    const nodesWithProj = autoLinkNodes.map(n => {
                        const pt = turf.point([n.lng, n.lat]);
                        const snapped = turf.nearestPointOnLine(line, pt) as any;
                        return { node: n, t: (snapped.properties?.location || 0) as number };
                    });

                    nodesWithProj.sort((a, b) => a.t - b.t);
                    const sortedNodes = nodesWithProj.map(x => x.node);
                    const idx1 = sortedNodes.findIndex(n => n.id === autoLinkStartNode.id);
                    const idx2 = sortedNodes.findIndex(n => n.id === node.id);
                    const minIdx = Math.min(idx1, idx2);
                    const maxIdx = Math.max(idx1, idx2);
                    const pathNodes = sortedNodes.slice(minIdx, maxIdx + 1);
                    if (idx1 > idx2) pathNodes.reverse();

                    collapsePath(pathNodes);
                }
            } else {
                if (!autoLinkStartNode) {
                    setAutoLinkStartNode(node);
                    import('sonner').then(m => m.toast.info('Select the End Node to path'));
                } else if (autoLinkStartNode.id !== node.id) {
                    const result = findShortestPath(data, autoLinkStartNode.id, node.id);
                    if (result && result.path.length >= 2) {
                        collapsePath(result.path);
                    } else {
                        import('sonner').then(m => m.toast.error('No connected path found between these nodes'));
                        setAutoLinkStartNode(null);
                    }
                }
            }
        } else if (mode === 'add_edge') {
            handleAddEdgeModeClick(node);
        } else if (mode === 'test_route') {
            handleTestRouteModeClick(node);
        } else {
            setSelectedNode(node);
            setSelectedEdge(null);
        }
    };

    const deleteNode = (id: number) => {
        setData(prev => ({
            ...prev,
            nodes: prev.nodes.filter(n => n.id !== id),
            edges: prev.edges.filter(e => e.from !== id && e.to !== id)
        }));
        setSelectedNode(null);
        toast.success('Node deleted');
    };

    const deleteEdge = (from: number, to: number) => {
        setData(prev => ({
            ...prev,
            edges: prev.edges.filter(e => !(e.from === from && e.to === to))
        }));
        setSelectedEdge(null);
        toast.success('Edge deleted');
    };

    const deleteTracePoint = (index: number, clickLat: number, clickLng: number) => {
        if (index === -1) {
            if (rawTrace.length === 0) return;
            let nearestIdx = 0;
            let minDistance = Infinity;
            rawTrace.forEach((pt, i) => {
                const dist = distanceInMeters(clickLat, clickLng, pt.lat, pt.lng);
                if (dist < minDistance) {
                    minDistance = dist;
                    nearestIdx = i;
                }
            });
            const newTrace = [...rawTrace];
            newTrace.splice(nearestIdx, 1);
            setRawTrace(newTrace);
            toast.success('Trace point erased');
        } else {
            setData(prev => {
                if (!prev.rawTraces || !prev.rawTraces[index]) return prev;
                const trace = prev.rawTraces[index];
                let nearestIdx = 0;
                let minDistance = Infinity;
                trace.forEach((pt: any, i: number) => {
                    const dist = distanceInMeters(clickLat, clickLng, pt.lat, pt.lng);
                    if (dist < minDistance) {
                        minDistance = dist;
                        nearestIdx = i;
                    }
                });
                
                const newTraces = [...prev.rawTraces];
                const modifiedTrace = [...trace];
                modifiedTrace.splice(nearestIdx, 1);
                
                if (modifiedTrace.length < 2) {
                    newTraces.splice(index, 1);
                } else {
                    newTraces[index] = modifiedTrace;
                }
                
                return { ...prev, rawTraces: newTraces };
            });
            toast.success('Trace point erased');
        }
    };

    const updateEdge = (from: number, to: number, updates: Partial<GraphEdge>) => {
        setData(prev => ({
            ...prev,
            edges: prev.edges.map(e => (e.from === from && e.to === to) ? { ...e, ...updates } : e)
        }));
        setSelectedEdge(prev => (prev?.from === from && prev?.to === to) ? { ...prev, ...updates } : prev);
    };

    const updateNodePosition = (id: number, lat: number, lng: number) => {
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

    const updateNode = (id: number, updates: Partial<GraphNode>) => {
        setData(prev => ({
            ...prev,
            nodes: prev.nodes.map(n => n.id === id ? {...n, ...updates} : n)
        }));
        setSelectedNode(prev => prev?.id === id ? {...prev, ...updates} : prev);
    };

    const latestFns = useRef({updateNodePosition, handleNodeClick, handleMapClick});
    latestFns.current = {updateNodePosition, handleNodeClick, handleMapClick};

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
            
            const activeSponsors = (data.sponsors || []).filter(s => s.zone_ids?.includes(zone.id));
            const mappedSponsors = activeSponsors.length > 0 
                ? activeSponsors
                : [undefined];
                
            return nodes.flatMap(node => {
                return mappedSponsors.map((mappedSponsor, idx) => {
                    if (node.category?.base_type === 'intersection' && !mappedSponsor?.logo_asset) return null;
                    
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
            const baseType = n.category?.base_type;
            if (!layers.pois && (baseType === 'poi' || baseType === 'stamp' || baseType === 'gate' || baseType === 'utility_major')) return false;
            if (!layers.tracks && baseType === 'intersection') return false;
            
            const isMajorNode = baseType === 'poi' || baseType === 'utility_major' || baseType === 'gate';
            if (!isMajorNode && !showAllPins) return false;

            return true;
        }).map(node => {
            const isSelected = selectedNode?.id === node.id || autoLinkStartNode?.id === node.id || (autoLinkNodes.length > 0 && !!autoLinkNodes.find(n => n.id === node.id));
            const opacity = (mode === 'add_edge' && edgeStartNode?.id === node.id) ? 'opacity-50' : 'opacity-100';
            
            const baseType = node.category?.base_type;
            const isMajorNode = baseType === 'poi' || baseType === 'utility_major' || baseType === 'gate';
            const showThisMarkerName = isMajorNode ? showMajorNames : showAllNames;

            // Simple hack to convert LocalizedText to string for marker title
            const fallbackNameStr = node.name && typeof node.name === 'object' ? Object.values(node.name).find(v => v) : undefined;
            
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
                        type={baseType || 'poi'}
                        category={node.category}
                        name={fallbackNameStr}
                        isZoomedIn={showThisMarkerName}
                        isLabelVisible={visibleLabels.has(node.id)}
                        isSelected={isSelected}
                        opacity={opacity}
                        isPaid={node.is_paid}
                        imageUrl={node.image_url || node.category?.image_url}
                    />
                </Marker>
            );
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data.nodes, layers.pois, layers.tracks, selectedNode, edgeStartNode, autoLinkStartNode, autoLinkNodes, mode, isLocked, showMajorNames, showAllNames, showMajorPins, showAllPins, visibleLabels]);

    const sponsorMarkers = useMemo(() => {
        if (!showSponsorLogos) return null;
        if (!layers.filledSponsors && !layers.openSponsors) return null;

        return sponsorMarkerData.map(({id, lat, lng, mappedSponsor, node}) => {
            const isFilled = isSponsorFilled(mappedSponsor);
            if (!isFilled && !layers.openSponsors) return null;
            if (isFilled && !layers.filledSponsors) return null;

            const type = node.category?.base_type || 'unknown';
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
            } else if (type === 'utility_major') {
                Icon = HeartHandshake;
                textClass = 'text-rose-400';
                bgClass = 'bg-rose-500/20';
                borderClass = 'border-rose-500/50';
                shadowClass = 'shadow-rose-500/20';
            } else if (type === 'intersection') {
                Icon = Crosshair;
                textClass = 'text-blue-400';
                bgClass = 'bg-blue-500/20';
                borderClass = 'border-blue-500/50';
                shadowClass = 'shadow-blue-500/20';
            }

            if (type === 'intersection' && !mappedSponsor?.logo_asset) {
                return null;
            }

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
    }, [sponsorMarkerData, layers.filledSponsors, layers.openSponsors, showSponsorLogos]);

    const edgesGeoJSON = useMemo<GeoJSON.FeatureCollection>(() => {
        const features = data.edges.map(edge => {
            const start = data.nodes.find(n => n.id === edge.from);
            const end = data.nodes.find(n => n.id === edge.to);
            if (!start || !end) return null;
            const isSelected = selectedEdge?.from === edge.from && selectedEdge?.to === edge.to;
            const coords = [[start.lng, start.lat], ...(edge.geometry || []), [end.lng, end.lat]];
            return {
                type: 'Feature',
                properties: {...edge, isSelected},
                geometry: {type: 'LineString', coordinates: coords}
            };
        }).filter(Boolean) as GeoJSON.Feature[];

        if (mode === 'add_edge' && edgeStartNode && edgeGeometry.length > 0) {
            const coords = [[edgeStartNode.lng, edgeStartNode.lat], ...edgeGeometry];
            features.push({
                type: 'Feature',
                properties: { isSelected: true, isTemp: true },
                geometry: { type: 'LineString', coordinates: coords }
            });
        }

        return { type: 'FeatureCollection', features };
    }, [data.edges, data.nodes, selectedEdge, mode, edgeStartNode, edgeGeometry]);

    const selectedEdgeFull = useMemo(() => {
        if (!selectedEdge) return null;
        return data.edges.find(e => e.from === selectedEdge.from && e.to === selectedEdge.to);
    }, [selectedEdge, data.edges]);

    const testRouteGeoJSON = useMemo<GeoJSON.FeatureCollection>(() => {
        const features: GeoJSON.Feature[] = [];
        if (testRoutePath) {
            let currentCoords: number[][] = [];
            for (let i = 0; i < testRoutePath.path.length; i++) {
                const node = testRoutePath.path[i];
                if (currentCoords.length === 0) currentCoords.push([node.lng, node.lat]);
                if (i < testRoutePath.path.length - 1) {
                    const nextNode = testRoutePath.path[i + 1];
                    const edge = data.edges.find(e => 
                        (e.from === node.id && e.to === nextNode.id) || 
                        (e.from === nextNode.id && e.to === node.id)
                    );
                    if (edge?.geometry && edge.geometry.length > 0) {
                        const firstGeoPoint = edge.geometry[0];
                        const lastGeoPoint = edge.geometry[edge.geometry.length - 1];
                        const d1 = Math.hypot(firstGeoPoint[0] - node.lng, firstGeoPoint[1] - node.lat);
                        const d2 = Math.hypot(lastGeoPoint[0] - node.lng, lastGeoPoint[1] - node.lat);
                        const geomToAdd = d2 < d1 ? [...edge.geometry].reverse() : edge.geometry;
                        currentCoords.push(...geomToAdd);
                    }
                    currentCoords.push([nextNode.lng, nextNode.lat]);
                }
            }
            if (currentCoords.length > 1) {
                features.push({
                    type: 'Feature',
                    properties: {},
                    geometry: { type: 'LineString', coordinates: currentCoords }
                });
            }
        }
        return { type: 'FeatureCollection', features };
    }, [testRoutePath, data.edges]);


    const filledSponsorsGeoJSON = useMemo<GeoJSON.FeatureCollection>(() => ({
        type: 'FeatureCollection',
        features: (data.sponsorZones || []).filter(z => {
            const sponsors = (data.sponsors || []).filter(s => s.zone_ids?.includes(z.id));
            return sponsors.some(sp => isSponsorFilled(sp));
        }).flatMap(zone => {
            const nodes = data.nodes.filter(n => zone.poi_ids?.includes(n.id) || n.id === zone.poi_id);
            const sponsors = (data.sponsors || []).filter(s => s.zone_ids?.includes(zone.id));
            const names = sponsors.map(s => s.name).filter(Boolean);
            const title = names.length > 0 ? names.join(', ') : zone.name || 'Unnamed';
            
            return nodes.map(node => turf.circle([node.lng, node.lat], zone.radius_m, {
                steps: 64,
                units: 'meters',
                properties: {name: title, radius: zone.radius_m, type: node.category?.base_type}
            }));
        }).filter(Boolean) as GeoJSON.Feature[]
    }), [data.sponsorZones, data.sponsors, data.nodes]);

    const openSponsorsGeoJSON = useMemo<GeoJSON.FeatureCollection>(() => ({
        type: 'FeatureCollection',
        features: (data.sponsorZones || []).filter(z => {
            const sponsors = (data.sponsors || []).filter(s => s.zone_ids?.includes(z.id));
            if (sponsors.length === 0) return true;
            return !sponsors.some(sp => isSponsorFilled(sp));
        }).flatMap(zone => {
            const nodes = data.nodes.filter(n => zone.poi_ids?.includes(n.id) || n.id === zone.poi_id);
            const sponsors = (data.sponsors || []).filter(s => s.zone_ids?.includes(zone.id));
            const names = sponsors.map(s => s.name).filter(Boolean);
            const title = names.length > 0 ? names.join(', ') : zone.name || 'Unnamed';

            return nodes.map(node => turf.circle([node.lng, node.lat], zone.radius_m, {
                steps: 64,
                units: 'meters',
                properties: {name: title, radius: zone.radius_m, type: node.category?.base_type}
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
                        if (mode === 'erase') {
                            const traceFeature = e.features?.find(f => f.layer.id === 'trace-layer-core' || f.layer.id === 'trace-layer-glow');
                            if (traceFeature) {
                                const {index} = traceFeature.properties as any;
                                deleteTracePoint(index, e.lngLat.lat, e.lngLat.lng);
                                return;
                            }
                            
                            const orangeEdge = e.features?.find(f => (f.layer.id === 'edges-core' || f.layer.id === 'edges-glow') && f.properties.is_hidden);
                            if (orangeEdge) {
                                const {from, to} = orangeEdge.properties as any;
                                deleteEdge(from, to);
                                return;
                            }

                            let nearestNode: GraphNode | null = null;
                            let minDist = 20;
                            if (mapRef.current) {
                                for (const n of data.nodes) {
                                    if (n.category?.base_type === 'intersection') {
                                        const pNode = mapRef.current.project([n.lng, n.lat]);
                                        const dist = Math.sqrt(Math.pow(pNode.x - e.point.x, 2) + Math.pow(pNode.y - e.point.y, 2));
                                        if (dist < minDist) {
                                            minDist = dist;
                                            nearestNode = n;
                                        }
                                    }
                                }
                            }

                            if (nearestNode) {
                                deleteNode(nearestNode.id);
                                return;
                            }

                            const blueEdge = e.features?.find(f => (f.layer.id === 'edges-core' || f.layer.id === 'edges-glow') && !f.properties.is_hidden);
                            if (blueEdge) {
                                const {from, to} = blueEdge.properties as any;
                                deleteEdge(from, to);
                                return;
                            }
                            
                            return;
                        }
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
                        latestFns.current.handleMapClick({lat: e.lngLat.lat, lng: e.lngLat.lng});
                    }}
                    interactiveLayerIds={['view', 'erase'].includes(mode) ? INTERACTIVE_LAYER_IDS : []}
                >
                    {currentLocation && (
                        <Marker longitude={currentLocation.lng} latitude={currentLocation.lat} anchor="center">
                            <div className="w-4 h-4 bg-red-500 border-2 border-white rounded-full shadow-md">
                                <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-50"/>
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

                    {showRoutes && layers.paths && (data.edges.length > 0 || (mode === 'add_edge' && edgeGeometry.length > 0)) && (
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

                    {autoLinkLassoPoints.length > 0 && mode === 'auto_link' && autoLinkNodes.length === 0 && (
                        <Marker
                            longitude={autoLinkLassoPoints[0][0]}
                            latitude={autoLinkLassoPoints[0][1]}
                            anchor="center"
                            onClick={(e) => {
                                e.originalEvent.stopPropagation();
                                if (autoLinkLassoPoints.length >= 3) {
                                    handleAutoLinkLassoConfirm(autoLinkLassoPoints);
                                } else {
                                    import('sonner').then(m => m.toast.error('You need at least 3 points to form an area'));
                                }
                            }}
                        >
                            <div
                                className="w-5 h-5 bg-fuchsia-500 border-2 border-white rounded-full shadow-[0_0_10px_rgba(217,70,239,0.8)] animate-pulse cursor-pointer flex items-center justify-center"
                                title="Click to close area">
                                <div className="w-2 h-2 bg-white rounded-full"/>
                            </div>
                        </Marker>
                    )}
                    {autoLinkLassoPoints.length > 1 && mode === 'auto_link' && autoLinkNodes.length === 0 && autoLinkLassoPoints.slice(1).map((pt, i) => (
                        <Marker key={`auto-lasso-pt-${i}`} longitude={pt[0]} latitude={pt[1]} anchor="center">
                            <div
                                className="w-3 h-3 bg-fuchsia-400 border-2 border-white rounded-full shadow-md pointer-events-none"/>
                        </Marker>
                    ))}
                    {autoLinkLassoPoints.length > 1 && mode === 'auto_link' && autoLinkNodes.length === 0 && (
                        <Source id="auto-lasso-source" type="geojson" data={{
                            type: 'FeatureCollection',
                            features: [
                                {
                                    type: 'Feature',
                                    properties: {},
                                    geometry: {type: 'LineString', coordinates: autoLinkLassoPoints}
                                },
                                ...(autoLinkLassoPoints.length >= 3 ? [{
                                    type: 'Feature',
                                    properties: {isFill: true},
                                    geometry: {type: 'Polygon', coordinates: [[...autoLinkLassoPoints, autoLinkLassoPoints[0]]]}
                                }] : [])
                            ]
                        } as any}>
                            <Layer id="auto-lasso-line" type="line" filter={['!has', 'isFill']}
                                   paint={{'line-color': '#d946ef', 'line-width': 2, 'line-dasharray': [2, 2]}}/>
                            <Layer id="auto-lasso-fill" type="fill" filter={['has', 'isFill']}
                                   paint={{'fill-color': '#d946ef', 'fill-opacity': 0.2}}/>
                        </Source>
                    )}

                    {selectedEdgeFull && !isLocked && mode === 'view' && (
                        (() => {
                            const startNode = data.nodes.find(n => n.id === selectedEdgeFull.from);
                            const endNode = data.nodes.find(n => n.id === selectedEdgeFull.to);
                            if (!startNode || !endNode) return null;

                            const geom = selectedEdgeFull.geometry || [];
                            const fullPath = [
                                [startNode.lng, startNode.lat],
                                ...geom,
                                [endNode.lng, endNode.lat]
                            ];

                            const markers = [];
                            
                            geom.forEach((pt, i) => {
                                markers.push(
                                    <Marker
                                        key={`geom-pt-${i}`}
                                        longitude={pt[0]}
                                        latitude={pt[1]}
                                        draggable
                                        onDragEnd={(e) => {
                                            const newGeom = [...geom];
                                            newGeom[i] = [e.lngLat.lng, e.lngLat.lat];
                                            
                                            let totalDist = 0;
                                            let prev = [startNode.lng, startNode.lat];
                                            for(const g of newGeom) {
                                                totalDist += distanceInMeters(prev[1], prev[0], g[1], g[0]);
                                                prev = g;
                                            }
                                            totalDist += distanceInMeters(prev[1], prev[0], endNode.lat, endNode.lng);

                                            updateEdge(selectedEdgeFull.from, selectedEdgeFull.to, { geometry: newGeom, distance_m: Math.round(totalDist) });
                                        }}
                                        onClick={(e) => {
                                            e.originalEvent.stopPropagation();
                                            const newGeom = [...geom];
                                            newGeom.splice(i, 1);
                                            
                                            let totalDist = 0;
                                            let prev = [startNode.lng, startNode.lat];
                                            for(const g of newGeom) {
                                                totalDist += distanceInMeters(prev[1], prev[0], g[1], g[0]);
                                                prev = g;
                                            }
                                            totalDist += distanceInMeters(prev[1], prev[0], endNode.lat, endNode.lng);

                                            updateEdge(selectedEdgeFull.from, selectedEdgeFull.to, { geometry: newGeom, distance_m: Math.round(totalDist) });
                                        }}
                                    >
                                        <div className="w-4 h-4 bg-white border-4 border-emerald-500 rounded-full shadow-md cursor-grab active:cursor-grabbing hover:scale-125 transition-transform" title="Drag to move, Click to delete" />
                                    </Marker>
                                );
                            });

                            for (let i = 0; i < fullPath.length - 1; i++) {
                                const p1 = fullPath[i];
                                const p2 = fullPath[i+1];
                                const midLng = (p1[0] + p2[0]) / 2;
                                const midLat = (p1[1] + p2[1]) / 2;

                                markers.push(
                                    <Marker
                                        key={`geom-mid-${i}`}
                                        longitude={midLng}
                                        latitude={midLat}
                                        draggable
                                        onDragEnd={(e) => {
                                            const newGeom = [...geom];
                                            newGeom.splice(i, 0, [e.lngLat.lng, e.lngLat.lat]);
                                            
                                            let totalDist = 0;
                                            let prev = [startNode.lng, startNode.lat];
                                            for(const g of newGeom) {
                                                totalDist += distanceInMeters(prev[1], prev[0], g[1], g[0]);
                                                prev = g;
                                            }
                                            totalDist += distanceInMeters(prev[1], prev[0], endNode.lat, endNode.lng);

                                            updateEdge(selectedEdgeFull.from, selectedEdgeFull.to, { geometry: newGeom, distance_m: Math.round(totalDist) });
                                        }}
                                    >
                                        <div className="w-3 h-3 bg-white/60 border-2 border-emerald-500/60 rounded-full cursor-grab hover:bg-white hover:border-emerald-500 hover:scale-125 transition-all shadow-sm" title="Drag to add point" />
                                    </Marker>
                                );
                            }

                            return markers;
                        })()
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
                categories={data.categories || []}
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

            {mode === 'add_edge' && (
                <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-300">
                    {!edgeStartNode && (
                        <ProducerToast
                            message="Tap to start"
                        />
                    )}
                    {edgeStartNode && edgeGeometry.length === 0 && (
                        <ProducerToast
                            message="Draw or connect"
                        />
                    )}
                    {edgeStartNode && edgeGeometry.length > 0 && (
                        <div onClick={finishPencilTrack} className="cursor-pointer">
                            <ProducerToast
                                message="Tap to end"
                                icon={<Check className="w-4 h-4" />}
                                className="pointer-events-auto cursor-pointer hover:bg-emerald-400 transition-colors shadow-[0_0_30px_rgba(16,185,129,0.9)]"
                            />
                        </div>
                    )}
                </div>
            )}

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
                venueKey={currentVenue.key}
            />

            {testingStamp && (
                <CameraView stampName={((testingStamp.name as any)?.en || 'Unknown Stamp') as string} onClose={() => setTestingStamp(null)}/>
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