import { findShortestPath } from './routing';

self.onmessage = (e: MessageEvent) => {
    const { graph, startId, targetId } = e.data;
    
    try {
        const route = findShortestPath(graph, startId, targetId);
        self.postMessage({ route });
    } catch (error) {
        self.postMessage({ error: 'Failed to calculate route' });
    }
};
