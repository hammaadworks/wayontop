import {useState} from 'react';
import type {GraphEdge, GraphNode} from '@wayontop/ui/lib/types';

export function useMapEditorState() {
    const [mode, setMode] = useState<'view' | 'add_node' | 'add_edge' | 'test_route' | 'merge_nodes'>('view');
    const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
    const [selectedEdge, setSelectedEdge] = useState<GraphEdge | null>(null);
    const [edgeStartNode, setEdgeStartNode] = useState<GraphNode | null>(null);
    const [testRoutePath, setTestRoutePath] = useState<{ path: GraphNode[], totalDistance: number } | null>(null);

    const [testingStamp, setTestingStamp] = useState<GraphNode | null>(null);
    const [isLocked, setIsLocked] = useState(true);

    return {
        mode, setMode,
        isLocked, setIsLocked,
        selectedNode, setSelectedNode,
        selectedEdge, setSelectedEdge,
        edgeStartNode, setEdgeStartNode,
        testRoutePath, setTestRoutePath,
        testingStamp, setTestingStamp
    };
}
