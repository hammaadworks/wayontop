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
    const lastReactStateRef = useRef<{lat: number, lng: number} | null>(null);
    const lastUpdateRef = useRef<number>(0);

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
                
                const now = Date.now();
                const lastPos = lastReactStateRef.current;
                const dist = lastPos ? distanceInMeters(lastPos.lat, lastPos.lng, pos.lat, pos.lng) : Infinity;

                // Throttle React state updates to avoid massive re-renders
                if (dist > 1 || now - lastUpdateRef.current > 2000) {
                    setCurrentLocation(pos);
                    setCurrentAccuracy(accuracy);
                    lastReactStateRef.current = pos;
                    lastUpdateRef.current = now;
                }
                
                // Trace points when recording (be forgiving for indoor/testing)
                if (recording && accuracy <= 40) {
                    setRawTrace(prev => {
                        const lastTracePos = prev.length > 0 ? prev[prev.length - 1] : null;
                        const traceDist = lastTracePos ? distanceInMeters(lastTracePos.lat, lastTracePos.lng, pos.lat, pos.lng) : Infinity;
                        
                        // Only add to trace if we moved at least 1 meter
                        if (traceDist > 1) {
                            return [...prev, pos];
                        }
                        return prev;
                    });
                }
            },
            (error) => console.error("Error watching position:", error),
            {enableHighAccuracy: true, maximumAge: 0, timeout: 5000}
        );

        return () => navigator.geolocation.clearWatch(watchId);
    }, [recording]);

    useEffect(() => {
        if (!currentLocation || !recording || currentAccuracy === null) return;
        
        // Check before tracking traces (forgiving threshold)
        if (currentAccuracy > 40) return;

        // Trace points are already handled in the watchPosition callback (lines 53-55)
        // We no longer drop 'track' nodes automatically. The user will draw polylines later over the rawTraces.
    }, [currentLocation, currentAccuracy, recording, setData]);

    return {currentLocation, currentAccuracy, rawTrace, setRawTrace, lastRecordedNodeRef};
}
