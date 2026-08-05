import {useEffect, useMemo, useRef, useState} from 'react';
import MapGL, {Layer, Marker, Source} from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import * as turf from '@turf/turf';
import type * as GeoJSON from 'geojson';
import {toast} from 'sonner';
import {ArrowRight, MapPin} from 'lucide-react';

import {SpecialToast} from '@wayontop/ui/components/ui/special-toast';
import {MapNodeMarker} from '@wayontop/ui/components/MapNodeMarker';

import {CameraView} from './CameraView';
import {TopNavigationBar} from './map/TopNavigationBar';
import {MapFloatingControls} from './map/MapFloatingControls';
import {MapBottomBar} from './map/MapBottomBar';
import {EditorPanels} from './map/EditorPanels';
import {distanceInMeters, findShortestPath} from '@wayontop/ui/lib/routing';
import type {GraphEdge, GraphNode} from '@wayontop/ui/lib/types';
import type {Venue} from '../hooks/useVenues';
import {useGraph} from '../hooks/useGraph';
import {useGeolocation} from '../hooks/useGeolocation';
import {useMapEditorState} from '../hooks/useMapEditorState';

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

const INTERACTIVE_LAYER_IDS = ['edges-core', 'edges-glow'];

const EDGES_GLOW_PAINT: any = {
    'line-color': '#6366f1',
    'line-width': ['case', ['boolean', ['get', 'isSelected'], false], 16, 12],
    'line-opacity': ['case', ['boolean', ['get', 'isSelected'], false], 0.3, 0.15]
};
const ROUND_LAYOUT: any = {'line-cap': 'round', 'line-join': 'round'};
const EDGES_CORE_PAINT_VIEW: any = {
    'line-color': ['case', ['boolean', ['get', 'isSelected'], false], '#f59e0b', '#6366f1'],
    'line-width': ['case', ['boolean', ['get', 'isSelected'], false], 6, 4],
    'line-dasharray': [1]
};
const EDGES_CORE_PAINT_ADD: any = {...EDGES_CORE_PAINT_VIEW, 'line-dasharray': [2, 2]};

const TEST_ROUTE_GLOW_PAINT: any = {'line-color': '#10b981', 'line-width': 14, 'line-opacity': 0.3};
const TEST_ROUTE_PAINT: any = {
    'line-color': '#10b981',
    'line-width': 6,
    'line-dasharray': [0.5, 1.5],
    'line-opacity': 0.9
};

const FILLED_SPONSORS_PAINT: any = {'fill-color': '#eab308', 'fill-opacity': 0.25};
const FILLED_SPONSORS_OUTLINE_PAINT: any = {'line-color': '#eab308', 'line-width': 2};

const OPEN_SPONSORS_PAINT: any = {'fill-color': '#64748b', 'fill-opacity': 0.2};
const OPEN_SPONSORS_OUTLINE_PAINT: any = {'line-color': '#94a3b8', 'line-width': 2, 'line-dasharray': [4, 4]};

const TRACE_GLOW_PAINT: any = {
    'line-color': '#ef4444',
    'line-width': 8,
    'line-opacity': 0.2,
    'line-dasharray': [0.1, 1]
};
const TRACE_CORE_PAINT: any = {'line-color': '#ef4444', 'line-width': 3, 'line-opacity': 0.8, 'line-dasharray': [1, 2]};

const isSponsorFilled = (s: any) => !!(s.logo_asset || s.banner_asset || s.video_asset || s.tagline);

export function MapEditor({currentVenue, onBack}: Readonly<{ currentVenue: Venue, onBack: () => void }>) {
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
        setTestingStamp,
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

    const [recording, setRecording] = useState(false);
    const {currentLocation, currentAccuracy, rawTrace, setRawTrace} = useGeolocation(recording, setData);
    const [bearing, setBearing] = useState(0);


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
        } else if (mode === 'view') {
            setSelectedNode(null);
            setSelectedEdge(null);
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
            toast.info(`Start node selected: ${node.name || node.id}. Select destination.`);
            return;
        }
        const result = findShortestPath(data, edgeStartNode.id, node.id);
        if (result) {
            setTestRoutePath(result);
            toast.success(`Route found: ${Math.round(result.totalDistance)}m`);
        } else {
            toast.error('No valid route found between these nodes.');
            setTestRoutePath(null);
        }
        setEdgeStartNode(null);
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

    const isZoomedIn = zoom >= 15;
    const nodeMarkers = useMemo(() => {
        return data.nodes.filter(n => {
            if (!layers.pois && (n.type === 'poi' || n.type === 'stamp' || n.type === 'gate' || n.type === 'facility')) return false;
            return !(!layers.tracks && n.type === 'track');

        }).map(node => {
            const isSelected = selectedNode?.id === node.id;
            const opacity = mode === 'add_edge' && edgeStartNode?.id === node.id ? 'opacity-50' : 'opacity-100';
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
                        isZoomedIn={isZoomedIn}
                        isSelected={isSelected}
                        opacity={opacity}
                    />
                </Marker>
            );
        });
    }, [data.nodes, layers.pois, layers.tracks, selectedNode, edgeStartNode, mode, isLocked, isZoomedIn]);

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
                    interactiveLayerIds={mode === 'view' && !isLocked ? INTERACTIVE_LAYER_IDS : undefined}
                >
                    {currentLocation && (
                        <Marker longitude={currentLocation.lng} latitude={currentLocation.lat} anchor="center">
                            <div className="w-4 h-4 bg-blue-500 border-2 border-white rounded-full shadow-md">
                                <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-50"/>
                            </div>
                        </Marker>
                    )}

                    {nodeMarkers}

                    {layers.paths && data.edges.length > 0 && (
                        <Source id="edges-source" type="geojson" data={edgesGeoJSON}>
                            <Layer id="edges-glow" type="line" paint={EDGES_GLOW_PAINT} layout={ROUND_LAYOUT}/>
                            <Layer id="edges-core" type="line"
                                   paint={mode === 'view' ? EDGES_CORE_PAINT_VIEW : EDGES_CORE_PAINT_ADD}
                                   layout={ROUND_LAYOUT}/>
                        </Source>
                    )}

                    {mode === 'test_route' && testRoutePath && (
                        <Source id="test-route-source" type="geojson" data={testRouteGeoJSON}>
                            <Layer id="test-route-layer-glow" type="line" paint={TEST_ROUTE_GLOW_PAINT}
                                   layout={ROUND_LAYOUT}/>
                            <Layer id="test-route-layer" type="line" paint={TEST_ROUTE_PAINT} layout={ROUND_LAYOUT}/>
                        </Source>
                    )}

                    {layers.filledSponsors && (
                        <Source id="filled-sponsors-source" type="geojson" data={filledSponsorsGeoJSON}>
                            <Layer id="filled-sponsors-layer" type="fill" paint={FILLED_SPONSORS_PAINT}/>
                            <Layer id="filled-sponsors-outline" type="line" paint={FILLED_SPONSORS_OUTLINE_PAINT}/>
                        </Source>
                    )}

                    {layers.openSponsors && (
                        <Source id="open-sponsors-source" type="geojson" data={openSponsorsGeoJSON}>
                            <Layer id="open-sponsors-layer" type="fill" paint={OPEN_SPONSORS_PAINT}/>
                            <Layer id="open-sponsors-outline" type="line" paint={OPEN_SPONSORS_OUTLINE_PAINT}/>
                        </Source>
                    )}

                    {layers.trace && rawTrace.length > 1 && (
                        <Source id="trace-source" type="geojson" data={traceGeoJSON}>
                            <Layer id="trace-layer-glow" type="line" paint={TRACE_GLOW_PAINT} layout={ROUND_LAYOUT}/>
                            <Layer id="trace-layer-core" type="line" paint={TRACE_CORE_PAINT} layout={ROUND_LAYOUT}/>
                        </Source>
                    )}
                </MapGL>
            </div>

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
            />

            <SpecialToast
                visible={mode === 'add_edge'}
                message={edgeStartNode ? 'Select target node' : 'Select start node'}
                icon={<ArrowRight className="w-4 h-4"/>}
            />

            <SpecialToast
                visible={mode === 'add_node'}
                message="Tap map to place the node"
                icon={<MapPin className="w-4 h-4"/>}
            />

            <MapFloatingControls
                mapRef={mapRef}
                bearing={bearing}
                canUndo={canUndo}
                canRedo={canRedo}
                undo={undo}
                redo={redo}
                rawTrace={rawTrace}
                setRawTrace={setRawTrace}
                currentLocation={currentLocation}
                recording={recording}
                setRecording={setRecording}
                mode={mode}
                setMode={setMode}
                setEdgeStartNode={setEdgeStartNode}
            />

            <EditorPanels
                mode={mode}
                setMode={setMode}
                selectedNode={selectedNode}
                setSelectedNode={setSelectedNode}
                selectedEdge={selectedEdge}
                setSelectedEdge={setSelectedEdge}
                deleteNode={deleteNode}
                deleteEdge={deleteEdge}
                updateNode={updateNode}
                isLocked={isLocked}
                newNodeName={newNodeName}
                setNewNodeName={setNewNodeName}
                newNodeType={newNodeType}
                setNewNodeType={setNewNodeType}
                setTestingStamp={setTestingStamp}
            />

            <MapBottomBar
                mode={mode}
                setMode={setMode}
                isLocked={isLocked}
                setIsLocked={setIsLocked}
                setEdgeStartNode={setEdgeStartNode}
                setTestRoutePath={setTestRoutePath}
                setSelectedNode={setSelectedNode}
                setSelectedEdge={setSelectedEdge}
                syncState={syncState}
                saveGraph={saveGraph}
                data={data}
                setData={setData}
            />

            {testingStamp && (
                <CameraView stampName={testingStamp.name || 'Unknown Stamp'} onClose={() => setTestingStamp(null)}/>
            )}
        </div>
    );
}
