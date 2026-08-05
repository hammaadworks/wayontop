import {useCallback, useEffect, useRef, useState} from 'react';
import {supabase} from '@wayontop/ui/lib/supabase';
import {toast} from 'sonner';
import type {GraphData} from '@wayontop/ui/lib/types';
import type {Venue} from './useVenues';

export type SyncState = 'idle' | 'unsaved' | 'saving' | 'saved' | 'error' | 'offline';

export function useGraph(currentVenue: Venue | null) {
    const [data, setInternalData] = useState<GraphData>({nodes: [], edges: [], sponsors: []});
    const [history, setHistory] = useState<GraphData[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    const setData = useCallback((action: React.SetStateAction<GraphData>) => {
        setInternalData(prev => {
            const nextData = typeof action === 'function' ? (action as any)(prev) : action;
            if (JSON.stringify(prev) !== JSON.stringify(nextData)) {
                setHistory(h => {
                    const newHistory = h.slice(0, historyIndex + 1);
                    return [...newHistory, nextData];
                });
                setHistoryIndex(i => i + 1);
            }
            return nextData;
        });
    }, [historyIndex]);

    const undo = useCallback(() => {
        if (historyIndex > 0) {
            setHistoryIndex(i => i - 1);
            setInternalData(history[historyIndex - 1]);
        }
    }, [history, historyIndex]);

    const redo = useCallback(() => {
        if (historyIndex < history.length - 1) {
            setHistoryIndex(i => i + 1);
            setInternalData(history[historyIndex + 1]);
        }
    }, [history, historyIndex]);

    const canUndo = historyIndex > 0;
    const canRedo = historyIndex < history.length - 1;

    const [loadingGraph, setLoadingGraph] = useState(false);
    const [syncState, setSyncState] = useState<SyncState>('idle');
    const lastSavedData = useRef<string>('');

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
            remoteData = blob.data as GraphData;
            remoteTimestamp = new Date(blob.updated_at).getTime();
        }

        const localRaw = localStorage.getItem(`wayontop_graph_${currentVenue.key}`);
        let localData: GraphData | null = null;
        let localTimestamp = 0;

        if (localRaw) {
            try {
                const parsed = JSON.parse(localRaw);
                if (parsed.data && parsed.timestamp) {
                    localData = parsed.data;
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
            finalData = {nodes: [], edges: [], sponsors: []};
            lastSavedData.current = JSON.stringify(finalData);
        }

        setInternalData(finalData);
        setHistory([finalData]);
        setHistoryIndex(0);
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

    return {data, setData, loadingGraph, saveGraph, syncState, undo, redo, canUndo, canRedo};
}
