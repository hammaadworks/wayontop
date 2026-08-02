import Map, { Marker, Source, Layer } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useState, useRef, useEffect } from 'react';
import type * as GeoJSON from 'geojson';
import type { GraphData, GraphNode, Stamp } from '../App';
import { useLocation } from '../hooks/useLocation';
import { Gamification } from '../lib/gamification';

const LALBAGH_CENTER = { lat: 12.9500, lng: 77.5850 };

interface MapViewProps {
  graph: GraphData | null;
  activeRoute: { path: GraphNode[]; totalDistance: number } | null;
  stamps?: Stamp[];
  isRadar?: boolean;
}

export function MapView({ graph, activeRoute, stamps = [], isRadar = false }: MapViewProps) {
  const { location } = useLocation();
  const collectedStampIds = Gamification.getCollectedStamps();
  const [activePopup, setActivePopup] = useState<string | null>(null);
  const mapRef = useRef<any>(null);

  const [mapSkin, setMapSkin] = useState<'animated' | 'satellite'>('animated');

  useEffect(() => {
    if (isRadar && location && mapRef.current) {
      mapRef.current.jumpTo({
        center: [location.lng, location.lat],
        zoom: 18
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

  const animatedStyle = {
    version: 8,
    sources: {
      'osm': {
        type: 'raster',
        tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: '&copy; OpenStreetMap Contributors',
        maxzoom: 19
      }
    },
    layers: [
      {
        id: 'osm-layer',
        type: 'raster',
        source: 'osm',
        minzoom: 0,
        maxzoom: 19
      }
    ]
  };

  const satelliteStyle = {
    version: 8,
    sources: {
      'osm': {
        type: 'raster',
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256,
        attribution: '&copy; Esri',
        maxzoom: 19
      }
    },
    layers: [
      {
        id: 'osm-layer',
        type: 'raster',
        source: 'osm',
        minzoom: 0
      }
    ]
  };

  return (
    <div className="relative w-full h-full">
      {!isRadar && (
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
          <button
            onClick={() => setMapSkin(s => s === 'animated' ? 'satellite' : 'animated')}
            className="bg-white/95 backdrop-blur-md rounded-full shadow-lg border border-slate-200/50 p-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center justify-center min-w-[36px]"
          >
            {mapSkin === 'animated' ? '🌍 Sat' : '🗺️ Map'}
          </button>
        </div>
      )}
      <Map
        ref={mapRef}
        attributionControl={!isRadar}
        initialViewState={{
          longitude: LALBAGH_CENTER.lng,
          latitude: LALBAGH_CENTER.lat,
          zoom: isRadar ? 18 : 16,
          pitch: 0,
          bearing: 0
        }}
        mapStyle={mapSkin === 'animated' ? animatedStyle : satelliteStyle}
        style={{ width: '100%', height: '100%' }}
        pitchWithRotate={true}
        dragRotate={true}
        maxPitch={85}
        maxZoom={22}
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
        {graph.nodes.filter(n => n.type !== 'junction').map(node => (
          <Marker key={node.id} longitude={node.lng} latitude={node.lat} anchor="bottom">
            <div className="relative group cursor-pointer" onClick={() => !isRadar && setActivePopup(activePopup === node.id ? null : node.id)}>
              {node.type === 'gate' ? (
                <div className="flex items-center justify-center w-[28px] h-[28px] rounded-full border-[3px] border-white shadow-[0_4px_10px_rgba(0,0,0,0.3)] bg-gradient-to-br from-emerald-400 to-emerald-600">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
                </div>
              ) : (
                <div className="flex items-center justify-center w-[28px] h-[28px] rounded-full border-[3px] border-white shadow-[0_4px_10px_rgba(0,0,0,0.3)] bg-gradient-to-br from-amber-400 to-amber-600">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                </div>
              )}
              
              {activePopup === node.id && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white rounded-lg shadow-xl p-2 min-w-[120px] text-center border border-slate-100 z-50 pointer-events-none">
                  <div className="font-bold text-slate-900 text-sm whitespace-nowrap">{node.name}</div>
                  <div className="text-xs text-slate-500 capitalize">{node.type}</div>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-white"></div>
                </div>
              )}
            </div>
          </Marker>
        ))}

        {/* Stamps */}
        {stamps.filter(s => s.rarity !== 'golden' && !collectedStampIds.includes(s.id)).map(stamp => (
          <Marker key={stamp.id} longitude={stamp.lng} latitude={stamp.lat} anchor="bottom">
            <div className="relative group cursor-pointer" onClick={() => !isRadar && setActivePopup(activePopup === stamp.id ? null : stamp.id)}>
              <div className="flex items-center justify-center w-[24px] h-[24px] rounded-full border-2 border-white shadow-[0_4px_10px_rgba(0,0,0,0.3)] bg-gradient-to-br from-purple-400 to-purple-700">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
              </div>
              {activePopup === stamp.id && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white rounded-lg shadow-xl p-2 min-w-[120px] text-center border border-slate-100 z-50 pointer-events-none">
                  <div className="font-bold text-purple-700 text-sm whitespace-nowrap">{stamp.name}</div>
                  <div className="text-xs text-slate-500 capitalize">{stamp.rarity} Stamp</div>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-white"></div>
                </div>
              )}
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
