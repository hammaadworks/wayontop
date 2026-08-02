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

  return R * c;
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

// Client-Side A* Pathfinding over GraphData
export function findShortestPath(
  graph: GraphData,
  startNodeId: string,
  targetNodeId: string
): { path: GraphNode[]; totalDistance: number } | null {
  const { nodes, edges } = graph;
  
  // Quick lookup maps
  const nodeMap = new Map<string, GraphNode>();
  nodes.forEach(n => nodeMap.set(n.id, n));

  if (!nodeMap.has(startNodeId) || !nodeMap.has(targetNodeId)) {
    return null;
  }

  // Adjacency list
  const adjList = new Map<string, { to: string; dist: number }[]>();
  nodes.forEach(n => adjList.set(n.id, []));

  edges.forEach(e => {
    adjList.get(e.from)?.push({ to: e.to, dist: e.distance_m });
    // Assuming undirected graph for walkways
    adjList.get(e.to)?.push({ to: e.from, dist: e.distance_m });
  });

  // A* structures
  const openSet = new Set<string>();
  openSet.add(startNodeId);

  const cameFrom = new Map<string, string>();

  // gScore: cheapest path from start to node
  const gScore = new Map<string, number>();
  nodes.forEach(n => gScore.set(n.id, Infinity));
  gScore.set(startNodeId, 0);

  // fScore: gScore + heuristic
  const fScore = new Map<string, number>();
  nodes.forEach(n => fScore.set(n.id, Infinity));
  
  const targetNode = nodeMap.get(targetNodeId)!;
  
  // Heuristic function: straight line distance
  const heuristic = (nId: string) => {
    const node = nodeMap.get(nId)!;
    return distanceInMeters(node.lat, node.lng, targetNode.lat, targetNode.lng);
  };

  fScore.set(startNodeId, heuristic(startNodeId));

  while (openSet.size > 0) {
    // Get node in openSet with lowest fScore
    let current = '';
    let lowestF = Infinity;
    openSet.forEach(nodeId => {
      const f = fScore.get(nodeId)!;
      if (f < lowestF) {
        lowestF = f;
        current = nodeId;
      }
    });

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

    openSet.delete(current);

    const neighbors = adjList.get(current) || [];
    for (const neighbor of neighbors) {
      const tentative_gScore = gScore.get(current)! + neighbor.dist;

      if (tentative_gScore < gScore.get(neighbor.to)!) {
        cameFrom.set(neighbor.to, current);
        gScore.set(neighbor.to, tentative_gScore);
        fScore.set(neighbor.to, tentative_gScore + heuristic(neighbor.to));
        if (!openSet.has(neighbor.to)) {
          openSet.add(neighbor.to);
        }
      }
    }
  }

  // No path found
  return null;
}
