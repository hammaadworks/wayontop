import {useEffect, useRef, useState} from 'react';
import type {GraphData, GraphEdge, GraphNode} from '@wayontop/ui/lib/types';
import {distanceInMeters} from '@wayontop/ui/lib/routing';

export function useGeolocation(
    recording: boolean,
    setData: React.Dispatch<React.SetStateAction<GraphData>>
) {
    const [currentLocation, setCurrentLocation] = useState<{ lat: number, lng: number } | null>(null);
    const [currentAccuracy, setCurrentAccuracy] = useState<number | null>(null);
    const [rawTrace, setRawTrace] = useState<{ lat: number, lng: number }[]>([]);
    const lastRecordedNodeRef = useRef<GraphNode | null>(null);

    useEffect(() => {
        if (!recording) {
            lastRecordedNodeRef.current = null;
            setRawTrace(currentTrace => {
                if (currentTrace.length > 0) {
                    setData(prev => ({
                        ...prev,
                        rawTraces: [...(prev.rawTraces || []), currentTrace]
                    }));
                }
                return [];
            });
        }
    }, [recording, setData]);

    useEffect(() => {
        const watchId = navigator.geolocation.watchPosition(
            (position) => {
                const accuracy = position.coords.accuracy;
                // Ignore completely wild readings
                if (accuracy > 100) return;

                const pos = {lat: position.coords.latitude, lng: position.coords.longitude};
                setCurrentLocation(pos);
                setCurrentAccuracy(accuracy);
                
                // Trace points when recording (be forgiving for indoor/testing)
                if (recording && accuracy <= 40) {
                    setRawTrace(prev => [...prev, pos]);
                }
            },
            (error) => console.error("Error watching position:", error),
            {enableHighAccuracy: true, maximumAge: 0, timeout: 5000}
        );

        return () => navigator.geolocation.clearWatch(watchId);
    }, [recording]);

    useEffect(() => {
        if (!currentLocation || !recording || currentAccuracy === null) return;
        
        // Check before dropping nodes for the graph to prevent zig-zags (forgiving threshold)
        if (currentAccuracy > 40) return;

        const lastNode = lastRecordedNodeRef.current;

        if (!lastNode) {
            const newNode: GraphNode = {
                id: `n_${Date.now()}`,
                name: '',
                lat: currentLocation.lat,
                lng: currentLocation.lng,
                type: 'track',
                tags: ['auto']
            };
            setData(prev => ({...prev, nodes: [...prev.nodes, newNode]}));
            lastRecordedNodeRef.current = newNode;
        } else {
            const dist = distanceInMeters(lastNode.lat, lastNode.lng, currentLocation.lat, currentLocation.lng);
            if (dist >= 5) {
                const newNode: GraphNode = {
                    id: `n_${Date.now()}`,
                    name: '',
                    lat: currentLocation.lat,
                    lng: currentLocation.lng,
                    type: 'track',
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
    }, [currentLocation, currentAccuracy, recording, setData]);

    return {currentLocation, currentAccuracy, rawTrace, setRawTrace, lastRecordedNodeRef};
}
