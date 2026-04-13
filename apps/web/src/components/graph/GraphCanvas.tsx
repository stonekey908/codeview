'use client';

import { useCallback, useEffect } from 'react';
import {
  ReactFlow, Background, Controls, MiniMap, BackgroundVariant,
  useNodesState, useEdgesState, type Node, type NodeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ClusterNode } from '@/components/canvas/ClusterNode';
import { useGraphStore } from '@/store/graph-store';
import { LAYER_COLORS } from '@/components/canvas/layer-colors';
import type { ArchitecturalLayer } from '@codeview/shared';

const nodeTypes = { cluster: ClusterNode };

export function GraphCanvas() {
  const {
    rfNodes: storeNodes, rfEdges: storeEdges,
    setHoveredNode, theme, middleView, setMiddleView,
  } = useGraphStore();
  const isDark = theme === 'dark';

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([] as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([] as any[]);

  useEffect(() => { if (storeNodes.length > 0) setNodes(storeNodes); }, [storeNodes, setNodes]);
  useEffect(() => { if (storeEdges.length > 0) setEdges(storeEdges); }, [storeEdges, setEdges]);

  const onNodeMouseEnter: NodeMouseHandler = useCallback((_e, node) => {
    if (node.type === 'component') setHoveredNode(node.id);
  }, [setHoveredNode]);

  const onNodeMouseLeave: NodeMouseHandler = useCallback(() => setHoveredNode(null), [setHoveredNode]);

  const minimapNodeColor = useCallback((node: Node) => {
    const layer = (node.data as { layer?: ArchitecturalLayer })?.layer;
    return layer ? LAYER_COLORS[layer].color : '#71717a';
  }, []);

  return (
    <div className="relative w-full h-full" style={{ background: isDark ? '#09090b' : '#fafbfc' }}>
      {/* Graph / Detail View toggle */}
      <div className="absolute top-3 left-3 z-10 flex gap-0.5 p-0.5 rounded-lg"
        style={{ background: isDark ? '#111114' : '#ffffff', border: `1px solid ${isDark ? '#1e1e28' : '#e5e7eb'}` }}>
        {(['graph', 'full-detail'] as const).map((v) => (
          <button key={v} onClick={() => setMiddleView(v)}
            className="px-3 py-1 text-[11px] font-medium rounded-md transition-all capitalize"
            style={{
              background: middleView === v ? (isDark ? '#1a1a1f' : '#f3f4f6') : 'transparent',
              color: middleView === v ? (isDark ? '#f4f4f8' : '#111827') : (isDark ? '#505068' : '#9ca3af'),
            }}>
            {v === 'full-detail' ? 'Detail View' : 'Graph'}
          </button>
        ))}
      </div>

      <ReactFlow
        nodes={nodes} edges={edges}
        onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
        onNodeMouseEnter={onNodeMouseEnter} onNodeMouseLeave={onNodeMouseLeave}
        nodeTypes={nodeTypes} colorMode={theme}
        fitView fitViewOptions={{ padding: 0.3 }}
        snapToGrid snapGrid={[20, 20]} minZoom={0.2} maxZoom={2}
        defaultEdgeOptions={{
          type: 'smoothstep', animated: true,
          style: { stroke: isDark ? '#2a2a38' : '#d1d5db', strokeWidth: 1.5 },
          markerEnd: { type: 'arrowclosed' as any, width: 12, height: 12, color: isDark ? '#2a2a38' : '#d1d5db' },
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1}
          color={isDark ? 'rgba(255,255,255,.025)' : 'rgba(0,0,0,.04)'} />
        <Controls position="bottom-left" showInteractive={false} />
        <MiniMap nodeColor={minimapNodeColor} pannable zoomable
          maskColor={isDark ? 'rgba(9,9,11,.85)' : 'rgba(250,251,252,.85)'}
          style={{ backgroundColor: isDark ? 'rgba(17,17,20,.92)' : 'rgba(255,255,255,.92)', border: `1px solid ${isDark ? '#1e1e28' : '#e5e7eb'}`, borderRadius: 8 }} />
      </ReactFlow>

      {/* Legend */}
      <div className="absolute bottom-3 right-3 z-10 flex gap-2.5 px-3 py-2 rounded-lg"
        style={{ background: isDark ? '#111114' : '#ffffff', border: `1px solid ${isDark ? '#1e1e28' : '#e5e7eb'}` }}>
        {Object.entries(LAYER_COLORS).map(([key, { color }]) => (
          <div key={key} className="flex items-center gap-1 text-[9px]" style={{ color: isDark ? '#505068' : '#9ca3af' }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />{key.toUpperCase()}
          </div>
        ))}
      </div>
    </div>
  );
}
