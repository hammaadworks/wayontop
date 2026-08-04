import { useState } from 'react';
import type { GraphNode, GraphEdge, NodeType } from '@wayontop/ui/lib/types';

export function useMapEditorState() {
  const [mode, setMode] = useState<'view' | 'add_node' | 'add_edge' | 'test_route'>('view');
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<GraphEdge | null>(null);
  const [edgeStartNode, setEdgeStartNode] = useState<GraphNode | null>(null);
  const [testRoutePath, setTestRoutePath] = useState<{ path: GraphNode[], totalDistance: number } | null>(null);

  // New Node Form
  const [newNodeName, setNewNodeName] = useState('');
  const [newNodeType, setNewNodeType] = useState<NodeType>('poi');
  const [testingStamp, setTestingStamp] = useState<GraphNode | null>(null);

  return {
    mode, setMode,
    selectedNode, setSelectedNode,
    selectedEdge, setSelectedEdge,
    edgeStartNode, setEdgeStartNode,
    testRoutePath, setTestRoutePath,
    newNodeName, setNewNodeName,
    newNodeType, setNewNodeType,
    testingStamp, setTestingStamp
  };
}
