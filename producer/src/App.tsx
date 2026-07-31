import { useEffect, useState, useRef } from 'react';
import { supabase } from './lib/supabase';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents, CircleMarker, useMap, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Button } from './components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './components/ui/card';
import { Input } from './components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Label } from './components/ui/label';
import { MapPin, ArrowRight, Save, Trash2, Play, Square, LocateFixed, Megaphone, MousePointer2, Route, X, ChevronRight, Plus, Camera, Layers, Eraser } from 'lucide-react';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from './components/ui/sheet';
import { CameraView } from './components/CameraView';

const createNodeIcon = (type: string, isSelected: boolean) => {
  const color = type === 'poi' ? 'bg-amber-500' : type === 'stamp' ? 'bg-fuchsia-500' : 'bg-indigo-500';
  const glow = type === 'poi' ? 'shadow-amber-500/50' : type === 'stamp' ? 'shadow-fuchsia-500/50' : 'shadow-indigo-500/50';
  const scale = isSelected ? 'scale-125' : 'scale-100';
  const border = isSelected ? 'border-[3px] border-white' : 'border-2 border-white/90';
  
  return L.divIcon({
    className: 'bg-transparent border-0',
    html: `<div class="relative flex items-center justify-center w-10 h-10 -ml-1 -mt-1">
            <div class="absolute inset-0 rounded-full ${color} opacity-20 animate-pulse"></div>
            <div class="relative w-4 h-4 rounded-full ${color} ${border} shadow-lg ${glow} ${scale} transition-all duration-300"></div>
           </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

// Fix for default Leaflet icons in Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export type NodeType = 'gate' | 'poi' | 'junction' | 'stamp';

export interface Venue {
  id: string;
  name: string;
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

function MapClickHandler({ onClick }: { onClick: (latlng: L.LatLng) => void }) {
  useMapEvents({
    click: (e) => onClick(e.latlng),
  });
  return null;
}

function MapController({ center, trigger, initialCenter, initialZoom }: { center: L.LatLng | null, trigger: number, initialCenter: L.LatLngExpression, initialZoom: number }) {
  const map = useMap();
  const [initialCentered, setInitialCentered] = useState(false);

  useEffect(() => {
    map.setView(initialCenter, initialZoom);
  }, [initialCenter, initialZoom, map]);

  useEffect(() => {
    if (center && !initialCentered) {
      map.flyTo(center, 18, { animate: true });
      setInitialCentered(true);
    }
  }, [center, initialCentered, map]);

  useEffect(() => {
    if (center && trigger > 0) {
      map.flyTo(center, 18, { animate: true });
    }
  }, [trigger, center, map]); 

  return null;
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
  const [venues, setVenues] = useState<Venue[]>([]);
  const [currentVenue, setCurrentVenue] = useState<Venue | null>(null);
  const [loadingVenues, setLoadingVenues] = useState(true);
  const [showNewVenue, setShowNewVenue] = useState(false);
  const [newVenueForm, setNewVenueForm] = useState<Partial<Venue>>({ zoom: 16 });

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

  // Geolocation & Recording State
  const [currentLocation, setCurrentLocation] = useState<L.LatLng | null>(null);
  const [rawTrace, setRawTrace] = useState<L.LatLng[]>([]);
  const [recording, setRecording] = useState(false);
  const [locateTrigger, setLocateTrigger] = useState(0);
  const lastRecordedNodeRef = useRef<GraphNode | null>(null);

  // New Node Form
  const [newNodeName, setNewNodeName] = useState('');
  const [newNodeType, setNewNodeType] = useState<NodeType>('poi');
  const [testingStamp, setTestingStamp] = useState<GraphNode | null>(null);

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
        const pos = new L.LatLng(position.coords.latitude, position.coords.longitude);
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
    if (!newVenueForm.name || !newVenueForm.lat || !newVenueForm.lng) {
      toast.error('Name and coordinates are required');
      return;
    }
    const { data, error } = await supabase.from('venues').insert([{
      name: newVenueForm.name,
      lat: newVenueForm.lat,
      lng: newVenueForm.lng,
      zoom: newVenueForm.zoom || 16
    }]).select().single();

    if (error) {
      toast.error('Failed to create venue: ' + error.message);
    } else if (data) {
      toast.success('Venue created!');
      setVenues([data, ...venues]);
      setCurrentVenue(data);
      setShowNewVenue(false);
      setNewVenueForm({ zoom: 16 });
    }
  }

  async function loadGraph() {
    if (!currentVenue) return;
    setLoadingGraph(true);
    const graphKey = `graph_${currentVenue.id}`;
    
    const { data: row, error } = await supabase
      .from('content_blobs')
      .select('data')
      .eq('key', graphKey)
      .single();

    if (error) {
      console.log('No existing graph found for venue, starting fresh.');
      setData({ nodes: [], edges: [], sponsors: [] });
    } else if (row && row.data) {
      setData(row.data as GraphData);
    }
    setLoadingGraph(false);
  }

  async function saveGraph() {
    if (!currentVenue) return;
    setSaving(true);
    const graphKey = `graph_${currentVenue.id}`;
    
    const { error } = await supabase
      .from('content_blobs')
      .upsert({ 
        key: graphKey, 
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

  const handleMapClick = (latlng: L.LatLng) => {
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

  const handleEdgeClick = (edge: GraphEdge) => {
    if (mode === 'view') {
      setSelectedEdge(edge);
      setSelectedNode(null);
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
                <div className="space-y-2">
                  <Label>Venue Name</Label>
                  <Input placeholder="e.g. Central Park" value={newVenueForm.name || ''} onChange={e => setNewVenueForm(s => ({ ...s, name: e.target.value }))} />
                </div>
                
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
                    {venues.map(venue => (
                      <button
                        key={venue.id}
                        onClick={() => setCurrentVenue(venue)}
                        className="flex items-center justify-between p-4 rounded-lg hover:bg-indigo-50 transition-colors text-left group"
                      >
                        <div>
                          <div className="font-semibold text-slate-900 group-hover:text-indigo-700 transition-colors">{venue.name}</div>
                          <div className="text-xs text-slate-500 mt-1 font-mono">{venue.lat.toFixed(4)}, {venue.lng.toFixed(4)}</div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                      </button>
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
        
        <MapContainer center={[currentVenue.lat, currentVenue.lng]} zoom={currentVenue.zoom} className="w-full h-full z-0" zoomControl={false}>
          <TileLayer
            attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
          <MapController center={currentLocation} trigger={locateTrigger} initialCenter={[currentVenue.lat, currentVenue.lng]} initialZoom={currentVenue.zoom} />
          <MapClickHandler onClick={handleMapClick} />
          
          {currentLocation && (
            <CircleMarker 
              center={currentLocation}
              radius={7}
              pathOptions={{ color: 'white', fillColor: '#3b82f6', fillOpacity: 1, weight: 3 }}
            >
              <Popup>Your Location</Popup>
            </CircleMarker>
          )}
          
          {layers.paths && data.nodes.map(node => (
            <Marker 
              key={node.id} 
              position={[node.lat, node.lng]}
              icon={createNodeIcon(node.type, selectedNode?.id === node.id)}
              draggable={mode === 'view'}
              eventHandlers={{
                click: () => handleNodeClick(node),
                dragend: (e) => {
                  const marker = e.target;
                  const position = marker.getLatLng();
                  updateNodePosition(node.id, position.lat, position.lng);
                }
              }}
              opacity={mode === 'add_edge' && edgeStartNode?.id === node.id ? 0.5 : 1}
            >
            </Marker>
          ))}

          {layers.sponsors && data.sponsors.map(sponsor => {
            const node = data.nodes.find(n => n.id === sponsor.poi_id);
            if (!node) return null;
            return (
              <Circle 
                key={`s_${sponsor.id}`} 
                center={[node.lat, node.lng]} 
                radius={sponsor.radius_m}
                pathOptions={{ color: '#22c55e', fillColor: '#22c55e', fillOpacity: 0.25, weight: 2 }}
              />
            );
          })}

          {layers.paths && data.edges.map(edge => {
            const start = data.nodes.find(n => n.id === edge.from);
            const end = data.nodes.find(n => n.id === edge.to);
            if (!start || !end) return null;
            const isSelected = selectedEdge?.from === edge.from && selectedEdge?.to === edge.to;
            return (
              <div key={`${edge.from}-${edge.to}`}>
                {/* Glow layer */}
                <Polyline 
                  positions={[[start.lat, start.lng], [end.lat, end.lng]]}
                  color="#6366f1"
                  weight={isSelected ? 16 : 12}
                  opacity={isSelected ? 0.3 : 0.15}
                  lineCap="round"
                  eventHandlers={{ click: () => handleEdgeClick(edge) }}
                />
                {/* Core layer */}
                <Polyline 
                  positions={[[start.lat, start.lng], [end.lat, end.lng]]}
                  color={isSelected ? "#f59e0b" : "#6366f1"}
                  weight={isSelected ? 6 : 4}
                  opacity={1}
                  lineCap="round"
                  dashArray={mode === 'view' ? undefined : '8, 8'}
                  eventHandlers={{ click: () => handleEdgeClick(edge) }}
                />
              </div>
            );
          })}
          
          {layers.trace && rawTrace.length > 1 && (
            <div key="trace-layer">
              <Polyline 
                positions={rawTrace} 
                color="#ef4444" 
                weight={8} 
                opacity={0.2} 
                lineCap="round"
                dashArray="1, 8"
              />
              <Polyline 
                positions={rawTrace} 
                color="#ef4444" 
                weight={3} 
                opacity={0.8} 
                lineCap="round"
                dashArray="4, 6"
              />
            </div>
          )}
        </MapContainer>
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
