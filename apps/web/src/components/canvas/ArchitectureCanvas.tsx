'use client';

import { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type OnConnect,
  type NodeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ComponentNode } from './ComponentNode';
import { ClusterNode } from './ClusterNode';
import { useGraphStore } from '@/store/graph-store';
import { LAYER_COLORS } from './layer-colors';
import type { ArchitecturalLayer } from '@codeview/shared';

const nodeTypes = {
  component: ComponentNode,
  cluster: ClusterNode,
};

export function ArchitectureCanvas() {
  const {
    rfNodes,
    rfEdges,
    setRfNodes,
    setRfEdges,
    setHoveredNode,
    clearSelection,
  } = useGraphStore();

  const [nodes, setNodes, onNodesChange] = useNodesState(rfNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(rfEdges);

  // Sync store nodes to local state when they change
  useMemo(() => {
    if (rfNodes.length > 0) setNodes(rfNodes);
  }, [rfNodes, setNodes]);

  useMemo(() => {
    if (rfEdges.length > 0) setEdges(rfEdges);
  }, [rfEdges, setEdges]);

  const onNodeMouseEnter: NodeMouseHandler = useCallback(
    (_event, node) => {
      if (node.type === 'component') {
        setHoveredNode(node.id);
      }
    },
    [setHoveredNode]
  );

  const onNodeMouseLeave: NodeMouseHandler = useCallback(
    () => setHoveredNode(null),
    [setHoveredNode]
  );

  const onPaneClick = useCallback(() => {
    // Don't clear selection on pane click — user might be panning
  }, []);

  const minimapNodeColor = useCallback((node: Node) => {
    const layer = (node.data as { layer?: ArchitecturalLayer })?.layer;
    return layer ? LAYER_COLORS[layer].color : '#71717a';
  }, []);

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={onNodeMouseLeave}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        snapToGrid
        snapGrid={[20, 20]}
        minZoom={0.3}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: false,
          style: { stroke: '#27272a', strokeWidth: 1 },
          markerEnd: { type: 'arrowclosed' as any, width: 12, height: 12, color: '#3f3f46' },
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="rgba(255,255,255,0.04)"
        />
        <Controls
          position="bottom-left"
          style={{ left: 160 }}
          showInteractive={false}
        />
        <MiniMap
          nodeColor={minimapNodeColor}
          maskColor="rgba(9,9,11,0.85)"
          style={{
            backgroundColor: 'rgba(24,24,27,0.92)',
            border: '1px solid #27272a',
            borderRadius: 8,
          }}
          pannable
          zoomable
        />
      </ReactFlow>
    </div>
  );
}
