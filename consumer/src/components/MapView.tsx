import Map, {Layer, Marker, Source} from 'react-map-gl/maplibre';
import {setWorkerUrl} from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import {useEffect, useMemo, useRef, useState} from 'react';
import type * as GeoJSON from 'geojson';
import type {GraphData, GraphNode, Stamp} from '@wayontop/ui/lib/types';
import type {LocationData} from '../hooks/useLocation';
import {Gamification} from '../lib/gamification';
import {findNearestEdgePoint, getRouteCoordinateSegments, distanceInMeters, getEdgeGeometryForDirection} from '@wayontop/ui/lib/routing';
import {MapNodeMarker} from '@wayontop/ui/components/MapNodeMarker';
import {useMarkerCollision} from '@wayontop/ui/hooks/useMarkerCollision';
import {CONSUMER_MAP_ZOOM_TIERS as MAP_ZOOM_TIERS, LALBAGH_GEOFENCE_RADIUS_METERS} from '@wayontop/ui/lib/constants';
import {LocateFixed} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {getNodeName} from '@wayontop/ui/lib/utils';

setWorkerUrl(workerUrl);

const LALBAGH_CENTER = {lat: 12.9500, lng: 77.5850};

type MapViewProps = Readonly<{
    graph: GraphData | null;
    activeRoute: { path: GraphNode[]; totalDistance: number } | null;
    stamps?: Stamp[];
    location: LocationData | null;
    isRadar?: boolean;
    mode?: 'map' | 'satellite' | 'ar';
    onSelectNode?: (node: GraphNode) => void;
    selectedNodeId?: number | null;
}>;

const animatedStyle: any = {
    version: 8,
    name: "Lalbagh Map",
    metadata: {app: "wayon.top Consumer", theme: "animated"},
    sources: {
        'osm': {
            type: 'raster',
            tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '&copy; OpenStreetMap Contributors',
            maxzoom: 18,
            scheme: "xyz"
        }
    },
    layers: [
        {
            id: 'osm-base',
            type: 'raster',
            source: 'osm',
            layout: {visibility: "visible"},
            paint: {
                "raster-opacity": 1,
                "raster-saturation": -0.2,
                "raster-contrast": 0.05,
                "raster-fade-duration": 300
            }
        }
    ]
};

const satelliteStyle: any = {
    version: 8,
    name: "Lalbagh Satellite",
    metadata: {app: "wayon.top Consumer", theme: "satellite"},
    sources: {
        'satellite': {
            type: 'raster',
            tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
            tileSize: 256,
            attribution: '&copy; Esri',
            maxzoom: 19,
            scheme: "xyz"
        }
    },
    layers: [
        {
            id: 'satellite-base',
            type: 'raster',
            source: 'satellite',
            layout: {visibility: "visible"},
            paint: {
                "raster-opacity": 1,
                "raster-contrast": 0.15,
                "raster-saturation": 0.2,
                "raster-brightness-min": 0.05,
                "raster-fade-duration": 300
            }
        }
    ]
};

const ALL_PATHS_PAINT = {
    'line-color': '#eab308',
    'line-width': 3,
    'line-opacity': 0.8
};
const ALL_PATHS_LAYOUT: any = {
    'line-cap': 'round',
    'line-join': 'round'
};

const ROUTE_GLOW_PAINT = {
    'line-color': '#10b981',
    'line-width': 14,
    'line-opacity': 0.3
};
const ROUTE_GLOW_LAYOUT: any = {
    'line-cap': 'round',
    'line-join': 'round'
};

const ROUTE_CORE_PAINT = {
    'line-color': '#34d399',
    'line-width': 6,
    'line-opacity': 1
};
const ROUTE_CORE_LAYOUT: any = {
    'line-cap': 'round',
    'line-join': 'round'
};

export function MapView({graph, activeRoute, stamps = [], location, isRadar = false, mode = 'map', onSelectNode, selectedNodeId}: MapViewProps) {
    const { i18n } = useTranslation();
    const collectedStampIds = Gamification.getCollectedStamps();
    const [activePopup, setActivePopup] = useState<number | null>(null);
    const mapRef = useRef<any>(null);

    // Sync active popup with external selection and fly to it
    useEffect(() => {
        if (selectedNodeId !== undefined) {
            setActivePopup(selectedNodeId);
            if (selectedNodeId !== null && mapRef.current) {
                const node = graph?.nodes.find(n => n.id === selectedNodeId) || stamps.find(s => s.id === selectedNodeId);
                if (node) {
                    mapRef.current.flyTo({
                        center: [node.lng, node.lat],
                        zoom: Math.max(mapRef.current.getZoom(), 18),
                        duration: 1200,
                        essential: true
                    });
                }
            }
        }
    }, [selectedNodeId, graph, stamps]);

    const actualSkin = mode === 'satellite' ? 'satellite' : 'animated';
    const zoomRef = useRef(isRadar ? 16.5 : 16);
    const [zoomTiers, setZoomTiers] = useState({
        showMajorNames: zoomRef.current >= MAP_ZOOM_TIERS.MAJOR_NAMES_MIN,
        showAllNames: zoomRef.current >= MAP_ZOOM_TIERS.ALL_NAMES_MIN,
        showAllPins: zoomRef.current >= MAP_ZOOM_TIERS.ALL_PINS_MIN,
        showMajorPins: zoomRef.current >= MAP_ZOOM_TIERS.MAJOR_PINS_MIN,
    });

    useEffect(() => {
        if (isRadar && location && mapRef.current) {
            mapRef.current.jumpTo({
                center: [location.lng, location.lat],
                zoom: 16.5
            });
            zoomRef.current = 16.5;
            setZoomTiers({
                showMajorNames: 16.5 >= MAP_ZOOM_TIERS.MAJOR_NAMES_MIN,
                showAllNames: 16.5 >= MAP_ZOOM_TIERS.ALL_NAMES_MIN,
                showAllPins: 16.5 >= MAP_ZOOM_TIERS.ALL_PINS_MIN,
                showMajorPins: 16.5 >= MAP_ZOOM_TIERS.MAJOR_PINS_MIN,
            });
        }
    }, [location, isRadar]);

    const nodesAndStamps = useMemo(() => {
        if (!graph) return [];
        const visibleNodes = graph.nodes.filter(n => n.category?.base_type !== 'intersection').map(n => ({
            ...n,
            priority: n.category?.base_type === 'gate' ? 10 : 5
        }));
        const visibleStamps = stamps.filter(s => !collectedStampIds.includes(s.id)).map(s => ({
            ...s,
            priority: 8
        }));
        return [...visibleNodes, ...visibleStamps];
    }, [graph, stamps, collectedStampIds]);

    const {
        visibleLabels,
        calculateCollisions
    } = useMarkerCollision(mapRef, nodesAndStamps, zoomTiers.showMajorNames);

    useEffect(() => {
        calculateCollisions();
    }, [zoomTiers.showMajorNames, nodesAndStamps, calculateCollisions]);

    const routeGeoJSON = useMemo(() => {
        if (!activeRoute || !graph) return null;

        const features = getRouteCoordinateSegments(graph, activeRoute.path).map(coordinates => ({
            type: 'Feature' as const,
            geometry: {type: 'LineString' as const, coordinates},
            properties: {}
        }));

        return {
            type: "FeatureCollection",
            features
        } as GeoJSON.FeatureCollection<GeoJSON.LineString>;
    }, [activeRoute, graph]);

    const allPathsGeoJSON = useMemo(() => {
        if (!graph) return null;
        const features: GeoJSON.Feature<GeoJSON.LineString>[] = [];

        const nodeMap = new globalThis.Map<number, GraphNode>();
        graph.nodes.forEach(n => nodeMap.set(n.id, n));

        graph.edges.forEach(edge => {
            if (!edge.is_hidden) {
                const fromNode = nodeMap.get(edge.from);
                const toNode = nodeMap.get(edge.to);
                if (fromNode && toNode) {
                    const coords = [[fromNode.lng, fromNode.lat], ...getEdgeGeometryForDirection(edge, fromNode), [toNode.lng, toNode.lat]];
                    features.push({
                        type: 'Feature',
                        geometry: {type: 'LineString', coordinates: coords},
                        properties: {}
                    });
                }
            }
        });

        return {
            type: "FeatureCollection",
            features
        } as GeoJSON.FeatureCollection<GeoJSON.LineString>;
    }, [graph]);

    useEffect(() => {
        if (routeGeoJSON && routeGeoJSON.features.length > 0 && mapRef.current) {
            let minLng = Infinity;
            let minLat = Infinity;
            let maxLng = -Infinity;
            let maxLat = -Infinity;
            let hasCoords = false;

            routeGeoJSON.features.forEach(feature => {
                if (feature.geometry.type === 'LineString') {
                    feature.geometry.coordinates.forEach(coord => {
                        minLng = Math.min(minLng, coord[0]);
                        maxLng = Math.max(maxLng, coord[0]);
                        minLat = Math.min(minLat, coord[1]);
                        maxLat = Math.max(maxLat, coord[1]);
                        hasCoords = true;
                    });
                }
            });

            if (hasCoords) {
                mapRef.current.fitBounds(
                    [
                        [minLng, minLat],
                        [maxLng, maxLat]
                    ],
                    { padding: 80, duration: 1200 }
                );
            }
        }
    }, [routeGeoJSON]);


    const snappedLocation = useMemo(() => {
        if (!location || !graph) return location;
        const snap = findNearestEdgePoint(graph, location.lat, location.lng, 100);
        if (snap) {
            return { lat: snap.lat, lng: snap.lng };
        }
        return location;
    }, [location, graph]);

    if (!graph) return <div className="h-full w-full bg-slate-200 animate-pulse"></div>;


    return (
        <div className="relative w-full h-full">

            <Map
                ref={mapRef}
                attributionControl={isRadar ? false : undefined}
                initialViewState={{
                    longitude: LALBAGH_CENTER.lng,
                    latitude: LALBAGH_CENTER.lat,
                    zoom: isRadar ? 16.5 : 16,
                    pitch: 0,
                    bearing: 0
                }}
                mapStyle={actualSkin === 'animated' ? animatedStyle : satelliteStyle}
                style={{width: '100%', height: '100%'}}
                pitchWithRotate={true}
                dragRotate={true}
                maxPitch={85}
                maxZoom={22}
                onMove={e => {
                    const newZoom = e.viewState.zoom;
                    zoomRef.current = newZoom;
                    setZoomTiers(prev => {
                        const newTiers = {
                            showMajorNames: newZoom >= MAP_ZOOM_TIERS.MAJOR_NAMES_MIN,
                            showAllNames: newZoom >= MAP_ZOOM_TIERS.ALL_NAMES_MIN,
                            showAllPins: newZoom >= MAP_ZOOM_TIERS.ALL_PINS_MIN,
                            showMajorPins: newZoom >= MAP_ZOOM_TIERS.MAJOR_PINS_MIN,
                        };
                        if (
                            prev.showMajorNames !== newTiers.showMajorNames ||
                            prev.showAllNames !== newTiers.showAllNames ||
                            prev.showAllPins !== newTiers.showAllPins ||
                            prev.showMajorPins !== newTiers.showMajorPins
                        ) {
                            return newTiers;
                        }
                        return prev;
                    });
                }}
            >
                {/* Underlying Paths */}
                {allPathsGeoJSON && (
                    <Source id="all-paths-source" type="geojson" data={allPathsGeoJSON}>
                        <Layer
                            id="all-paths-line"
                            type="line"
                            paint={ALL_PATHS_PAINT}
                            layout={ALL_PATHS_LAYOUT}
                        />
                    </Source>
                )}

                {/* Route Glow */}
                {routeGeoJSON && (
                    <Source id="route-glow-source" type="geojson" data={routeGeoJSON}>
                        <Layer
                            id="route-glow-line"
                            type="line"
                            paint={ROUTE_GLOW_PAINT}
                            layout={ROUTE_GLOW_LAYOUT}
                        />
                    </Source>
                )}
                {/* Route Core */}
                {routeGeoJSON && (
                    <Source id="route-source" type="geojson" data={routeGeoJSON}>
                        <Layer
                            id="route-line"
                            type="line"
                            paint={ROUTE_CORE_PAINT}
                            layout={ROUTE_CORE_LAYOUT}
                        />
                    </Source>
                )}

                {/* Nodes */}
                {graph.nodes.filter(n => {
                    const baseType = n.category?.base_type || 'poi';
                    if (baseType === 'intersection') return false;
                    const isMajorNode = baseType === 'poi' || baseType === 'gate';
                    if (!isMajorNode && !zoomTiers.showAllPins) return false;
                    if (isMajorNode && !zoomTiers.showMajorPins) return false;
                    return true;
                }).map(node => {
                    const baseType = node.category?.base_type || 'poi';
                    const isMajorNode = baseType === 'poi' || baseType === 'gate';
                    const showThisMarkerName = isMajorNode ? zoomTiers.showMajorNames : zoomTiers.showAllNames;
                    return (
                        <Marker key={node.id} longitude={node.lng} latitude={node.lat} anchor="center">
                            <div
                                role="button"
                                tabIndex={0}
                                onClick={() => { 
                                    if (!isRadar) {
                                        setActivePopup(activePopup === Number(node.id) ? null : node.id); 
                                        if (onSelectNode) onSelectNode(node);
                                    }
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        if (!isRadar) {
                                            setActivePopup(activePopup === Number(node.id) ? null : node.id);
                                            if (onSelectNode) onSelectNode(node);
                                        }
                                    }
                                }}
                            >
                                <MapNodeMarker type={node.category?.base_type || 'poi'} category={node.category} name={getNodeName(node, i18n.language) || ''} isZoomedIn={showThisMarkerName}
                                    isLabelVisible={visibleLabels.has(node.id)}
                                    isSelected={activePopup === Number(node.id)}
                                    isPaid={node.is_paid}
                                    imageUrl={node.image_url || node.category?.image_url}
                                />
                            </div>
                        </Marker>
                    );
                })}

                {/* Stamps */}
                {zoomTiers.showAllPins && stamps.filter(s => !collectedStampIds.includes(s.id)).map(stamp => (
                    <Marker key={stamp.id} longitude={stamp.lng} latitude={stamp.lat} anchor="center">
                        <div
                            role="button"
                            tabIndex={0}
                            onClick={() => { 
                                if (!isRadar) {
                                    setActivePopup(activePopup === Number(stamp.id) ? null : stamp.id);
                                    const actualNode = graph?.nodes.find(n => n.id === stamp.id);
                                    if (onSelectNode && actualNode) onSelectNode(actualNode);
                                }
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    if (!isRadar) {
                                        setActivePopup(activePopup === Number(stamp.id) ? null : stamp.id);
                                        const actualNode = graph?.nodes.find(n => n.id === stamp.id);
                                        if (onSelectNode && actualNode) onSelectNode(actualNode);
                                    }
                                }
                            }}
                        >
                            <MapNodeMarker type="stamp" name={stamp.name || ''} isZoomedIn={zoomTiers.showAllNames}
                                isLabelVisible={visibleLabels.has(stamp.id)}
                                isSelected={activePopup === Number(stamp.id)}
                                imageUrl={stamp.image_url}
                            />
                        </div>
                    </Marker>
                ))}

                {/* User Location */}
                
                    {snappedLocation && (
                    <Marker longitude={snappedLocation.lng} latitude={snappedLocation.lat} anchor="center">
                        <div className="w-4 h-4 bg-blue-500 border-2 border-white rounded-full shadow-md">
                            <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-50"></div>
                        </div>
                    </Marker>
                    )}
            </Map>

            {/* Recenter Button */}
            {!isRadar && (
                <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+11rem)] left-1/2 -translate-x-1/2 w-full max-w-[420px] flex justify-end px-4 z-10 pointer-events-none hide-on-permission">
                    <div className="flex flex-col gap-2 items-center p-1.5 shadow-[0_20px_40px_rgba(0,0,0,0.5)] border border-white/10 bg-[#1C1C1E]/90 backdrop-blur-3xl rounded-full pointer-events-auto">
                        <button
                            className="rounded-full w-12 h-12 flex items-center justify-center bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/40 transition-all border border-transparent hover:border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                            onClick={() => {
                                if (mapRef.current && location) {
                                    const dist = distanceInMeters(
                                        location.lat,
                                        location.lng,
                                        LALBAGH_CENTER.lat,
                                        LALBAGH_CENTER.lng
                                    );

                                    if (dist <= LALBAGH_GEOFENCE_RADIUS_METERS) {
                                        mapRef.current.flyTo({
                                            center: [location.lng, location.lat],
                                            zoom: 18,
                                            essential: true
                                        });
                                } else {
                                    mapRef.current.flyTo({
                                        center: [location.lng, location.lat],
                                        zoom: 18,
                                        essential: true
                                    });
                                    
                                    setTimeout(() => {
                                        window.dispatchEvent(new CustomEvent('sponsor-toast', {
                                            detail: {
                                                message: "Taking you back...",
                                                description: "You're a bit far from Lalbagh.",
                                                duration: 3000
                                            }
                                        }));
                                        if (mapRef.current) {
                                            mapRef.current.flyTo({
                                                center: [LALBAGH_CENTER.lng, LALBAGH_CENTER.lat],
                                                zoom: 16,
                                                essential: true
                                            });
                                        }
                                    }, 1800);
                                }
                            }
                        }}
                    >
                        <LocateFixed className="w-6 h-6 drop-shadow-md"/>
                    </button>
                    </div>
                </div>
            )}
        </div>
    );
}
