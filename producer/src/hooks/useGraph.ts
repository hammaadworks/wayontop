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
        data: {nodes: [], edges: [], sponsorZones: [], sponsors: [], defaultAds: []},
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
                .filter((n: any) => n.type === 'stamp' || n.has_stamp)
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
            finalData = {nodes: [], edges: [], sponsorZones: [], sponsors: [], defaultAds: []};
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
        // Extract stamps from the graph as consumer expects
        const graphStamps = data.nodes
            .filter((n: any) => n.type === 'stamp' || n.has_stamp)
            .map((n: any) => ({
                id: n.id,
                name: n.name || 'Hidden Stamp',
                lat: n.lat,
                lng: n.lng,
                model_url: '/assets/models/stamp.glb',
                ar_scale: 1,
                points: 10
            }));

        const {error} = await supabase.from('venue_content').upsert([
            {
                venue_key: currentVenue.key,
                content_type: 'graph',
                data: data,
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
        ], {onConflict: 'venue_key,content_type'});

        if (error) {
            console.error("Save error:", error);
            toast.error(error.message || 'Failed to save');
            setSyncState('error');
        } else {
            setSyncState('saved');
            setTimeout(() => setSyncState('idle'), 3000);
            lastSavedData.current = currentStr;
            localStorage.setItem(`wayontop_graph_${currentVenue.key}`, JSON.stringify({
                data: data,
                timestamp: Date.now()
            }));
        }
    };

    useEffect(() => {
        saveGraphRef.current = saveGraph;
    });

    return {data, setData, loadingGraph, saveGraph, syncState, undo, redo, canUndo, canRedo, timeUntilSync};
}
