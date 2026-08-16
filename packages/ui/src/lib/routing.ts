import type { GraphNode, GraphData } from './types';

// Calculate distance in meters between two lat/lng coordinates (Haversine formula)
export function distanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // Earth radius in meters
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dp / 2) * Math.sin(dp / 2) +
    Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c * 100) / 100;
}

// Calculate bearing in degrees from one point to another
export function getBearing(lat1: number, lon1: number, lat2: number, lon2: number) {
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const l1 = (lon1 * Math.PI) / 180;
  const l2 = (lon2 * Math.PI) / 180;

  const y = Math.sin(l2 - l1) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(l2 - l1);
  const brng = Math.atan2(y, x);
  return (brng * 180 / Math.PI + 360) % 360;
}

// WeakMap caching to ensure O(1) adjacency list and node map generation 
// across repeated routing requests on the same graph instance.
const adjListCache = new WeakMap<GraphData, Map<string, { to: string; dist: number }[]>>();
const nodeMapCache = new WeakMap<GraphData, Map<string, GraphNode>>();

function getGraphContext(graph: GraphData) {
  if (adjListCache.has(graph) && nodeMapCache.has(graph)) {
    return { adjList: adjListCache.get(graph)!, nodeMap: nodeMapCache.get(graph)! };
  }

  const nodeMap = new Map<string, GraphNode>();
  const adjList = new Map<string, { to: string; dist: number }[]>();

  graph.nodes.forEach(n => {
    nodeMap.set(n.id, n);
    adjList.set(n.id, []);
  });

  graph.edges.forEach(e => {
    const fromNode = nodeMap.get(e.from);
    const toNode = nodeMap.get(e.to);
    
    if (fromNode && toNode) {
      // Point 5: Calculate distance dynamically on the phone to save DB payload size.
      // e.distance_m is kept as a fallback for legacy cached graphs.
      const dist = e.distance_m ?? distanceInMeters(fromNode.lat, fromNode.lng, toNode.lat, toNode.lng);
      
      adjList.get(e.from)?.push({ to: e.to, dist });
      // Assume undirected graph for walkways
      adjList.get(e.to)?.push({ to: e.from, dist });
    }
  });

  nodeMapCache.set(graph, nodeMap);
  adjListCache.set(graph, adjList);

  return { adjList, nodeMap };
}

// Optimized Priority Queue (Min-Heap) for O(log V) A* node popping
class MinHeap<T> {
  private heap: { node: T; score: number }[] = [];

  push(node: T, score: number) {
    this.heap.push({ node, score });
    this.bubbleUp(this.heap.length - 1);
  }

  pop(): T | undefined {
    if (this.heap.length === 0) return undefined;
    const top = this.heap[0].node;
    const bottom = this.heap.pop();
    if (this.heap.length > 0 && bottom) {
      this.heap[0] = bottom;
      this.sinkDown(0);
    }
    return top;
  }

  isEmpty() {
    return this.heap.length === 0;
  }

  private bubbleUp(index: number) {
    const element = this.heap[index];
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      const parent = this.heap[parentIndex];
      if (element.score >= parent.score) break;
      this.heap[index] = parent;
      this.heap[parentIndex] = element;
      index = parentIndex;
    }
  }

  private sinkDown(index: number) {
    const length = this.heap.length;
    const element = this.heap[index];
    while (true) {
      const leftChildIdx = 2 * index + 1;
      const rightChildIdx = 2 * index + 2;
      let swapIdx = -1;

      if (leftChildIdx < length) {
        if (this.heap[leftChildIdx].score < element.score) {
          swapIdx = leftChildIdx;
        }
      }
      
      if (rightChildIdx < length) {
        if (
          (swapIdx === -1 && this.heap[rightChildIdx].score < element.score) || 
          (swapIdx !== -1 && this.heap[rightChildIdx].score < this.heap[leftChildIdx].score)
        ) {
          swapIdx = rightChildIdx;
        }
      }
      
      if (swapIdx === -1) break;
      this.heap[index] = this.heap[swapIdx];
      this.heap[swapIdx] = element;
      index = swapIdx;
    }
  }
}

// Highly Optimized Client-Side A* Pathfinding
export function findShortestPath(
  graph: GraphData,
  startNodeId: string,
  targetNodeId: string
): { path: GraphNode[]; totalDistance: number } | null {
  const { adjList, nodeMap } = getGraphContext(graph);

  if (!nodeMap.has(startNodeId) || !nodeMap.has(targetNodeId)) {
    return null;
  }

    const targetNode = nodeMap.get(targetNodeId)!;

  const minHeap = new MinHeap<string>();
  const cameFrom = new Map<string, string>();
  const gScore = new Map<string, number>();
  
  // Track nodes already fully processed to prevent infinite loops / redundant checks
  const closedSet = new Set<string>();

  // Heuristic function: straight line distance
  const heuristic = (nId: string) => {
    const node = nodeMap.get(nId)!;
    return distanceInMeters(node.lat, node.lng, targetNode.lat, targetNode.lng);
  };

  gScore.set(startNodeId, 0);
  minHeap.push(startNodeId, heuristic(startNodeId));

  while (!minHeap.isEmpty()) {
    const current = minHeap.pop()!;

    if (current === targetNodeId) {
      // Reconstruct path
      const path: GraphNode[] = [nodeMap.get(current)!];
      let curr = current;
      while (cameFrom.has(curr)) {
        curr = cameFrom.get(curr)!;
        path.unshift(nodeMap.get(curr)!);
      }
      return { path, totalDistance: gScore.get(targetNodeId)! };
    }

    if (closedSet.has(current)) continue; // Lazy deletion from priority queue
    closedSet.add(current);

    const neighbors = adjList.get(current) || [];
    for (const neighbor of neighbors) {
      if (closedSet.has(neighbor.to)) continue;

      const currentGScore = gScore.get(current)!;
      const tentativeGScore = currentGScore + neighbor.dist;
      const neighborGScore = gScore.get(neighbor.to) ?? Infinity;

      if (tentativeGScore < neighborGScore) {
        cameFrom.set(neighbor.to, current);
        gScore.set(neighbor.to, tentativeGScore);
        
        // Push updated score to the min-heap
        const fScore = tentativeGScore + heuristic(neighbor.to);
        minHeap.push(neighbor.to, fScore);
      }
    }
  }

  // No path found
  return null;
}

// Find the closest node on the graph to a given coordinate
export function findNearestNode(graph: GraphData, lat: number, lng: number): GraphNode | null {
  if (!graph.nodes || graph.nodes.length === 0) return null;
  
  let nearestNode: GraphNode | null = null;
  let minDistance = Infinity;

  for (const node of graph.nodes) {
    const dist = distanceInMeters(lat, lng, node.lat, node.lng);
    if (dist < minDistance) {
      minDistance = dist;
      nearestNode = node;
    }
  }

  return nearestNode;
}
