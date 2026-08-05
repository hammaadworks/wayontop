import Map, {Layer, Marker, Source} from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import {useEffect, useRef, useState} from 'react';
import type * as GeoJSON from 'geojson';
import type {GraphData, GraphNode, Stamp} from '@wayontop/ui/lib/types';
import {useLocation} from '../hooks/useLocation';
import {Gamification} from '../lib/gamification';
import {MapNodeMarker} from '@wayontop/ui/components/MapNodeMarker';

const LALBAGH_CENTER = {lat: 12.9500, lng: 77.5850};

type MapViewProps = Readonly<{
    graph: GraphData | null;
    activeRoute: { path: GraphNode[]; totalDistance: number } | null;
    stamps?: Stamp[];
    isRadar?: boolean;
}>;

export function MapView({graph, activeRoute, stamps = [], isRadar = false}: MapViewProps) {
    const {location} = useLocation();
    const collectedStampIds = Gamification.getCollectedStamps();
    const [activePopup, setActivePopup] = useState<string | null>(null);
    const mapRef = useRef<any>(null);

    const [mapSkin, setMapSkin] = useState<'animated' | 'satellite'>('animated');
    const [zoom, setZoom] = useState(isRadar ? 16.5 : 16);

    useEffect(() => {
        if (isRadar && location && mapRef.current) {
            mapRef.current.jumpTo({
                center: [location.lng, location.lat],
                zoom: 16.5
            });
        }
    }, [location, isRadar]);

    if (!graph) return <div className="h-full w-full bg-slate-200 animate-pulse"></div>;

    const routeGeoJSON: GeoJSON.Feature<GeoJSON.LineString> | null = activeRoute ? {
        type: "Feature",
        geometry: {
            type: "LineString",
            coordinates: activeRoute.path.map(n => [n.lng, n.lat])
        },
        properties: {}
    } : null;

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
            {!isRadar && (
                <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
                    <button
                        onClick={() => setMapSkin(s => s === 'animated' ? 'satellite' : 'animated')}
                        className="bg-white/95 backdrop-blur-md rounded-full shadow-lg border border-slate-200/50 p-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center justify-center min-w-9"
                    >
                        {mapSkin === 'animated' ? '🌍 Sat' : '🗺️ Map'}
                    </button>
                </div>
            )}
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
                mapStyle={mapSkin === 'animated' ? animatedStyle : satelliteStyle}
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
                {graph.nodes.filter(n => n.type !== 'track').map(node => (
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
                                isZoomedIn={zoom >= 16}
                                isSelected={activePopup === node.id}
                            />
                        </div>
                    </Marker>
                ))}

                {/* Stamps */}
                {stamps.filter(s => s.rarity !== 'golden' && !collectedStampIds.includes(s.id)).map(stamp => (
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
                                isZoomedIn={zoom >= 16}
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
        </div>
    );
}
