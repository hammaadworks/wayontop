import { useState, useCallback } from 'react';
import type { MapRef } from 'react-map-gl/maplibre';

export function useMarkerCollision(
  mapRef: React.RefObject<MapRef | null>,
  nodes: { id: string; lat: number; lng: number; priority?: number }[],
  isZoomedIn: boolean
) {
  const [visibleLabels, setVisibleLabels] = useState<Set<string>>(new Set());
  
  const calculateCollisions = useCallback(() => {
    if (!mapRef.current || !isZoomedIn) {
      if (!isZoomedIn && visibleLabels.size > 0) setVisibleLabels(new Set());
      return;
    }
    
    const map = mapRef.current.getMap();
    const bounds = map.getBounds();
    
    // Filter nodes within bounds
    const visibleNodes = nodes.filter(n => bounds.contains([n.lng, n.lat]));
    
    // Sort by priority (highest first). If no priority, preserve stable order by ID to prevent flickering
    visibleNodes.sort((a, b) => {
        const pA = a.priority || 0;
        const pB = b.priority || 0;
        if (pA !== pB) return pB - pA;
        return a.id.localeCompare(b.id);
    });
    
    const boxes: { minX: number; minY: number; maxX: number; maxY: number }[] = [];
    const newVisible = new Set<string>();
    
    for (const node of visibleNodes) {
      const p = map.project([node.lng, node.lat]);
      
      // Approximate bounding box of the label
      // Marker center is at (p.x, p.y). The label is above the marker.
      const width = 80; // approximate width of the pill
      const height = 24; // approximate height
      const offsetY = -55; // distance above marker (p.y - 55px)
      
      const minX = p.x - width / 2;
      const maxX = p.x + width / 2;
      const minY = p.y + offsetY - height / 2;
      const maxY = p.y + offsetY + height / 2;
      
      // Check collision
      let collides = false;
      for (const box of boxes) {
        if (minX < box.maxX && maxX > box.minX && minY < box.maxY && maxY > box.minY) {
          collides = true;
          break;
        }
      }
      
      if (!collides) {
        boxes.push({ minX, minY, maxX, maxY });
        newVisible.add(node.id);
      }
    }
    
    setVisibleLabels(prev => {
      if (prev.size === newVisible.size && [...prev].every(id => newVisible.has(id))) {
        return prev;
      }
      return newVisible;
    });
  }, [mapRef, nodes, isZoomedIn]);
  
  return { visibleLabels, calculateCollisions };
}
