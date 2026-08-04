import { useState, useEffect, useRef } from 'react';
import type { GraphNode, GraphEdge, GraphData } from '@wayontop/ui/lib/types';
import { distanceInMeters } from '@wayontop/ui/lib/routing';

export function useGeolocation(
  recording: boolean,
  setData: React.Dispatch<React.SetStateAction<GraphData>>
) {
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  const [rawTrace, setRawTrace] = useState<{lat: number, lng: number}[]>([]);
  const lastRecordedNodeRef = useRef<GraphNode | null>(null);

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
        name: '',
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
          name: '',
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
  }, [currentLocation, recording, setData]);

  return { currentLocation, rawTrace, setRawTrace, lastRecordedNodeRef };
}
