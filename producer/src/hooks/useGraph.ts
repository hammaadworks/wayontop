import {useCallback, useEffect, useRef, useState} from 'react';
import {supabase} from '@wayontop/ui/lib/supabase';
import {toast} from 'sonner';
import type {GraphData} from '@wayontop/ui/lib/types';
import type {Venue} from './useVenues';

export type SyncState = 'idle' | 'unsaved' | 'saving' | 'saved' | 'error' | 'offline';

export function useGraph(currentVenue: Venue | null) {
    const [state, setState] = useState<{
        data: GraphData;
        history: GraphData[];
        historyIndex: number;
    }>({
        data: {nodes: [], edges: [], sponsorZones: [], sponsors: [], defaultAds: [], categories: [], events: []},
        history: [],
        historyIndex: -1
    });

    const data = state.data;
    const history = state.history;
    const historyIndex = state.historyIndex;


    const setData = useCallback((action: React.SetStateAction<GraphData>) => {
        setState(prev => {
            const nextData = typeof action === 'function' ? (action as any)(prev.data) : action;
            if (JSON.stringify(prev.data) === JSON.stringify(nextData)) {
                return prev;
            }
            const newHistory = prev.history.slice(0, prev.historyIndex + 1);
            return {
                data: nextData,
                history: [...newHistory, nextData],
                historyIndex: prev.historyIndex + 1
            };
        });
    }, []);

    const undo = useCallback(() => {
        setState(prev => {
            if (prev.historyIndex > 0) {
                return {
                    ...prev,
                    historyIndex: prev.historyIndex - 1,
                    data: prev.history[prev.historyIndex - 1]
                };
            }
            return prev;
        });
    }, []);

    const redo = useCallback(() => {
        setState(prev => {
            if (prev.historyIndex < prev.history.length - 1) {
                return {
                    ...prev,
                    historyIndex: prev.historyIndex + 1,
                    data: prev.history[prev.historyIndex + 1]
                };
            }
            return prev;
        });
    }, []);

    const canUndo = historyIndex > 0;
    const canRedo = historyIndex < history.length - 1;

    const [loadingGraph, setLoadingGraph] = useState(true);
    const [syncState, setSyncState] = useState<SyncState>('idle');
    const [timeUntilSync, setTimeUntilSync] = useState<number | null>(null);
    const lastSavedData = useRef<string>('');
    
    // Migration helper
    const migrateGraphData = (dataToMigrate: any): GraphData => {
        const migrated = { ...dataToMigrate };
        if (!migrated.sponsorZones) migrated.sponsorZones = [];
        if (!migrated.sponsors) migrated.sponsors = [];
        
        if (migrated.sponsors && migrated.sponsors.length > 0 && typeof migrated.sponsors[0].poi_id !== 'undefined') {
            // Old format detected
            const oldSponsors = migrated.sponsors;
            migrated.sponsorZones = oldSponsors.map((s: any) => {
                const isFilled = s.logo_asset || s.creative_asset || s.tagline;
                const spId = isFilled ? `sp_${s.id}` : undefined;
                return {
                    id: s.id,
                    name: s.name,
                    poi_ids: [s.poi_id],
                    radius_m: s.radius_m,
                    sponsor_ids: spId ? [spId] : []
                };
            });
            migrated.sponsors = oldSponsors.filter((s: any) => s.logo_asset || s.creative_asset || s.tagline).map((s: any) => ({
                id: `sp_${s.id}`,
                name: s.name,
                logo_asset: s.logo_asset,
                creative_asset: s.creative_asset,
                tagline: s.tagline,
                cta_link: '',
                is_default_ad: false
            }));
        } else {
            // Ensure poi_ids and sponsor_ids exist on existing zones
            migrated.sponsorZones = migrated.sponsorZones.map((z: any) => ({
                ...z,
                poi_ids: z.poi_ids || (z.poi_id ? [z.poi_id] : []),
                sponsor_ids: z.sponsor_ids || (z.sponsor_id ? [z.sponsor_id] : [])
            }));
        }
        return migrated;
    };

    const loadGraph = useCallback(async () => {
        if (!currentVenue) return;
        setLoadingGraph(true);

        let remoteData: GraphData | null = null;
        let remoteTimestamp = 0;

        const {data: blob, error} = await supabase.from('venue_content')
            .select('data, updated_at')
            .eq('venue_key', currentVenue.key)
            .eq('content_type', 'graph')
            .single();

        if (error && error.code !== 'PGRST116') {
            toast.error('Failed to load graph: ' + error.message);
        } else if (blob?.data) {
            remoteData = migrateGraphData(blob.data);
            remoteTimestamp = new Date(blob.updated_at).getTime();
        }

        const localRaw = localStorage.getItem(`wayontop_graph_${currentVenue.key}`);
        let localData: GraphData | null = null;
        let localTimestamp = 0;

        if (localRaw) {
            try {
                const parsed = JSON.parse(localRaw);
                if (parsed.data && parsed.timestamp) {
                    localData = migrateGraphData(parsed.data);
                    localTimestamp = parsed.timestamp;
                }
            } catch (e) {
                console.error("Local storage parse error", e);
            }
        }

        let finalData: GraphData;

        if (localData && localTimestamp > remoteTimestamp) {
            finalData = localData;
            lastSavedData.current = JSON.stringify(localData);

            setSyncState('saving');
            const graphStamps = localData.nodes
                .filter((n: any) => n.category?.base_type === 'stamp' || n.has_stamp)
                .map((n: any) => ({
                    id: n.id,
                    name: n.name || 'Hidden Stamp',
                    lat: n.lat,
                    lng: n.lng,
                    model_url: '/assets/models/stamp.glb',
                    ar_scale: 1,
                    points: 10
                }));

            supabase.from('venue_content').upsert([
                {
                    venue_key: currentVenue.key,
                    content_type: 'graph',
                    data: localData,
                    version: Math.floor(Date.now() / 1000),
                    updated_at: new Date().toISOString()
                },
                {
                    venue_key: currentVenue.key,
                    content_type: 'stamps',
                    data: {stamps: graphStamps},
                    version: Math.floor(Date.now() / 1000),
                    updated_at: new Date().toISOString()
                }
            ], {onConflict: 'venue_key,content_type'}).then(({error: syncError}) => {
                if (syncError) {
                    console.error("Initial sync save error:", syncError);
                    toast.error(syncError.message || 'Failed to sync');
                    setSyncState('error');
                } else {
                    setSyncState('saved');
                    setTimeout(() => setSyncState('idle'), 3000);
                }
            });
        } else if (remoteData) {
            finalData = remoteData;
            lastSavedData.current = JSON.stringify(remoteData);
            localStorage.setItem(`wayontop_graph_${currentVenue.key}`, JSON.stringify({
                data: remoteData,
                timestamp: remoteTimestamp
            }));
        } else {
            finalData = {nodes: [], edges: [], sponsorZones: [], sponsors: [], defaultAds: [], categories: [], events: []};
            lastSavedData.current = JSON.stringify(finalData);
        }

        setState({
            data: finalData,
            history: [finalData],
            historyIndex: 0
        });
        setLoadingGraph(false);
    }, [currentVenue]);

    useEffect(() => {
        if (currentVenue) {
            void loadGraph();
        }
    }, [currentVenue, loadGraph]);

    useEffect(() => {
        if (!currentVenue || loadingGraph) return;
        const currentStr = JSON.stringify(data);
        if (currentStr !== lastSavedData.current) {
            setSyncState('unsaved');
            localStorage.setItem(`wayontop_graph_${currentVenue.key}`, JSON.stringify({
                data,
                timestamp: Date.now()
            }));
        }
    }, [data, currentVenue, loadingGraph]);

    // Network listener
    useEffect(() => {
        const handleOnline = () => setSyncState(prev => prev === 'offline' ? 'unsaved' : prev);
        const handleOffline = () => setSyncState('offline');
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        if (!navigator.onLine) setSyncState('offline');
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const saveGraphRef = useRef<(() => Promise<void>) | undefined>(undefined);

    // Auto-save timer
    useEffect(() => {
        let intervalId: number | undefined;

        if (syncState === 'unsaved') {
            setTimeUntilSync(10);
            intervalId = window.setInterval(() => {
                setTimeUntilSync(prev => {
                    if (prev === null) return null;
                    if (prev <= 1) return 0;
                    return prev - 1;
                });
            }, 1000);
        } else {
            setTimeUntilSync(null);
        }

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [syncState]);

    useEffect(() => {
        if (timeUntilSync === 0) {
            if (saveGraphRef.current) {
                saveGraphRef.current();
            }
        }
    }, [timeUntilSync]);

    const saveGraph = async () => {
        if (!currentVenue || loadingGraph) return;

        const currentStr = JSON.stringify(data);
        if (currentStr === lastSavedData.current) return;

        if (!navigator.onLine) {
            setSyncState('offline');
            return;
        }
        setSyncState('saving');

        try {
            // Step 1: Query the Database to Find Deletions
            const { data: dbNodes, error: dbNodesErr } = await supabase.from('nodes').select('id').eq('venue_key', currentVenue.key);
            if (dbNodesErr) throw dbNodesErr;
            const { data: dbEdges, error: dbEdgesErr } = await supabase.from('edges').select('id').eq('venue_key', currentVenue.key);
            if (dbEdgesErr) throw dbEdgesErr;

            const dbNodeIds = new Set((dbNodes || []).map(n => n.id));
            const dbEdgeIds = new Set((dbEdges || []).map(e => e.id));

            const currentNodeIds = new Set(data.nodes.filter(n => n.id > 0).map(n => n.id));
            const currentEdgeIds = new Set(data.edges.filter(e => e.id).map(e => e.id));

            const nodeIdsToDelete = [...dbNodeIds].filter(id => !currentNodeIds.has(id));
            const edgeIdsToDelete = [...dbEdgeIds].filter(id => !currentEdgeIds.has(id));

            // Execute deletions early to avoid foreign key issues when recreating edges/nodes
            if (edgeIdsToDelete.length > 0) {
                const { error: delEdgeErr } = await supabase.from('edges').delete().in('id', edgeIdsToDelete);
                if (delEdgeErr) throw delEdgeErr;
            }
            if (nodeIdsToDelete.length > 0) {
                const { error: delNodeErr } = await supabase.from('nodes').delete().in('id', nodeIdsToDelete);
                if (delNodeErr) throw delNodeErr;
            }

            // Step 2: Handle New Nodes (Negative IDs)
            const newNodes = data.nodes.filter(n => n.id < 0);
            const existingNodes = data.nodes.filter(n => n.id > 0);
            const idMapping = new Map<number, number>();

            for (const tempNode of newNodes) {
                const { 
                    id: fakeId, category_id, lat, lng, name, description, 
                    synonyms, image_url, status, is_paid, event_id 
                } = tempNode as any;
                
                const insertPayload = {
                    category_id, lat, lng, name, description, synonyms, 
                    image_url, status, is_paid, event_id,
                    venue_key: currentVenue.key
                };

                const { data: savedNode, error } = await supabase
                    .from('nodes')
                    .insert(insertPayload)
                    .select()
                    .single();
                    
                if (error) throw error;
                idMapping.set(fakeId, savedNode.id);
            }

            // Step 3: Update Existing Nodes
            if (existingNodes.length > 0) {
                const { error: upsertError } = await supabase
                    .from('nodes')
                    .upsert(existingNodes.map((n: any) => {
                        const { 
                            id, category_id, lat, lng, name, description, 
                            synonyms, image_url, status, is_paid, event_id 
                        } = n;
                        
                        return {
                            id, category_id, lat, lng, name, description, synonyms, 
                            image_url, status, is_paid, event_id,
                            venue_key: currentVenue.key
                        };
                    }));
                if (upsertError) throw upsertError;
            }

            // Step 4: Fix and Save Edges
            const edgesToSave = data.edges.map(edge => {
                const actualFromId = idMapping.get(edge.from) || edge.from;
                const actualToId = idMapping.get(edge.to) || edge.to;
                
                const edgePayload: any = {
                    venue_key: currentVenue.key,
                    from_node_id: actualFromId,
                    to_node_id: actualToId,
                    distance_m: edge.distance_m || (edge as any).weight || 0,
                    is_accessible: (edge as any).is_accessible ?? true,
                    geometry: edge.geometry,
                    is_hidden: edge.is_hidden ?? false
                };
                if (edge.id) {
                    edgePayload.id = edge.id;
                }
                return edgePayload;
            });

            const edgeIdMapping = new Map<string, string>();

            if (edgesToSave.length > 0) {
                const { data: savedEdges, error: edgeError } = await supabase.from('edges').upsert(edgesToSave).select('id, from_node_id, to_node_id');
                if (edgeError) throw edgeError;
                
                if (savedEdges) {
                    savedEdges.forEach(dbEdge => {
                        const key = `${dbEdge.from_node_id}-${dbEdge.to_node_id}`;
                        edgeIdMapping.set(key, dbEdge.id);
                    });
                }
            }

            // Step 6: Save Legacy Data (Sponsors) to venue_content
            // Note: Consumer reads categories and events directly from relational tables now.
            // It only relies on venue_content for sponsors, sponsorZones, and defaultAds.
            
            // Fix: Map poi_ids in sponsorZones to real DB IDs if they were assigned to unsaved new nodes
            const updatedSponsorZones = data.sponsorZones.map(zone => ({
                ...zone,
                poi_ids: (zone.poi_ids || []).map(id => idMapping.get(id) || id),
                poi_id: zone.poi_id ? (idMapping.get(zone.poi_id) || zone.poi_id) : undefined
            }));

            const legacyGraphData = {
                sponsorZones: updatedSponsorZones,
                sponsors: data.sponsors,
                defaultAds: data.defaultAds
            };

            const { error: legacyError } = await supabase.from('venue_content').upsert([
                {
                    venue_key: currentVenue.key,
                    content_type: 'graph',
                    data: legacyGraphData,
                    version: Math.floor(Date.now() / 1000),
                    updated_at: new Date().toISOString()
                }
            ], { onConflict: 'venue_key,content_type' });
            
            if (legacyError) throw legacyError;

            // Step 7: Update Local React State
            if (idMapping.size > 0 || edgeIdMapping.size > 0) {
                setData((prevData: GraphData) => {
                    const updatedNodes = prevData.nodes.map(n => 
                        idMapping.has(n.id) ? { ...n, id: idMapping.get(n.id)! } : n
                    );
                    
                    const updatedEdges = prevData.edges.map(e => {
                        const actualFrom = idMapping.get(e.from) || e.from;
                        const actualTo = idMapping.get(e.to) || e.to;
                        const edgeKey = `${actualFrom}-${actualTo}`;
                        return {
                            ...e,
                            from: actualFrom,
                            to: actualTo,
                            id: edgeIdMapping.get(edgeKey) || e.id
                        };
                    });
                    
                    return { ...prevData, nodes: updatedNodes, edges: updatedEdges, sponsorZones: updatedSponsorZones };
                });
            }

            setSyncState('saved');
            setTimeout(() => setSyncState('idle'), 3000);
            
            // Re-calculate the current string with new IDs to avoid unnecessary saves
            const finalNodes = data.nodes.map(n => idMapping.has(n.id) ? { ...n, id: idMapping.get(n.id)! } : n);
            const finalEdges = data.edges.map(e => {
                const actualFrom = idMapping.get(e.from) || e.from;
                const actualTo = idMapping.get(e.to) || e.to;
                const edgeKey = `${actualFrom}-${actualTo}`;
                return {
                    ...e,
                    from: actualFrom,
                    to: actualTo,
                    id: edgeIdMapping.get(edgeKey) || e.id
                };
            });
            const finalData = { ...data, nodes: finalNodes, edges: finalEdges, sponsorZones: updatedSponsorZones };
            
            lastSavedData.current = JSON.stringify(finalData);
            localStorage.setItem(`wayontop_graph_${currentVenue.key}`, JSON.stringify({
                data: finalData,
                timestamp: Date.now()
            }));

        } catch (error: any) {
            console.error("Save error:", error);
            toast.error(error.message || 'Failed to save');
            setSyncState('error');
        }
    };

    useEffect(() => {
        saveGraphRef.current = saveGraph;
    });

    return {data, setData, loadingGraph, saveGraph, syncState, undo, redo, canUndo, canRedo, timeUntilSync};
}
