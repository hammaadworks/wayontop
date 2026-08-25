import { findShortestPath, findShortestPathFromGPS } from './routing';
import type { GraphData } from './types';

let cachedGraph: GraphData | null = null;

self.onmessage = (e: MessageEvent) => {
    const { type, graph, startId, targetId, lat, lng, messageId } = e.data;
    
    if (type === 'INIT') {
        cachedGraph = graph;
        return;
    }

    if (type === 'ROUTE') {
        try {
            const activeGraph = graph || cachedGraph;
            if (!activeGraph) {
                throw new Error('No graph available for routing');
            }

            let route;
            if (lat !== undefined && lng !== undefined) {
                route = findShortestPathFromGPS(activeGraph, lat, lng, targetId);
            } else {
                route = findShortestPath(activeGraph, startId, targetId);
            }
            self.postMessage({ type: 'ROUTE_DONE', route, messageId });
        } catch (error) {
            self.postMessage({ type: 'ROUTE_ERROR', error: 'Failed to calculate route', messageId });
        }
    } else {
        // Fallback for older components (if any are still using it)
        try {
            let route;
            if (lat !== undefined && lng !== undefined) {
                route = findShortestPathFromGPS(graph || cachedGraph, lat, lng, targetId);
            } else {
                route = findShortestPath(graph || cachedGraph, startId, targetId);
            }
            self.postMessage({ route });
        } catch (error) {
            self.postMessage({ error: 'Failed to calculate route' });
        }
    }
};
