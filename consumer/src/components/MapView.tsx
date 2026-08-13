import Map, {Layer, Marker, Source} from 'react-map-gl/maplibre';
import { setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import {useEffect, useRef, useState} from 'react';

setWorkerUrl(workerUrl);
import type * as GeoJSON from 'geojson';
import type {GraphData, GraphNode, Stamp} from '@wayontop/ui/lib/types';
import {useLocation} from '../hooks/useLocation';
import {Gamification} from '../lib/gamification';
import {MapNodeMarker} from '@wayontop/ui/components/MapNodeMarker';
import {useMarkerCollision} from '@wayontop/ui/hooks/useMarkerCollision';
import {useMemo} from 'react';
import {CONSUMER_MAP_ZOOM_TIERS as MAP_ZOOM_TIERS} from '@wayontop/ui/lib/constants';
import {LocateFixed} from 'lucide-react';

const LALBAGH_CENTER = {lat: 12.9500, lng: 77.5850};

type MapViewProps = Readonly<{
    graph: GraphData | null;
    activeRoute: { path: GraphNode[]; totalDistance: number } | null;
    stamps?: Stamp[];
    isRadar?: boolean;
    mode?: 'map' | 'satellite' | 'ar';
}>;

export function MapView({graph, activeRoute, stamps = [], isRadar = false, mode = 'map'}: MapViewProps) {
    const {location} = useLocation();
    const collectedStampIds = Gamification.getCollectedStamps();
    const [activePopup, setActivePopup] = useState<string | null>(null);
    const mapRef = useRef<any>(null);

    const actualSkin = mode === 'satellite' ? 'satellite' : 'animated';
    const [zoom, setZoom] = useState(isRadar ? 16.5 : 16);

    useEffect(() => {
        if (isRadar && location && mapRef.current) {
            mapRef.current.jumpTo({
                center: [location.lng, location.lat],
                zoom: 16.5
            });
        }
    }, [location, isRadar]);

    const nodesAndStamps = useMemo(() => {
        if (!graph) return [];
        const visibleNodes = graph.nodes.filter(n => n.type !== 'track').map(n => ({...n, priority: n.type === 'gate' ? 10 : 5}));
        const visibleStamps = stamps.filter(s => s.rarity !== 'golden' && !collectedStampIds.includes(s.id)).map(s => ({...s, priority: 8}));
        return [...visibleNodes, ...visibleStamps];
    }, [graph, stamps, collectedStampIds]);

    const { visibleLabels, calculateCollisions } = useMarkerCollision(mapRef, nodesAndStamps, zoom >= MAP_ZOOM_TIERS.MAJOR_NAMES_MIN);

    useEffect(() => {
        calculateCollisions();
    }, [zoom, nodesAndStamps, calculateCollisions]);

    const routeGeoJSON = useMemo(() => {
        if (!activeRoute || !graph) return null;
        const features: GeoJSON.Feature<GeoJSON.LineString>[] = [];
        let currentSegment: number[][] = [];
        
        for (let i = 0; i < activeRoute.path.length; i++) {
            currentSegment.push([activeRoute.path[i].lng, activeRoute.path[i].lat]);
            
            if (i < activeRoute.path.length - 1) {
                const nodeA = activeRoute.path[i];
                const nodeB = activeRoute.path[i+1];
                const edge = graph.edges.find(e => 
                    (e.from === nodeA.id && e.to === nodeB.id) || 
                    (e.to === nodeA.id && e.from === nodeB.id)
                );
                
                if (edge?.is_hidden) {
                    if (currentSegment.length > 1) {
                        features.push({
                            type: "Feature",
                            geometry: { type: "LineString", coordinates: currentSegment },
                            properties: {}
                        });
                    }
                    currentSegment = [];
                }
            }
        }
        
        if (currentSegment.length > 1) {
            features.push({
                type: "Feature",
                geometry: { type: "LineString", coordinates: currentSegment },
                properties: {}
            });
        }
        
        return {
            type: "FeatureCollection",
            features
        } as GeoJSON.FeatureCollection<GeoJSON.LineString>;
    }, [activeRoute, graph]);

    if (!graph) return <div className="h-full w-full bg-slate-200 animate-pulse"></div>;

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

    const satelliteStyle = {
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
                onMove={e => setZoom(e.viewState.zoom)}
            >
                {/* Route */}
                {routeGeoJSON && (
                    <Source id="route-source" type="geojson" data={routeGeoJSON}>
                        <Layer
                            id="route-line"
                            type="line"
                            paint={{
                                'line-color': '#fbbf24',
                                'line-width': 6,
                                'line-opacity': 0.8
                            }}
                            layout={{
                                'line-cap': 'round',
                                'line-join': 'round'
                            }}
                        />
                    </Source>
                )}

                {/* Nodes */}
                {graph.nodes.filter(n => {
                    if (n.type === 'track') return false;
                    const isMajorNode = n.type === 'poi' || n.type === 'facility' || n.type === 'gate';
                    if (!isMajorNode && zoom < MAP_ZOOM_TIERS.ALL_PINS_MIN) return false;
                    if (isMajorNode && zoom < MAP_ZOOM_TIERS.MAJOR_PINS_MIN) return false;
                    return true;
                }).map(node => {
                    const isMajorNode = node.type === 'poi' || node.type === 'facility' || node.type === 'gate';
                    const showThisMarkerName = isMajorNode ? zoom >= MAP_ZOOM_TIERS.MAJOR_NAMES_MIN : zoom >= MAP_ZOOM_TIERS.ALL_NAMES_MIN;
                    return (
                    <Marker key={node.id} longitude={node.lng} latitude={node.lat} anchor="center">
                        <div
                            role="button"
                            tabIndex={0}
                            onClick={() => !isRadar && setActivePopup(activePopup === node.id ? null : node.id)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    !isRadar && setActivePopup(activePopup === node.id ? null : node.id);
                                }
                            }}
                        >
                            <MapNodeMarker
                                type={node.type}
                                name={node.name}
                                isZoomedIn={showThisMarkerName}
                                isLabelVisible={visibleLabels.has(node.id)}
                                isSelected={activePopup === node.id}
                                tags={node.tags}
                            />
                        </div>
                    </Marker>
                    );
                })}

                {/* Stamps */}
                {zoom >= MAP_ZOOM_TIERS.ALL_PINS_MIN && stamps.filter(s => s.rarity !== 'golden' && !collectedStampIds.includes(s.id)).map(stamp => (
                    <Marker key={stamp.id} longitude={stamp.lng} latitude={stamp.lat} anchor="center">
                        <div
                            role="button"
                            tabIndex={0}
                            onClick={() => !isRadar && setActivePopup(activePopup === stamp.id ? null : stamp.id)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    !isRadar && setActivePopup(activePopup === stamp.id ? null : stamp.id);
                                }
                            }}
                        >
                            <MapNodeMarker
                                type="stamp"
                                name={stamp.name}
                                isZoomedIn={zoom >= MAP_ZOOM_TIERS.ALL_NAMES_MIN}
                                isLabelVisible={visibleLabels.has(stamp.id)}
                                isSelected={activePopup === stamp.id}
                            />
                        </div>
                    </Marker>
                ))}

                {/* User Location */}
                {location && (
                    <Marker longitude={location.lng} latitude={location.lat} anchor="center">
                        <div className="w-4 h-4 bg-blue-500 border-2 border-white rounded-full shadow-md">
                            <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-50"></div>
                        </div>
                    </Marker>
                )}
            </Map>

            {/* Recenter Button */}
            {!isRadar && (
                <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+7.5rem)] right-4 z-10 flex flex-col gap-2 items-center p-1.5 shadow-[0_20px_40px_rgba(0,0,0,0.5)] border border-white/10 bg-[#1C1C1E]/90 backdrop-blur-3xl rounded-full pointer-events-auto">
                    <button
                        className="rounded-full w-12 h-12 flex items-center justify-center bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/40 transition-all border border-transparent hover:border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                        onClick={() => {
                            if (mapRef.current && location) {
                                mapRef.current.flyTo({
                                    center: [location.lng, location.lat],
                                    zoom: 18,
                                    essential: true
                                });
                            }
                        }}
                    >
                        <LocateFixed className="w-6 h-6 drop-shadow-md" />
                    </button>
                </div>
            )}
        </div>
    );
}
