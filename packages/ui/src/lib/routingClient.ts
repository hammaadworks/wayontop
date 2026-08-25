import RoutingWorker from './routing.worker?worker';
import type { GraphData, GraphNode } from './types';

interface RouteResult {
    path: GraphNode[];
    totalDistance: number;
}

let workerInstance: Worker | null = null;
let currentGraphRef: GraphData | null = null;
let messageIdCounter = 0;

const pendingRequests = new Map<number, { resolve: (value: RouteResult) => void, reject: (reason?: any) => void }>();

function getWorker(): Worker {
    if (!workerInstance) {
        workerInstance = new RoutingWorker();
        
        workerInstance.onmessage = (e: MessageEvent) => {
            const { type, route, error, messageId } = e.data;
            
            if (type === 'ROUTE_DONE') {
                const p = pendingRequests.get(messageId);
                if (p) {
                    p.resolve(route);
                    pendingRequests.delete(messageId);
                }
            } else if (type === 'ROUTE_ERROR') {
                const p = pendingRequests.get(messageId);
                if (p) {
                    p.reject(new Error(error));
                    pendingRequests.delete(messageId);
                }
            }
        };

        workerInstance.onerror = (err) => {
            console.error('Routing worker error', err);
            // Reject all pending requests
            pendingRequests.forEach((p) => p.reject(new Error('Worker crashed')));
            pendingRequests.clear();
            
            if (workerInstance) {
                workerInstance.terminate();
                workerInstance = null;
            }
        };
    }
    return workerInstance;
}

export async function calculateRoute(
    params: { graph: GraphData; targetId: number | string; lat?: number; lng?: number; startId?: number | string; signal?: AbortSignal }
): Promise<RouteResult> {
    
    // If there is an ongoing computation, terminate the worker to free up CPU
    if (pendingRequests.size > 0) {
        console.warn(`[routingClient] Terminating busy worker to process new request.`);
        if (workerInstance) {
            workerInstance.terminate();
            workerInstance = null;
        }
        pendingRequests.forEach((p) => p.reject(new DOMException('Worker terminated due to newer request', 'AbortError')));
        pendingRequests.clear();
        currentGraphRef = null; // Force re-initialization
    }

    const worker = getWorker();
    
    // Only send the graph if it's different from the one we already sent
    if (params.graph !== currentGraphRef) {
        worker.postMessage({ type: 'INIT', graph: params.graph });
        currentGraphRef = params.graph;
    }

    return new Promise((resolve, reject) => {
        if (params.signal?.aborted) {
            return reject(new DOMException("Aborted", "AbortError"));
        }

        const messageId = ++messageIdCounter;
        
        const abortHandler = () => {
            if (pendingRequests.has(messageId)) {
                pendingRequests.delete(messageId);
                reject(new DOMException("Aborted", "AbortError"));
                
                // Kill the worker to stop the heavy computation
                if (workerInstance) {
                    workerInstance.terminate();
                    workerInstance = null;
                }
                currentGraphRef = null;
                pendingRequests.forEach((p) => p.reject(new DOMException('Worker terminated due to abort', 'AbortError')));
                pendingRequests.clear();
            }
        };

        if (params.signal) {
            params.signal.addEventListener('abort', abortHandler, { once: true });
        }

        const cleanup = () => {
            if (params.signal) {
                params.signal.removeEventListener('abort', abortHandler);
            }
        };

        pendingRequests.set(messageId, { 
            resolve: (val) => { cleanup(); resolve(val); }, 
            reject: (err) => { cleanup(); reject(err); } 
        });
        
        worker.postMessage({
            type: 'ROUTE',
            messageId,
            targetId: params.targetId,
            startId: params.startId,
            lat: params.lat,
            lng: params.lng
        });
    });
}
