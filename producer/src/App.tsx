import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Button } from './components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Input } from './components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Label } from './components/ui/label';
import { MapPin, ArrowRight, Save, Trash2 } from 'lucide-react';

// Fix for default Leaflet icons in Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Lalbagh Approximate Center
const LALBAGH_CENTER: [number, number] = [12.9500, 77.5850];

export type NodeType = 'gate' | 'poi' | 'junction';

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
  const [edgeStartNode, setEdgeStartNode] = useState<GraphNode | null>(null);

  // New Node Form
  const [newNodeName, setNewNodeName] = useState('');
  const [newNodeType, setNewNodeType] = useState<NodeType>('poi');

  useEffect(() => {
    loadGraph();
  }, []);

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

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] w-full font-sans text-slate-800">
      {/* Sidebar Tools */}
      <div className="w-full md:w-80 bg-white border-b md:border-r border-slate-200 flex flex-col shadow-lg z-10 relative overflow-y-auto max-h-[40vh] md:max-h-none shrink-0">
        <div className="p-4 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
          <h1 className="font-bold text-lg">Wayon.top Producer</h1>
          <Button size="sm" variant="secondary" onClick={saveGraph} disabled={saving}>
            {saving ? 'Saving...' : <><Save className="w-4 h-4 mr-2" /> Save</>}
          </Button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          <div className="mb-6 space-y-2">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Tools</h2>
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

          {mode === 'add_node' && (
            <Card className="mb-6 border-blue-200 shadow-sm bg-blue-50/50">
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
                      <SelectItem value="gate">Gate (Entry/Exit)</SelectItem>
                      <SelectItem value="junction">Junction (Routing only)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-slate-500 italic">Click anywhere on the map to place this node.</p>
              </CardContent>
            </Card>
          )}

          {selectedNode && mode === 'view' && (
            <Card className="mb-6 shadow-sm border-slate-200">
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
                    <span className="capitalize">{selectedNode.type}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-slate-500">Coords</span>
                    <span className="font-mono text-xs">{selectedNode.lat.toFixed(5)}, {selectedNode.lng.toFixed(5)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-1 mt-8">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Graph Stats</h2>
            <p className="text-sm flex justify-between"><span>Nodes:</span> <span className="font-semibold">{data.nodes.length}</span></p>
            <p className="text-sm flex justify-between"><span>Edges:</span> <span className="font-semibold">{data.edges.length}</span></p>
            <p className="text-sm flex justify-between"><span>Sponsors:</span> <span className="font-semibold">{data.sponsors.length}</span></p>
          </div>
        </div>
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
          <MapClickHandler onClick={handleMapClick} />
          
          {data.nodes.map(node => (
            <Marker 
              key={node.id} 
              position={[node.lat, node.lng]}
              eventHandlers={{
                click: () => handleNodeClick(node)
              }}
              opacity={mode === 'add_edge' && edgeStartNode?.id === node.id ? 0.5 : 1}
            >
              <Popup>{node.name} ({node.type})</Popup>
            </Marker>
          ))}

          {data.edges.map(edge => {
            const start = data.nodes.find(n => n.id === edge.from);
            const end = data.nodes.find(n => n.id === edge.to);
            if (!start || !end) return null;
            return (
              <Polyline 
                key={`${edge.from}-${edge.to}`} 
                positions={[[start.lat, start.lng], [end.lat, end.lng]]} 
                color="#00f" 
                weight={3} 
                opacity={0.6}
              />
            );
          })}
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
