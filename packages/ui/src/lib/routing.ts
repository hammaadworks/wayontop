import type { GraphNode, GraphData } from './types';
import Flatbush from 'flatbush';

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

export type RouteCoordinate = [lng: number, lat: number];

export function getEdgeGeometryForDirection(edge: GraphData['edges'][number], fromNode: GraphNode): RouteCoordinate[] {
  if (!edge.geometry?.length) return [];
  return edge.from === fromNode.id ? edge.geometry : [...edge.geometry].reverse();
}

export function getRouteCoordinateSegments(graph: GraphData, path: GraphNode[]): RouteCoordinate[][] {
  if (path.length < 2) return [];

  const edgeByNodePair = new Map<string, GraphData['edges'][number]>();
  graph.edges.forEach(edge => {
    edgeByNodePair.set(`${edge.from}-${edge.to}`, edge);
    edgeByNodePair.set(`${edge.to}-${edge.from}`, edge);
  });

  const segments: RouteCoordinate[][] = [];
  let currentSegment: RouteCoordinate[] = [[path[0].lng, path[0].lat]];

  for (let index = 0; index < path.length - 1; index += 1) {
    const fromNode = path[index];
    const toNode = path[index + 1];
    const edge = edgeByNodePair.get(`${fromNode.id}-${toNode.id}`);

    if (edge?.is_hidden) {
      if (currentSegment.length > 1) segments.push(currentSegment);
      currentSegment = [[toNode.lng, toNode.lat]];
      continue;
    }

    currentSegment.push(...(edge ? getEdgeGeometryForDirection(edge, fromNode) : []));
    currentSegment.push([toNode.lng, toNode.lat]);
  }

  if (currentSegment.length > 1) segments.push(currentSegment);
  return segments;
}

export function getNextRouteCoordinate(
  coordinates: RouteCoordinate[],
  lat: number,
  lng: number
): RouteCoordinate | null {
  if (coordinates.length < 2) return coordinates[0] || null;

  let nearestSegmentIndex = 0;
  let nearestDistance = Infinity;

  for (let index = 0; index < coordinates.length - 1; index += 1) {
    const [fromLng, fromLat] = coordinates[index];
    const [toLng, toLat] = coordinates[index + 1];
    const distance = pointToLineSegment(lng, lat, fromLng, fromLat, toLng, toLat).dist;
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestSegmentIndex = index;
    }
  }

  return coordinates[nearestSegmentIndex + 1];
}

// WeakMap caching to ensure O(1) adjacency list and node map generation 
// across repeated routing requests on the same graph instance.
const adjListCache = new WeakMap<GraphData, Map<number, { to: number; dist: number }[]>>();
const nodeMapCache = new WeakMap<GraphData, Map<number, GraphNode>>();

function getGraphContext(graph: GraphData) {
  if (adjListCache.has(graph) && nodeMapCache.has(graph)) {
    return { adjList: adjListCache.get(graph)!, nodeMap: nodeMapCache.get(graph)! };
  }

  const nodeMap = new Map<number, GraphNode>();
  const adjList = new Map<number, { to: number; dist: number }[]>();

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
  startNodeId: number,
  targetNodeId: number,
  virtualNode?: { node: GraphNode; edges: { to: number; dist: number }[] }
): { path: GraphNode[]; totalDistance: number } | null {
  const { adjList, nodeMap } = getGraphContext(graph);

  const getNode = (id: number) => virtualNode && id === virtualNode.node.id ? virtualNode.node : nodeMap.get(id);
  const getNeighbors = (id: number) => virtualNode && id === virtualNode.node.id ? virtualNode.edges : (adjList.get(id) || []);

  if (!getNode(startNodeId) || !getNode(targetNodeId)) {
    return null;
  }

  const targetNode = getNode(targetNodeId)!;

  const minHeap = new MinHeap<number>();
  const cameFrom = new Map<number, number>();
  const gScore = new Map<number, number>();
  
  // Track nodes already fully processed to prevent infinite loops / redundant checks
  const closedSet = new Set<number>();

  // Heuristic function: straight line distance
  const heuristic = (nId: number) => {
    const node = getNode(nId)!;
    return distanceInMeters(node.lat, node.lng, targetNode.lat, targetNode.lng);
  };

  gScore.set(startNodeId, 0);
  minHeap.push(startNodeId, heuristic(startNodeId));

  while (!minHeap.isEmpty()) {
    const current = minHeap.pop()!;

    if (current === targetNodeId) {
      // Reconstruct path
      const path: GraphNode[] = [getNode(current)!];
      let curr: number = current;
      while (cameFrom.has(curr)) {
        curr = cameFrom.get(curr)!;
        path.unshift(getNode(curr)!);
      }
      return { path, totalDistance: gScore.get(targetNodeId)! };
    }

    if (closedSet.has(current)) continue; // Lazy deletion from priority queue
    closedSet.add(current);

    const neighbors = getNeighbors(current);
    for (const neighbor of neighbors) {
      if (closedSet.has(neighbor.to)) continue;

      const currentGScore = gScore.get(current)!;
      const tentativeGScore = currentGScore + neighbor.dist;
      const neighborGScore = gScore.get(neighbor.to) ?? Infinity;

      if (tentativeGScore < neighborGScore) {
        cameFrom.set(neighbor.to, current as number);
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

// Distance from a point to a line segment
export function pointToLineSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
    const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
    if (l2 === 0) return { x: x1, y: y1, dist: distanceInMeters(py, px, y1, x1) };
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    const projX = x1 + t * (x2 - x1);
    const projY = y1 + t * (y2 - y1);
    return { x: projX, y: projY, dist: distanceInMeters(py, px, projY, projX) };
}


const flatbushCache = new WeakMap<GraphData, {
    index: Flatbush | null,
    validEdges: {from: GraphNode, to: GraphNode, geometry?: [number, number][], edgeId: string}[]
}>();

export function getSpatialIndex(graph: GraphData) {
    if (flatbushCache.has(graph)) return flatbushCache.get(graph)!;
    
    const nodeMap = new Map<number, GraphNode>();
    graph.nodes.forEach(n => nodeMap.set(n.id, n));
    
    const validEdges: {from: GraphNode, to: GraphNode, geometry?: [number, number][], edgeId: string}[] = [];
    graph.edges.forEach(edge => {
        if (edge.is_hidden) return;
        const fromNode = nodeMap.get(edge.from);
        const toNode = nodeMap.get(edge.to);
        if (fromNode && toNode) {
            validEdges.push({from: fromNode, to: toNode, geometry: edge.geometry, edgeId: `${edge.from}-${edge.to}`});
        }
    });
    
    if (validEdges.length === 0) {
        const res = { index: null, validEdges: [] };
        flatbushCache.set(graph, res);
        return res;
    }
    
    const index = new Flatbush(validEdges.length);
    for (const e of validEdges) {
        let minX = Math.min(e.from.lng, e.to.lng);
        let minY = Math.min(e.from.lat, e.to.lat);
        let maxX = Math.max(e.from.lng, e.to.lng);
        let maxY = Math.max(e.from.lat, e.to.lat);
        
        if (e.geometry) {
            e.geometry.forEach(pt => {
                minX = Math.min(minX, pt[0]);
                minY = Math.min(minY, pt[1]);
                maxX = Math.max(maxX, pt[0]);
                maxY = Math.max(maxY, pt[1]);
            });
        }
        index.add(minX, minY, maxX, maxY);
    }
    index.finish();
    
    const res = { index, validEdges };
    flatbushCache.set(graph, res);
    return res;
}

export function findNearestEdgePoint(graph: GraphData, lat: number, lng: number, searchRadiusMeters = 50) {
    if (!graph.nodes || graph.nodes.length === 0) return null;
    
    const { index, validEdges } = getSpatialIndex(graph);
    if (!index) return null;
    
    const radiusDeg = searchRadiusMeters / 111320;
    const results = index.search(
        lng - radiusDeg,
        lat - radiusDeg,
        lng + radiusDeg,
        lat + radiusDeg
    );
    
    let bestSnap: {lng: number, lat: number, edge: typeof validEdges[0]} | null = null;
    let minDistance = Infinity;
    
    for (const edgeIndex of results) {
        const edge = validEdges[edgeIndex];
        const pts: [number, number][] = [[edge.from.lng, edge.from.lat]];
        if (edge.geometry) pts.push(...edge.geometry);
        pts.push([edge.to.lng, edge.to.lat]);
        
        for (let i = 0; i < pts.length - 1; i++) {
            const snap = pointToLineSegment(
                lng, lat,
                pts[i][0], pts[i][1],
                pts[i+1][0], pts[i+1][1]
            );
            if (snap.dist < minDistance) {
                minDistance = snap.dist;
                bestSnap = { lng: snap.x, lat: snap.y, edge };
            }
        }
    }
    
    if (!bestSnap) return null;
    return bestSnap;
}


export function findShortestPathFromGPS(
  graph: GraphData,
  lat: number,
  lng: number,
  targetNodeId: number
): { path: GraphNode[]; totalDistance: number } | null {
    const snap = findNearestEdgePoint(graph, lat, lng, 100);
    if (!snap) return findShortestPath(graph, findNearestNode(graph, lat, lng)?.id || 0, targetNodeId);
    
    const { nodeMap } = getGraphContext(graph);
    if (!nodeMap.has(targetNodeId)) return null;

    const VIRTUAL_ID = -999;
    const virtualNodeInfo = {
        node: {
            id: VIRTUAL_ID,
            lat: snap.lat,
            lng: snap.lng,
            name: {en: "Your Location", kn: "", es: ""},
            category_id: 0,
            status: 'active' as const,
            is_paid: false,
            snapEdgeId: snap.edge.edgeId
        },
        edges: [
            { to: snap.edge.from.id, dist: distanceInMeters(snap.lat, snap.lng, snap.edge.from.lat, snap.edge.from.lng) },
            { to: snap.edge.to.id, dist: distanceInMeters(snap.lat, snap.lng, snap.edge.to.lat, snap.edge.to.lng) }
        ]
    };
    
    return findShortestPath(graph, VIRTUAL_ID, targetNodeId, virtualNodeInfo);
}

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
