import { useEffect, useState, useRef } from 'react';
import { supabase } from './lib/supabase';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents, CircleMarker, useMap, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Button } from './components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Input } from './components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Label } from './components/ui/label';
import { MapPin, ArrowRight, Save, Trash2, Play, Square, LocateFixed, Megaphone } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { ScrollArea } from './components/ui/scroll-area';
import { Badge } from './components/ui/badge';
import { Separator } from './components/ui/separator';

// Fix for default Leaflet icons in Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Lalbagh Approximate Center
const LALBAGH_CENTER: [number, number] = [12.9500, 77.5850];

export type NodeType = 'gate' | 'poi' | 'junction' | 'stamp';

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

function MapController({ center, trigger }: { center: L.LatLng | null, trigger: number }) {
  const map = useMap();
  const [initialCentered, setInitialCentered] = useState(false);

  // Center on first GPS fix
  useEffect(() => {
    if (center && !initialCentered) {
      map.flyTo(center, 18, { animate: true });
      setInitialCentered(true);
    }
  }, [center, initialCentered, map]);

  // Center on manual button click
  useEffect(() => {
    if (center && trigger > 0) {
      map.flyTo(center, 18, { animate: true });
    }
  }, [trigger]); // intentionally only relying on trigger so it works even if center hasn't changed

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
  const [data, setData] = useState<GraphData>({ nodes: [], edges: [], sponsors: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Editor State
  const [mode, setMode] = useState<'view' | 'add_node' | 'add_edge'>('view');
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<GraphEdge | null>(null);
  const [edgeStartNode, setEdgeStartNode] = useState<GraphNode | null>(null);

  // Sponsor State
  const [editingSponsorId, setEditingSponsorId] = useState<string | null>(null);
  const [sponsorForm, setSponsorForm] = useState<Partial<SponsorZone>>({});

  // Geolocation & Recording State
  const [currentLocation, setCurrentLocation] = useState<L.LatLng | null>(null);
  const [rawTrace, setRawTrace] = useState<L.LatLng[]>([]);
  const [recording, setRecording] = useState(false);
  const [locateTrigger, setLocateTrigger] = useState(0);
  const lastRecordedNodeRef = useRef<GraphNode | null>(null);

  // New Node Form
  const [newNodeName, setNewNodeName] = useState('');
  const [newNodeType, setNewNodeType] = useState<NodeType>('poi');

  useEffect(() => {
    loadGraph();

    // Start watching position
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const pos = new L.LatLng(position.coords.latitude, position.coords.longitude);
        setCurrentLocation(pos);
        setRawTrace(prev => [...prev, pos]);
      },
      (error) => console.error("Error watching position:", error),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  useEffect(() => {
    if (!currentLocation || !recording) return;

    const lastNode = lastRecordedNodeRef.current;
    
    if (!lastNode) {
      // First node in this recording session
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
      // Check distance from last node
      const dist = distanceInMeters(lastNode.lat, lastNode.lng, currentLocation.lat, currentLocation.lng);
      if (dist >= 5) { // 5 meters threshold
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

  async function loadGraph() {
    setLoading(true);
    const { data: row, error } = await supabase
      .from('content_blobs')
      .select('data')
      .eq('key', 'graph')
      .single();

    if (error) {
      console.log('No existing graph found or error fetching:', error);
      setData({ nodes: [], edges: [], sponsors: [] });
    } else if (row && row.data) {
      setData(row.data as GraphData);
    }
    setLoading(false);
  }

  async function saveGraph() {
    setSaving(true);
    const { error } = await supabase
      .from('content_blobs')
      .upsert({ 
        key: 'graph', 
        data: data, 
        version: Math.floor(Date.now() / 1000), 
        updated_at: new Date().toISOString() 
      });

    if (error) {
      alert('Error saving graph: ' + error.message);
    } else {
      alert('Graph saved successfully!');
    }
    setSaving(false);
  }

  const saveSponsor = () => {
    if (!sponsorForm.poi_id || !sponsorForm.name || !sponsorForm.radius_m) return;
    
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
    }
  };

  const handleNodeClick = (node: GraphNode) => {
    if (mode === 'add_edge') {
      if (!edgeStartNode) {
        setEdgeStartNode(node);
      } else {
        if (edgeStartNode.id !== node.id) {
          // Check if edge already exists
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
  };

  const deleteEdge = (from: string, to: string) => {
    setData(prev => ({
      ...prev,
      edges: prev.edges.filter(e => !(e.from === from && e.to === to))
    }));
    setSelectedEdge(null);
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
    // If the selected node was dragged, we need to update its display too
    setSelectedNode(prev => (prev && prev.id === id) ? { ...prev, lat, lng } : prev);
  };

  return (
    <div className="flex flex-col-reverse md:flex-row h-[100dvh] w-full font-sans text-slate-800">
      {/* Sidebar Tools */}
      <div className="w-full md:w-80 bg-white border-t md:border-t-0 md:border-r border-slate-200 flex flex-col shadow-lg z-10 relative h-[45vh] md:h-full shrink-0">
        <div className="p-4 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
          <h1 className="font-bold text-lg">Wayon.top Producer</h1>
          <Button size="sm" variant="secondary" onClick={saveGraph} disabled={saving}>
            {saving ? 'Saving...' : <><Save className="w-4 h-4 mr-2" /> Save</>}
          </Button>
        </div>

        <Tabs defaultValue="map" className="flex flex-col flex-1 overflow-hidden">
          <div className="px-4 pt-4 pb-3 border-b border-slate-200 bg-slate-50/50">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="map">Map Tools</TabsTrigger>
              <TabsTrigger value="sponsors">Sponsors</TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4">
              <TabsContent value="map" className="m-0 space-y-6">
                <div className="space-y-3">
                  <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Node Tools</h2>
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      variant={mode === 'view' ? 'default' : 'outline'} 
                      onClick={() => { setMode('view'); setEdgeStartNode(null); }}
                    >
                      Select
                    </Button>
                    <Button 
                      variant={mode === 'add_node' ? 'default' : 'outline'} 
                      onClick={() => { setMode('add_node'); setEdgeStartNode(null); }}
                    >
                      <MapPin className="w-4 h-4 mr-2" /> Add Node
                    </Button>
                    <Button 
                      variant={mode === 'add_edge' ? 'default' : 'outline'} 
                      onClick={() => { setMode('add_edge'); setEdgeStartNode(null); }}
                      className="col-span-2"
                    >
                      <ArrowRight className="w-4 h-4 mr-2" /> 
                      {edgeStartNode ? 'Select Target Node...' : 'Add Path Edge'}
                    </Button>
                  </div>
                </div>

                <Separator />
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">GPS Record</h2>
                    <Button variant="ghost" size="sm" onClick={() => setLocateTrigger(c => c + 1)} className="h-6 text-xs text-blue-600 hover:text-blue-800">
                      <LocateFixed className="w-3 h-3 mr-1" /> Locate Me
                    </Button>
                  </div>
                  <Button 
                    variant={recording ? 'destructive' : 'outline'} 
                    onClick={() => {
                      if (recording) {
                        setRecording(false);
                        lastRecordedNodeRef.current = null;
                      } else {
                        setRecording(true);
                      }
                    }}
                    className={`w-full ${recording ? '' : 'border-indigo-600 text-indigo-600 hover:bg-indigo-50'}`}
                  >
                    {recording ? <><Square className="w-4 h-4 mr-2" /> Stop Recording</> : <><Play className="w-4 h-4 mr-2" /> Record Path (Walk)</>}
                  </Button>
                  {currentLocation && (
                    <p className="text-xs text-slate-500 text-center">
                      Location active: {currentLocation.lat.toFixed(5)}, {currentLocation.lng.toFixed(5)}
                    </p>
                  )}
                </div>

                {mode === 'add_node' && (
                  <>
                    <Separator />
                    <Card className="border-blue-200 shadow-sm bg-blue-50/50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">New Node Details</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-1">
                          <Label>Name (optional for junctions)</Label>
                          <Input value={newNodeName} onChange={e => setNewNodeName(e.target.value)} placeholder="e.g. Glass House" />
                        </div>
                        <div className="space-y-1">
                          <Label>Type</Label>
                          <Select value={newNodeType} onValueChange={(val) => { if (val) setNewNodeType(val as NodeType) }}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="poi">POI (Destination)</SelectItem>
                              <SelectItem value="stamp">Stamp (Scavenger Hunt)</SelectItem>
                              <SelectItem value="gate">Gate (Entry/Exit)</SelectItem>
                              <SelectItem value="junction">Junction (Routing only)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <p className="text-xs text-slate-500 italic">Click anywhere on the map to place this node.</p>
                      </CardContent>
                    </Card>
                  </>
                )}

                {selectedNode && mode === 'view' && (
                  <>
                    <Separator />
                    <Card className="shadow-sm border-slate-200">
                      <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm truncate pr-4">{selectedNode.name}</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => deleteNode(selectedNode.id)} className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 -mr-2">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between border-b pb-1">
                            <span className="text-slate-500">ID</span>
                            <span className="font-mono text-xs">{selectedNode.id}</span>
                          </div>
                          <div className="flex justify-between border-b pb-1">
                            <span className="text-slate-500">Type</span>
                            <Badge variant="secondary" className="capitalize text-[10px] h-5">{selectedNode.type}</Badge>
                          </div>
                          <div className="flex justify-between border-b pb-1">
                            <span className="text-slate-500">Coords</span>
                            <span className="font-mono text-xs">{selectedNode.lat.toFixed(5)}, {selectedNode.lng.toFixed(5)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}

                {selectedEdge && mode === 'view' && (
                  <>
                    <Separator />
                    <Card className="shadow-sm border-slate-200">
                      <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm truncate pr-4">Path Segment</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => deleteEdge(selectedEdge.from, selectedEdge.to)} className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 -mr-2">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between border-b pb-1">
                            <span className="text-slate-500">Distance</span>
                            <span className="font-mono text-xs">{selectedEdge.distance_m} m</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}
                
                <Separator />
                
                <div className="space-y-1">
                  <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Graph Stats</h2>
                  <p className="text-sm flex justify-between"><span>Nodes:</span> <Badge variant="outline">{data.nodes.length}</Badge></p>
                  <p className="text-sm flex justify-between"><span>Edges:</span> <Badge variant="outline">{data.edges.length}</Badge></p>
                </div>
              </TabsContent>

              <TabsContent value="sponsors" className="m-0 space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Sponsor Zones</h2>
                  <Button size="sm" onClick={() => { setEditingSponsorId(null); setSponsorForm({}); }}>+ New</Button>
                </div>

                {(editingSponsorId || Object.keys(sponsorForm).length > 0) && (
                  <Card className="border-green-200 shadow-sm bg-green-50/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">{editingSponsorId ? 'Edit Sponsor' : 'New Sponsor'}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Sponsor Name</Label>
                        <Input value={sponsorForm.name || ''} onChange={e => setSponsorForm(s => ({ ...s, name: e.target.value }))} className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Location (Node ID)</Label>
                        <Select value={sponsorForm.poi_id} onValueChange={v => setSponsorForm(s => ({ ...s, poi_id: v }))}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select a Node..." /></SelectTrigger>
                          <SelectContent>
                            {data.nodes.map(n => <SelectItem key={n.id} value={n.id}>{n.name || n.id} ({n.type})</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Radius (meters)</Label>
                        <Input type="number" value={sponsorForm.radius_m || ''} onChange={e => setSponsorForm(s => ({ ...s, radius_m: Number(e.target.value) }))} className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Tagline</Label>
                        <Input value={sponsorForm.tagline || ''} onChange={e => setSponsorForm(s => ({ ...s, tagline: e.target.value }))} className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Logo Asset URL</Label>
                        <Input value={sponsorForm.logo_asset || ''} onChange={e => setSponsorForm(s => ({ ...s, logo_asset: e.target.value }))} className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Banner Asset URL</Label>
                        <Input value={sponsorForm.banner_asset || ''} onChange={e => setSponsorForm(s => ({ ...s, banner_asset: e.target.value }))} className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Video Asset URL</Label>
                        <Input value={sponsorForm.video_asset || ''} onChange={e => setSponsorForm(s => ({ ...s, video_asset: e.target.value }))} className="h-8 text-sm" />
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button size="sm" onClick={saveSponsor} className="flex-1 bg-green-600 hover:bg-green-700">Save</Button>
                        <Button size="sm" variant="outline" onClick={() => { setEditingSponsorId(null); setSponsorForm({}); }}>Cancel</Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="space-y-3">
                  {data.sponsors.map(sponsor => (
                    <Card key={sponsor.id} className="shadow-sm">
                      <CardHeader className="p-3 pb-0 flex flex-row justify-between items-start">
                        <div>
                          <CardTitle className="text-sm">{sponsor.name}</CardTitle>
                          <p className="text-xs text-slate-500 truncate mt-0.5">{sponsor.tagline}</p>
                        </div>
                        <div className="flex -mt-1 -mr-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingSponsorId(sponsor.id); setSponsorForm(sponsor); }}>
                            <Megaphone className="w-3.5 h-3.5 text-slate-500" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => deleteSponsor(sponsor.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="p-3 pt-2 text-xs text-slate-600">
                        <div className="flex justify-between"><span>Radius:</span> <Badge variant="secondary">{sponsor.radius_m}m</Badge></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
      </div>

      {/* Main Map */}
      <div className="flex-1 relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100 z-50">
            <div className="animate-spin w-8 h-8 border-4 border-slate-300 border-t-slate-800 rounded-full"></div>
          </div>
        ) : null}
        <MapContainer center={LALBAGH_CENTER} zoom={16} className="w-full h-full z-0">
          <TileLayer
            attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
          <MapController center={currentLocation} trigger={locateTrigger} />
          <MapClickHandler onClick={handleMapClick} />
          
          {currentLocation && (
            <CircleMarker 
              center={currentLocation}
              radius={6}
              pathOptions={{ color: 'white', fillColor: '#3b82f6', fillOpacity: 1, weight: 2 }}
            >
              <Popup>Your Location</Popup>
            </CircleMarker>
          )}
          
          {data.nodes.map(node => (
            <Marker 
              key={node.id} 
              position={[node.lat, node.lng]}
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
              <Popup>{node.name} ({node.type})</Popup>
            </Marker>
          ))}

          {data.sponsors.map(sponsor => {
            const node = data.nodes.find(n => n.id === sponsor.poi_id);
            if (!node) return null;
            return (
              <Circle 
                key={`s_${sponsor.id}`} 
                center={[node.lat, node.lng]} 
                radius={sponsor.radius_m}
                pathOptions={{ color: '#22c55e', fillColor: '#22c55e', fillOpacity: 0.2, weight: 2 }}
              />
            );
          })}

          {data.edges.map(edge => {
            const start = data.nodes.find(n => n.id === edge.from);
            const end = data.nodes.find(n => n.id === edge.to);
            if (!start || !end) return null;
            return (
              <Polyline 
                key={`${edge.from}-${edge.to}`} 
                positions={[[start.lat, start.lng], [end.lat, end.lng]]} 
                color={selectedEdge?.from === edge.from && selectedEdge?.to === edge.to ? "#f59e0b" : "#00f"} 
                weight={selectedEdge?.from === edge.from && selectedEdge?.to === edge.to ? 5 : 3} 
                opacity={0.6}
                eventHandlers={{
                  click: () => handleEdgeClick(edge)
                }}
                className="cursor-pointer"
              />
            );
          })}
          
          {rawTrace.length > 1 && (
            <Polyline 
              positions={rawTrace} 
              color="#ef4444" 
              weight={2} 
              opacity={0.5} 
              dashArray="5, 5"
              interactive={false}
            />
          )}
        </MapContainer>
        
        {/* Helper overlay for edge drawing */}
        {mode === 'add_edge' && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-4 py-2 rounded-full shadow-lg z-[1000] text-sm pointer-events-none flex items-center animate-pulse">
            <ArrowRight className="w-4 h-4 mr-2" />
            {edgeStartNode ? 'Select the target node to complete path' : 'Select a starting node for the path'}
          </div>
        )}
      </div>
    </div>
  );
}
