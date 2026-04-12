'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  type Node,
  type NodeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ComponentNode } from './ComponentNode';
import { ClusterNode } from './ClusterNode';
import { Breadcrumb } from './Breadcrumb';
import { useGraphStore } from '@/store/graph-store';
import { LAYER_COLORS } from './layer-colors';
import type { ArchitecturalLayer } from '@codeview/shared';

const nodeTypes = {
  component: ComponentNode,
  cluster: ClusterNode,
};

export function ArchitectureCanvas() {
  const {
    rfNodes: storeNodes,
    rfEdges: storeEdges,
    setHoveredNode,
    theme,
  } = useGraphStore();

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([] as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([] as any[]);

  // Sync store → local state when store updates
  useEffect(() => {
    if (storeNodes.length > 0) setNodes(storeNodes);
  }, [storeNodes, setNodes]);

  useEffect(() => {
    if (storeEdges.length > 0) setEdges(storeEdges);
  }, [storeEdges, setEdges]);

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

  const minimapNodeColor = useCallback((node: Node) => {
    const layer = (node.data as { layer?: ArchitecturalLayer })?.layer;
    return layer ? LAYER_COLORS[layer].color : '#71717a';
  }, []);

  return (
    <div className="w-full h-full relative">
      <Breadcrumb />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={onNodeMouseLeave}
        nodeTypes={nodeTypes}
        colorMode={theme}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        snapToGrid
        snapGrid={[20, 20]}
        minZoom={0.2}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: false,
          style: { stroke: theme === 'dark' ? '#3f3f46' : '#d4d4d8', strokeWidth: 1 },
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color={theme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)'}
        />
        <Controls
          position="bottom-left"
          style={{ left: 160 }}
          showInteractive={false}
        />
        <MiniMap
          nodeColor={minimapNodeColor}
          maskColor={theme === 'dark' ? 'rgba(9,9,11,0.85)' : 'rgba(250,250,250,0.85)'}
          style={{
            backgroundColor: theme === 'dark' ? 'rgba(24,24,27,0.92)' : 'rgba(255,255,255,0.92)',
            border: `1px solid ${theme === 'dark' ? '#27272a' : '#e4e4e7'}`,
            borderRadius: 8,
          }}
          pannable
          zoomable
        />
      </ReactFlow>
    </div>
  );
}
