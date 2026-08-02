import { useEffect, useState, useRef } from 'react';
import { supabase } from './lib/supabase';
import Map, { Marker, Source, Layer } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import * as turf from '@turf/turf';
import type * as GeoJSON from 'geojson';
import { Button } from './components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './components/ui/card';
import { Input } from './components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Label } from './components/ui/label';
import { MapPin, ArrowRight, Save, Trash2, Play, Square, LocateFixed, Megaphone, MousePointer2, Route, X, Plus, Camera, Layers, Eraser } from 'lucide-react';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './components/ui/alert-dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from './components/ui/sheet';
import { CameraView } from './components/CameraView';

// MapLibre icons are handled via HTML inside Marker

export type NodeType = 'gate' | 'poi' | 'junction' | 'stamp';

export interface Venue {
  id: string;
  name: string;
  key: string;
  lat: number;
  lng: number;
  zoom: number;
}

export interface GraphNode {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: NodeType;
  tags: string[];
}

export interface GraphEdge {
  from: string;
  to: string;
  distance_m: number;
}

export interface SponsorZone {
  id: string;
  name: string;
  poi_id: string;
  radius_m: number;
  banner_asset: string;
  video_asset: string;
  tagline?: string;
  logo_asset?: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  sponsors: SponsorZone[];
}

function distanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const p1 = lat1 * Math.PI / 180;
  const p2 = lat2 * Math.PI / 180;
  const dp = (lat2 - lat1) * Math.PI / 180;
  const dl = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(dp / 2) * Math.sin(dp / 2) +
            Math.cos(p1) * Math.cos(p2) *
            Math.sin(dl / 2) * Math.sin(dl / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

export default function App() {
  const mapRef = useRef<any>(null);
  const [venues, setVenues] = useState<Venue[]>([]);


  const [currentVenue, setCurrentVenue] = useState<Venue | null>(null);
  const [loadingVenues, setLoadingVenues] = useState(true);
  const [showNewVenue, setShowNewVenue] = useState(false);
  const [newVenueForm, setNewVenueForm] = useState<Partial<Venue>>({ zoom: 16 });
  const [venueToDelete, setVenueToDelete] = useState<string | null>(null);

  const [data, setData] = useState<GraphData>({ nodes: [], edges: [], sponsors: [] });
  const [loadingGraph, setLoadingGraph] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Editor State
  const [mode, setMode] = useState<'view' | 'add_node' | 'add_edge'>('view');
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<GraphEdge | null>(null);
  const [edgeStartNode, setEdgeStartNode] = useState<GraphNode | null>(null);

  // Sponsor State
  const [editingSponsorId, setEditingSponsorId] = useState<string | null>(null);
  const [sponsorForm, setSponsorForm] = useState<Partial<SponsorZone>>({});
  const [showSponsorForm, setShowSponsorForm] = useState(false);

  // Map Layers
  const [layers, setLayers] = useState({
    paths: true,
    sponsors: true,
    trace: true,
  });
  const [mapSkin, setMapSkin] = useState<'satellite' | 'animated'>('satellite');

  // Geolocation & Recording State
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  const [rawTrace, setRawTrace] = useState<{lat: number, lng: number}[]>([]);
  const [recording, setRecording] = useState(false);
  const [locateTrigger, setLocateTrigger] = useState(0);
  const lastRecordedNodeRef = useRef<GraphNode | null>(null);

  // New Node Form
  const [newNodeName, setNewNodeName] = useState('');
  const [newNodeType, setNewNodeType] = useState<NodeType>('poi');
  const [testingStamp, setTestingStamp] = useState<GraphNode | null>(null);

  useEffect(() => {
    if (mapRef.current && currentVenue) {
      mapRef.current.flyTo({ center: [currentVenue.lng, currentVenue.lat], zoom: currentVenue.zoom, essential: true });
    }
  }, [currentVenue]);

  useEffect(() => {
    if (mapRef.current && currentLocation && locateTrigger > 0) {
      mapRef.current.flyTo({ center: [currentLocation.lng, currentLocation.lat], zoom: 18, essential: true });
    }
  }, [locateTrigger]);


  useEffect(() => {
    loadVenues();
  }, []);

  useEffect(() => {
    if (currentVenue) {
      loadGraph();
    }
  }, [currentVenue]);

  useEffect(() => {
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const pos = {lat: position.coords.latitude, lng: position.coords.longitude};
        setCurrentLocation(pos);
        if (recording) {
          setRawTrace(prev => [...prev, pos]);
        }
      },
      (error) => console.error("Error watching position:", error),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [recording]);

  useEffect(() => {
    if (!currentLocation || !recording) return;

    const lastNode = lastRecordedNodeRef.current;
    
    if (!lastNode) {
      const newNode: GraphNode = {
        id: `n_${Date.now()}`,
        name: `Auto ${new Date().toLocaleTimeString()}`,
        lat: currentLocation.lat,
        lng: currentLocation.lng,
        type: 'junction',
        tags: ['auto']
      };
      setData(prev => ({ ...prev, nodes: [...prev.nodes, newNode] }));
      lastRecordedNodeRef.current = newNode;
    } else {
      const dist = distanceInMeters(lastNode.lat, lastNode.lng, currentLocation.lat, currentLocation.lng);
      if (dist >= 5) {
        const newNode: GraphNode = {
          id: `n_${Date.now()}`,
          name: `Auto Node`,
          lat: currentLocation.lat,
          lng: currentLocation.lng,
          type: 'junction',
          tags: ['auto']
        };
        const newEdge: GraphEdge = {
          from: lastNode.id,
          to: newNode.id,
          distance_m: dist
        };
        setData(prev => ({ 
          ...prev, 
          nodes: [...prev.nodes, newNode],
          edges: [...prev.edges, newEdge] 
        }));
        lastRecordedNodeRef.current = newNode;
      }
    }
  }, [currentLocation, recording]);

  async function loadVenues() {
    setLoadingVenues(true);
    const { data, error } = await supabase.from('venues').select('*').order('created_at', { ascending: false });
    if (error) {
      toast.error('Error loading venues');
    } else if (data) {
      setVenues(data);
    }
    setLoadingVenues(false);
  }

  async function createVenue() {
    if (!newVenueForm.name || !newVenueForm.key || !newVenueForm.lat || !newVenueForm.lng) return toast.error('Name, Key and coordinates required');
    
    const validKey = /^[a-z0-9]+$/.test(newVenueForm.key);
    if (!validKey) return toast.error('Key must be lowercase alphanumeric, one word only');

    const { data: vdata, error } = await supabase.from('venues').insert([{
      name: newVenueForm.name,
      key: newVenueForm.key,
      lat: newVenueForm.lat,
      lng: newVenueForm.lng,
      zoom: newVenueForm.zoom || 16
    }]).select().single();

    if (error) {
      toast.error('Failed to create venue: ' + error.message);
    } else if (vdata) {
      toast.success('Venue created!');
      setVenues([vdata, ...venues]);
      setCurrentVenue(vdata);
      setShowNewVenue(false);
      setNewVenueForm({ zoom: 16 });
    }
  }

  async function deleteVenue(venueId: string) {
    // venue_content is deleted by cascade
    const { error } = await supabase.from('venues').delete().eq('id', venueId);
    if (error) {
      toast.error('Failed to delete venue: ' + error.message);
    } else {
      toast.success('Venue deleted');
      setVenues(venues.filter(v => v.id !== venueId));
      if (currentVenue?.id === venueId) setCurrentVenue(null);
    }
  }

  async function loadGraph() {
    if (!currentVenue) return;
    setLoadingGraph(true);
    const { data: blob, error } = await supabase.from('venue_content').select('data').eq('venue_key', currentVenue.key).eq('content_type', 'graph').single();
    if (error && error.code !== 'PGRST116') {
      toast.error('Failed to load graph: ' + error.message);
    } else if (blob && blob.data) {
      setData(blob.data as GraphData);
    } else {
      setData({ nodes: [], edges: [], sponsors: [] });
    }
    setLoadingGraph(false);
  }

  async function saveGraph() {
    if (!currentVenue) return;
    setSaving(true);
    const { error } = await supabase.from('venue_content').upsert({ 
      venue_key: currentVenue.key, 
      content_type: 'graph',
      data: data, 
      version: Math.floor(Date.now() / 1000), 
      updated_at: new Date().toISOString() 
    });

    if (error) {
      toast.error('Error saving graph: ' + error.message);
    } else {
      toast.success('Graph saved successfully!');
    }
    setSaving(false);
  }

  const saveSponsor = () => {
    if (!sponsorForm.poi_id || !sponsorForm.name || sponsorForm.radius_m === undefined || sponsorForm.radius_m <= 0) {
      toast.error('Name, Location, and a valid Radius are required.');
      return;
    }
    
    if (editingSponsorId) {
      setData(prev => ({
        ...prev,
        sponsors: prev.sponsors.map(s => s.id === editingSponsorId ? { ...s, ...sponsorForm } as SponsorZone : s)
      }));
    } else {
      setData(prev => ({
        ...prev,
        sponsors: [...prev.sponsors, { id: `s_${Date.now()}`, ...sponsorForm } as SponsorZone]
      }));
    }
    setEditingSponsorId(null);
    setSponsorForm({});
    setShowSponsorForm(false);
  };

  const deleteSponsor = (id: string) => {
    setData(prev => ({
      ...prev,
      sponsors: prev.sponsors.filter(s => s.id !== id)
    }));
  };

  const handleMapClick = (latlng: {lat: number, lng: number}) => {
    if (mode === 'add_node') {
      const newNode: GraphNode = {
        id: `n_${Date.now()}`,
        name: newNodeName || `Node ${data.nodes.length + 1}`,
        lat: latlng.lat,
        lng: latlng.lng,
        type: newNodeType,
        tags: []
      };
      setData(prev => ({ ...prev, nodes: [...prev.nodes, newNode] }));
      setNewNodeName('');
      setMode('view');
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
            const newEdge: GraphEdge = {
              from: edgeStartNode.id,
              to: node.id,
              distance_m: dist
            };
            setData(prev => ({ ...prev, edges: [...prev.edges, newEdge] }));
            toast.success(`Edge added (${dist}m)`);
          }
        }
        setEdgeStartNode(null);
        setMode('view');
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
      const newNodes = prev.nodes.map(n => n.id === id ? { ...n, lat, lng } : n);
      const newEdges = prev.edges.map(e => {
        if (e.from === id || e.to === id) {
          const fromNode = newNodes.find(n => n.id === e.from);
          const toNode = newNodes.find(n => n.id === e.to);
          if (fromNode && toNode) {
            return {
              ...e,
              distance_m: distanceInMeters(fromNode.lat, fromNode.lng, toNode.lat, toNode.lng)
            };
          }
        }
        return e;
      });
      return { ...prev, nodes: newNodes, edges: newEdges };
    });
    setSelectedNode(prev => (prev && prev.id === id) ? { ...prev, lat, lng } : prev);
  };

  const updateNode = (id: string, updates: Partial<GraphNode>) => {
    setData(prev => ({
      ...prev,
      nodes: prev.nodes.map(n => n.id === id ? { ...n, ...updates } : n)
    }));
    setSelectedNode(prev => prev && prev.id === id ? { ...prev, ...updates } : prev);
  };

  // -------------------------------------------------------------
  // RENDER: Venue Selection Screen
  // -------------------------------------------------------------
  if (!currentVenue) {
    return (
      <div className="min-h-[100dvh] bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-100 text-indigo-600 mb-4 shadow-sm border border-indigo-200">
              <MapPin className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Producer UI</h1>
            <p className="text-slate-500 mt-2">Select a venue to begin mapping</p>
          </div>

          {showNewVenue ? (
            <Card className="shadow-xl border-slate-200">
              <CardHeader className="border-b border-slate-100 bg-slate-50/50">
                <CardTitle>Create New Venue</CardTitle>
                <CardDescription>Setup a new park, mall, or event space</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2"><Label>Venue Name</Label><Input placeholder="Venue Name" value={newVenueForm.name || ''} onChange={e => setNewVenueForm(s => ({ ...s, name: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Venue Key (e.g. lalbagh)</Label><Input placeholder="Venue Key" value={newVenueForm.key || ''} onChange={e => setNewVenueForm(s => ({ ...s, key: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '') }))} /></div>
                
                <div className="flex justify-between items-center pt-2">
                  <Label>Center Coordinates</Label>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-xs h-7"
                    onClick={() => {
                      if (currentLocation) {
                        setNewVenueForm(s => ({ ...s, lat: currentLocation.lat, lng: currentLocation.lng }));
                      } else {
                        navigator.geolocation.getCurrentPosition(
                          pos => setNewVenueForm(s => ({ ...s, lat: pos.coords.latitude, lng: pos.coords.longitude })),
                          () => toast.error("Could not get location")
                        );
                      }
                    }}
                  >
                    <LocateFixed className="w-3 h-3 mr-1" /> Use Current
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-slate-500">Latitude</Label>
                    <Input type="number" step="any" placeholder="12.9500" value={newVenueForm.lat || ''} onChange={e => setNewVenueForm(s => ({ ...s, lat: Number(e.target.value) }))} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-slate-500">Longitude</Label>
                    <Input type="number" step="any" placeholder="77.5850" value={newVenueForm.lng || ''} onChange={e => setNewVenueForm(s => ({ ...s, lng: Number(e.target.value) }))} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-slate-500">Initial Zoom Level</Label>
                  <Input type="number" placeholder="16" value={newVenueForm.zoom || ''} onChange={e => setNewVenueForm(s => ({ ...s, zoom: Number(e.target.value) }))} />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700" onClick={createVenue}>Create Venue</Button>
                  <Button variant="ghost" onClick={() => setShowNewVenue(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-xl border-slate-200">
              <div className="p-2">
                {loadingVenues ? (
                  <div className="p-8 text-center text-slate-500 flex flex-col items-center">
                    <div className="animate-spin w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full mb-3"></div>
                    Loading venues...
                  </div>
                ) : venues.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">
                    <MapPin className="w-8 h-8 mx-auto mb-3 text-slate-300" />
                    No venues found. Create one to get started.
                  </div>
                ) : (
                  <div className="grid gap-1">
                    {venues.map(v => (
                      <div key={v.id} className="flex items-center justify-between p-4 rounded-lg hover:bg-indigo-50 transition-colors border border-transparent hover:border-indigo-100 group">
                        <button onClick={() => setCurrentVenue(v)} className="flex-1 text-left">
                          <div className="font-semibold text-slate-900 group-hover:text-indigo-700">{v.name}</div>
                          <div className="text-xs text-slate-500 mt-1">{v.key} • {v.lat.toFixed(4)}, {v.lng.toFixed(4)}</div>
                        </button>
                        <Button variant="ghost" size="icon" onClick={() => setVenueToDelete(v.id)} className="text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-slate-100 bg-slate-50/50 rounded-b-xl">
                <Button variant="outline" className="w-full border-dashed border-2 hover:border-indigo-300 hover:bg-indigo-50" onClick={() => setShowNewVenue(true)}>
                  <Plus className="w-4 h-4 mr-2" /> Create New Venue
                </Button>
              </div>
            </Card>
          )}

          {/* Delete Venue Alert Dialog */}
          <AlertDialog open={!!venueToDelete} onOpenChange={(open: boolean) => !open && setVenueToDelete(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete this venue and all its mapped nodes, edges, and sponsors. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => { if (venueToDelete) deleteVenue(venueToDelete); setVenueToDelete(null); }} className="bg-red-600 hover:bg-red-700 text-white">Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: Map Editor
  // -------------------------------------------------------------
  return (
    <div className="fixed inset-0 w-full font-sans text-slate-900 overflow-hidden bg-slate-50">
      
      {/* Background Map */}
      <div className="absolute inset-0 z-0">
        {loadingGraph ? (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100/50 z-50 backdrop-blur-sm">
            <div className="animate-spin w-10 h-10 border-4 border-slate-300 border-t-indigo-600 rounded-full"></div>
          </div>
        ) : null}
        
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
            name: "Lalbagh Satellite",
            metadata: { app: "wayon.top Producer", theme: "satellite" },
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
                layout: { visibility: "visible" },
                paint: {
                  "raster-opacity": 1,
                  "raster-contrast": 0.15,
                  "raster-saturation": 0.2,
                  "raster-brightness-min": 0.05,
                  "raster-fade-duration": 300
                }
              }
            ]
          } : {
            version: 8,
            name: "Lalbagh Map",
            metadata: { app: "wayon.top Producer", theme: "animated" },
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
                layout: { visibility: "visible" },
                paint: {
                  "raster-opacity": 1,
                  "raster-saturation": -0.2,
                  "raster-contrast": 0.05,
                  "raster-fade-duration": 300
                }
              }
            ]
          }}
          style={{ width: '100%', height: '100%', zIndex: 0 }}
          pitchWithRotate={true}
          dragRotate={true}
          maxPitch={85}
          maxZoom={22}
          onClick={(e) => handleMapClick({ lat: e.lngLat.lat, lng: e.lngLat.lng })}
        >
          {currentLocation && (
            <Marker longitude={currentLocation.lng} latitude={currentLocation.lat} anchor="center">
              <div className="w-4 h-4 bg-blue-500 border-2 border-white rounded-full shadow-md">
                <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-50"></div>
              </div>
            </Marker>
          )}

          {layers.paths && data.nodes.map(node => {
            const isSelected = selectedNode?.id === node.id;
            const color = node.type === 'poi' ? 'bg-amber-500' : node.type === 'stamp' ? 'bg-fuchsia-500' : 'bg-indigo-500';
            const glow = node.type === 'poi' ? 'shadow-amber-500/50' : node.type === 'stamp' ? 'shadow-fuchsia-500/50' : 'shadow-indigo-500/50';
            const scale = isSelected ? 'scale-125' : 'scale-100';
            const border = isSelected ? 'border-[3px] border-white' : 'border-2 border-white/90';
            const opacity = mode === 'add_edge' && edgeStartNode?.id === node.id ? 'opacity-50' : 'opacity-100';
            
            return (
              <Marker 
                key={node.id} 
                longitude={node.lng} 
                latitude={node.lat} 
                anchor="center"
                draggable={mode === 'view'}
                onDragEnd={(e) => updateNodePosition(node.id, e.lngLat.lat, e.lngLat.lng)}
                onClick={(e) => { e.originalEvent.stopPropagation(); handleNodeClick(node); }}
              >
                <div className={`relative flex items-center justify-center w-10 h-10 -ml-1 -mt-1 cursor-pointer ${opacity}`}>
                  <div className={`absolute inset-0 rounded-full ${color} opacity-20 animate-pulse`}></div>
                  <div className={`relative w-4 h-4 rounded-full ${color} ${border} shadow-lg ${glow} ${scale} transition-all duration-300`}></div>
                </div>
              </Marker>
            );
          })}

          {layers.paths && data.edges.length > 0 && (
            <Source 
              id="edges-source" 
              type="geojson" 
              data={{
                type: 'FeatureCollection',
                features: data.edges.map(edge => {
                  const start = data.nodes.find(n => n.id === edge.from);
                  const end = data.nodes.find(n => n.id === edge.to);
                  if (!start || !end) return null;
                  const isSelected = selectedEdge?.from === edge.from && selectedEdge?.to === edge.to;
                  return {
                    type: 'Feature',
                    properties: { ...edge, isSelected },
                    geometry: {
                      type: 'LineString',
                      coordinates: [[start.lng, start.lat], [end.lng, end.lat]]
                    }
                  };
                }).filter(Boolean) as GeoJSON.Feature[]
              }}
            >
              <Layer
                id="edges-glow"
                type="line"
                paint={{
                  'line-color': '#6366f1',
                  'line-width': ['case', ['boolean', ['get', 'isSelected'], false], 16, 12],
                  'line-opacity': ['case', ['boolean', ['get', 'isSelected'], false], 0.3, 0.15]
                }}
                layout={{ 'line-cap': 'round', 'line-join': 'round' }}
              />
              <Layer
                id="edges-core"
                type="line"
                paint={{
                  'line-color': ['case', ['boolean', ['get', 'isSelected'], false], '#f59e0b', '#6366f1'],
                  'line-width': ['case', ['boolean', ['get', 'isSelected'], false], 6, 4],
                  'line-dasharray': mode === 'view' ? [1] : [2, 2]
                }}
                layout={{ 'line-cap': 'round', 'line-join': 'round' }}
              />
            </Source>
          )}

          {layers.sponsors && data.sponsors.length > 0 && (
            <Source
              id="sponsors-source"
              type="geojson"
              data={{
                type: 'FeatureCollection',
                features: data.sponsors.map(sponsor => {
                  const node = data.nodes.find(n => n.id === sponsor.poi_id);
                  if (!node) return null;
                  return turf.circle([node.lng, node.lat], sponsor.radius_m, { steps: 64, units: 'meters' });
                }).filter(Boolean) as GeoJSON.Feature[]
              }}
            >
              <Layer
                id="sponsors-layer"
                type="fill"
                paint={{
                  'fill-color': '#22c55e',
                  'fill-opacity': 0.25
                }}
              />
              <Layer
                id="sponsors-outline"
                type="line"
                paint={{
                  'line-color': '#22c55e',
                  'line-width': 2
                }}
              />
            </Source>
          )}

          {layers.trace && rawTrace.length > 1 && (
            <Source
              id="trace-source"
              type="geojson"
              data={{
                type: 'Feature',
                properties: {},
                geometry: {
                  type: 'LineString',
                  coordinates: rawTrace.map(t => [t.lng, t.lat])
                }
              }}
            >
              <Layer
                id="trace-layer-glow"
                type="line"
                paint={{
                  'line-color': '#ef4444',
                  'line-width': 8,
                  'line-opacity': 0.2,
                  'line-dasharray': [0.1, 1]
                }}
                layout={{ 'line-cap': 'round', 'line-join': 'round' }}
              />
              <Layer
                id="trace-layer-core"
                type="line"
                paint={{
                  'line-color': '#ef4444',
                  'line-width': 3,
                  'line-opacity': 0.8,
                  'line-dasharray': [1, 2]
                }}
                layout={{ 'line-cap': 'round', 'line-join': 'round' }}
              />
            </Source>
          )}
        </Map>
      </div>

      {/* Top Navigation Bar - Floating */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 pointer-events-none flex justify-between items-start gap-4">
        {/* Logo / Stats Box */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/50 p-3 md:p-4 pointer-events-auto flex flex-col gap-2 min-w-[140px] md:min-w-[200px] cursor-pointer" onClick={() => setCurrentVenue(null)}>
          <div className="flex items-center gap-2 mb-1">
            <div className="bg-indigo-600 p-1 md:p-1.5 rounded-lg hidden md:block">
              <MapPin className="w-4 h-4 text-white" />
            </div>
            <h1 className="font-bold text-slate-800 tracking-tight text-sm md:text-base leading-tight">
              {currentVenue.name}
              <div className="text-[10px] text-indigo-600 font-normal mt-0.5 hover:underline">Change Venue</div>
            </h1>
          </div>
          <div className="flex justify-between items-center text-xs font-medium text-slate-500">
            <span>Nodes: <span className="text-slate-800">{data.nodes.length}</span></span>
            <span>Edges: <span className="text-slate-800">{data.edges.length}</span></span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pointer-events-auto flex flex-col gap-2 items-end">
          <Button onClick={saveGraph} size="default" disabled={saving} className="rounded-full shadow-lg bg-indigo-600 hover:bg-indigo-700 font-semibold px-5 h-10">
            {saving ? 'Saving...' : <><Save className="w-4 h-4 mr-2" /> Save</>}
          </Button>

          {/* Layers Toggle */}
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/50 p-2 flex flex-col gap-2">
            <div className="flex items-center gap-2 px-2 pb-1 border-b border-slate-100 mb-1">
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-[10px] font-bold text-slate-500 uppercase">Views</span>
            </div>
            <label className="flex items-center gap-2 px-2 cursor-pointer hover:bg-slate-50 rounded py-1">
              <input type="checkbox" checked={layers.paths} onChange={e => setLayers(l => ({ ...l, paths: e.target.checked }))} className="w-3 h-3 text-indigo-600 rounded" />
              <span className="text-xs font-medium">Path & Nodes</span>
            </label>
            <label className="flex items-center gap-2 px-2 cursor-pointer hover:bg-slate-50 rounded py-1">
              <input type="checkbox" checked={layers.sponsors} onChange={e => setLayers(l => ({ ...l, sponsors: e.target.checked }))} className="w-3 h-3 text-green-600 rounded" />
              <span className="text-xs font-medium">Sponsor Radii</span>
            </label>
            <label className="flex items-center gap-2 px-2 cursor-pointer hover:bg-slate-50 rounded py-1">
              <input type="checkbox" checked={layers.trace} onChange={e => setLayers(l => ({ ...l, trace: e.target.checked }))} className="w-3 h-3 text-red-500 rounded" />
              <span className="text-xs font-medium">GPS Trace</span>
            </label>
            
            <div className="border-t border-slate-100 my-1"></div>
            <div className="px-2 flex items-center justify-between gap-2">
              <button
                onClick={() => setMapSkin('satellite')}
                className={`flex-1 text-xs py-1 rounded font-medium transition-colors ${mapSkin === 'satellite' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                Sat
              </button>
              <button
                onClick={() => setMapSkin('animated')}
                className={`flex-1 text-xs py-1 rounded font-medium transition-colors ${mapSkin === 'animated' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                Map
              </button>
            </div>
          </div>

          {/* Sponsors Sheet */}
          <Sheet>
            <SheetTrigger render={<Button variant="secondary" size="default" className="rounded-full shadow-lg bg-white/95 backdrop-blur font-semibold h-10" />}>
              <Megaphone className="w-4 h-4 mr-2 text-indigo-600" /> <span className="hidden md:inline">Sponsors</span>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
              <SheetHeader className="mb-6">
                <SheetTitle>Sponsor Zones</SheetTitle>
                <SheetDescription>Manage active sponsor zones for {currentVenue.name}.</SheetDescription>
              </SheetHeader>
              
              <div className="space-y-6 pb-20">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-semibold text-slate-700">Active Sponsors ({data.sponsors.length})</h3>
                  <Button size="sm" variant="outline" onClick={() => { setEditingSponsorId(null); setSponsorForm({}); setShowSponsorForm(true); }}>+ Add</Button>
                </div>

                {showSponsorForm && (
                  <Card className="border-indigo-100 shadow-sm bg-indigo-50/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">{editingSponsorId ? 'Edit Sponsor' : 'New Sponsor'}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-1.5">
                        <Label>Sponsor Name</Label>
                        <Input value={sponsorForm.name || ''} onChange={e => setSponsorForm(s => ({ ...s, name: e.target.value }))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Location (Node)</Label>
                        <Select value={sponsorForm.poi_id} onValueChange={v => setSponsorForm(s => ({ ...s, poi_id: v || undefined }))}>
                          <SelectTrigger className="bg-white"><SelectValue placeholder="Select a Node..." /></SelectTrigger>
                          <SelectContent>
                            {data.nodes.map(n => <SelectItem key={n.id} value={n.id}>{n.name || n.id} ({n.type})</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label>Radius (m)</Label>
                          <Input type="number" value={sponsorForm.radius_m || ''} onChange={e => setSponsorForm(s => ({ ...s, radius_m: Number(e.target.value) }))} className="bg-white" />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Tagline</Label>
                          <Input value={sponsorForm.tagline || ''} onChange={e => setSponsorForm(s => ({ ...s, tagline: e.target.value }))} className="bg-white" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Logo URL</Label>
                        <Input value={sponsorForm.logo_asset || ''} onChange={e => setSponsorForm(s => ({ ...s, logo_asset: e.target.value }))} className="bg-white" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Banner URL</Label>
                        <Input value={sponsorForm.banner_asset || ''} onChange={e => setSponsorForm(s => ({ ...s, banner_asset: e.target.value }))} className="bg-white" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Video URL</Label>
                        <Input value={sponsorForm.video_asset || ''} onChange={e => setSponsorForm(s => ({ ...s, video_asset: e.target.value }))} className="bg-white" />
                      </div>
                      <div className="flex gap-3 pt-4">
                        <Button onClick={saveSponsor} className="flex-1 bg-indigo-600 hover:bg-indigo-700">Save Zone</Button>
                        <Button variant="outline" onClick={() => { setEditingSponsorId(null); setSponsorForm({}); setShowSponsorForm(false); }}>Cancel</Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="grid gap-4">
                  {data.sponsors.map(sponsor => (
                    <Card key={sponsor.id} className="shadow-sm border-slate-200">
                      <CardHeader className="p-4 pb-3 flex flex-row justify-between items-start">
                        <div>
                          <CardTitle className="text-base font-semibold">{sponsor.name}</CardTitle>
                          <p className="text-sm text-slate-500 mt-1">{sponsor.tagline}</p>
                        </div>
                        <div className="flex gap-1 -mt-2 -mr-2">
                          <Button variant="ghost" size="icon" onClick={() => { setEditingSponsorId(sponsor.id); setSponsorForm(sponsor); setShowSponsorForm(true); }}>
                            <Megaphone className="w-4 h-4 text-indigo-600" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => deleteSponsor(sponsor.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* GPS Tools & Helper UI - Floating Bottom Right/Center */}
      
      {mode === 'add_edge' && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-20 bg-indigo-600 text-white px-5 py-2.5 rounded-full shadow-lg text-sm font-medium pointer-events-none flex items-center animate-pulse whitespace-nowrap">
          <ArrowRight className="w-4 h-4 mr-2 hidden md:inline" />
          {edgeStartNode ? 'Select target node' : 'Select start node'}
        </div>
      )}

      {/* Floating Action Buttons (Right) */}
      <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+6rem)] right-4 z-10 flex flex-col gap-3">
        {rawTrace.length > 0 && (
          <Button 
            variant="secondary" size="icon" 
            className="rounded-full w-12 h-12 shadow-xl bg-white/95 backdrop-blur text-red-500 hover:text-red-700" 
            onClick={() => { setRawTrace([]); toast.success('Cleared trace'); }}
          >
            <Eraser className="w-5 h-5" />
          </Button>
        )}
        <Button 
          variant="secondary" 
          size="icon" 
          className="rounded-full w-12 h-12 shadow-xl bg-white/95 backdrop-blur text-slate-700 hover:text-indigo-600" 
          onClick={() => setLocateTrigger(c => c + 1)}
        >
          <LocateFixed className="w-5 h-5" />
        </Button>
        <Button 
          variant={recording ? 'destructive' : 'default'} 
          size="icon" 
          className={`rounded-full w-12 h-12 shadow-xl ${!recording ? 'bg-indigo-600 hover:bg-indigo-700' : ''}`} 
          onClick={() => {
            if (recording) {
              setRecording(false);
              lastRecordedNodeRef.current = null;
              toast.info('Stopped recording path');
            } else {
              setRecording(true);
              toast.success('Started recording path');
            }
          }}
        >
          {recording ? <Square className="w-5 h-5" /> : <Play className="w-5 h-5" />}
        </Button>
      </div>

      {/* Selected Entity Floating Panel */}
      {(selectedNode && mode === 'view') && (
        <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+6rem)] left-4 right-20 md:right-auto md:w-[320px] z-20 transition-all duration-300">
          <Card className="shadow-2xl border-white/40 bg-white/95 backdrop-blur-xl">
            <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-slate-100">
              <CardTitle className="text-base font-bold flex items-center">
                <MapPin className="w-4 h-4 mr-2 text-indigo-500" /> Edit Node
              </CardTitle>
              <div className="flex gap-1 -mt-2 -mr-2">
                <Button variant="ghost" size="icon" onClick={() => setSelectedNode(null)} className="h-8 w-8 text-slate-400">
                  <X className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => deleteNode(selectedNode.id)} className="h-8 w-8 text-red-500 hover:bg-red-50">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-500 uppercase">Node Name</Label>
                <Input 
                  value={selectedNode.name} 
                  onChange={e => updateNode(selectedNode.id, { name: e.target.value })}
                  className="bg-white h-9"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-500 uppercase">Node Type</Label>
                <Select value={selectedNode.type} onValueChange={(val) => { if (val) updateNode(selectedNode.id, { type: val as NodeType }) }}>
                  <SelectTrigger className="bg-white h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="poi">POI (Destination)</SelectItem>
                    <SelectItem value="stamp">Stamp (Scavenger Hunt)</SelectItem>
                    <SelectItem value="gate">Gate (Entry/Exit)</SelectItem>
                    <SelectItem value="junction">Junction (Routing)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {selectedNode.type === 'stamp' && (
                <Button 
                  className="w-full bg-gradient-to-r from-pink-500 to-indigo-500 hover:from-pink-600 hover:to-indigo-600 text-white shadow-md font-bold mt-4 h-10"
                  onClick={() => setTestingStamp(selectedNode)}
                >
                  <Camera className="w-4 h-4 mr-2" /> Test AR Drop
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {(selectedEdge && mode === 'view') && (
        <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+6rem)] left-4 right-20 md:right-auto md:w-[300px] z-20 transition-all duration-300">
          <Card className="shadow-2xl border-white/40 bg-white/95 backdrop-blur-xl">
            <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-slate-100">
              <CardTitle className="text-base font-bold flex items-center">
                <Route className="w-4 h-4 mr-2 text-indigo-500" /> Path Segment
              </CardTitle>
              <div className="flex gap-1 -mt-2 -mr-2">
                <Button variant="ghost" size="icon" onClick={() => setSelectedEdge(null)} className="h-8 w-8 text-slate-400">
                  <X className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => deleteEdge(selectedEdge.from, selectedEdge.to)} className="h-8 w-8 text-red-500 hover:bg-red-50">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex justify-between items-center py-2 bg-slate-50 rounded-lg px-4 border border-slate-100">
                <span className="text-slate-500 font-medium text-sm">Distance</span>
                <span className="font-bold text-slate-800">{selectedEdge.distance_m} meters</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {mode === 'add_node' && (
        <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+6rem)] left-4 right-20 md:right-auto md:w-[320px] z-20 transition-all duration-300">
          <Card className="shadow-2xl border-indigo-200 bg-indigo-50/95 backdrop-blur-xl">
            <CardHeader className="pb-3 border-b border-indigo-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-indigo-900">New Node Settings</CardTitle>
                <CardDescription className="text-indigo-700/70 text-xs">Tap map to place node</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setMode('view')} className="h-8 w-8 text-indigo-400 hover:text-indigo-700 hover:bg-indigo-100 -mt-2 -mr-2">
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-indigo-800 uppercase">Name (Optional)</Label>
                <Input value={newNodeName} onChange={e => setNewNodeName(e.target.value)} placeholder="e.g. Glass House" className="bg-white border-indigo-200 h-9" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-indigo-800 uppercase">Type</Label>
                <Select value={newNodeType} onValueChange={(val) => { if (val) setNewNodeType(val as NodeType) }}>
                  <SelectTrigger className="bg-white border-indigo-200 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="poi">POI (Destination)</SelectItem>
                    <SelectItem value="stamp">Stamp (Scavenger Hunt)</SelectItem>
                    <SelectItem value="gate">Gate (Entry/Exit)</SelectItem>
                    <SelectItem value="junction">Junction (Routing)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Editing Toolbar - Bottom Center */}
      <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+1.5rem)] left-1/2 -translate-x-1/2 z-30 w-[95%] max-w-[360px] md:w-auto">
        <div className="bg-white/95 backdrop-blur-xl p-1.5 rounded-full shadow-2xl border border-slate-200/80 flex gap-1 justify-between items-center w-full">
          <Button 
            variant={mode === 'view' ? 'default' : 'ghost'} 
            className={`rounded-full px-4 md:px-5 h-12 md:h-11 ${mode === 'view' ? 'bg-indigo-600 hover:bg-indigo-700 shadow-md text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            onClick={() => { setMode('view'); setEdgeStartNode(null); }}
          >
            <MousePointer2 className="w-5 h-5 md:w-4 md:h-4 md:mr-2" /> <span className="hidden md:inline font-medium">Select</span>
          </Button>
          <Button 
            variant={mode === 'add_node' ? 'default' : 'ghost'} 
            className={`rounded-full px-4 md:px-5 h-12 md:h-11 ${mode === 'add_node' ? 'bg-indigo-600 hover:bg-indigo-700 shadow-md text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            onClick={() => { setMode('add_node'); setEdgeStartNode(null); }}
          >
            <MapPin className="w-5 h-5 md:w-4 md:h-4 md:mr-2" /> <span className="hidden md:inline font-medium">Add Node</span>
          </Button>
          <Button 
            variant={mode === 'add_edge' ? 'default' : 'ghost'} 
            className={`rounded-full px-4 md:px-5 h-12 md:h-11 ${mode === 'add_edge' ? 'bg-indigo-600 hover:bg-indigo-700 shadow-md text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            onClick={() => { setMode('add_edge'); setEdgeStartNode(null); }}
          >
            <Route className="w-5 h-5 md:w-4 md:h-4 md:mr-2" /> <span className="hidden md:inline font-medium">Connect Edge</span>
          </Button>
        </div>
      </div>
      
      {testingStamp && (
        <CameraView stampName={testingStamp.name || 'Unknown Stamp'} onClose={() => setTestingStamp(null)} />
      )}
    </div>
  );
}
