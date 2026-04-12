'use client';

import { memo, useState, useEffect } from 'react';
import { Handle, Position, useUpdateNodeInternals, type NodeProps } from '@xyflow/react';
import type { ArchitecturalLayer, ComponentRole } from '@codeview/shared';
import { LAYER_COLORS } from './layer-colors';
import { useGraphStore } from '@/store/graph-store';
import {
  FileText, Layout, Zap, Database, Wrench, ExternalLink,
  Lock, Settings, Code, Globe, ChevronDown, ChevronRight,
} from 'lucide-react';

interface ComponentInfo {
  id: string;
  label: string;
  description: string;
  role: ComponentRole;
  connectionCount: number;
  relativePath: string;
}

interface ClusterNodeData {
  label: string;
  description: string;
  layer: ArchitecturalLayer;
  componentCount: number;
  connectionCount: number;
  components: ComponentInfo[];
  [key: string]: unknown;
}

const ROLE_ICONS: Record<string, typeof FileText> = {
  page: FileText, component: Layout, layout: Layout, 'api-route': Zap,
  middleware: Lock, model: Database, schema: Database, utility: Wrench,
  hook: Code, context: Globe, service: ExternalLink, config: Settings, unknown: FileText,
};

export const ClusterNode = memo(function ClusterNode({
  id, data,
}: NodeProps & { data: ClusterNodeData }) {
  const {
    viewMode, theme, zoomLevel,
    selectAllInCluster, selectedNodeIds, selectNode, toggleNodeSelection, setSidebarNode,
    hoveredNodeId, getConnectedNodeIds,
  } = useGraphStore();
  const colors = LAYER_COLORS[data.layer];
  const isDark = theme === 'dark';
  const showComponents = zoomLevel !== 'architecture';
  const [expanded, setExpanded] = useState(true);
  const updateNodeInternals = useUpdateNodeInternals();

  // Tell React Flow to re-measure this node when expanded/collapsed or zoom changes
  useEffect(() => {
    updateNodeInternals(id);
  }, [expanded, zoomLevel, viewMode, id, updateNodeInternals]);

  // Dim if another node is hovered and this cluster isn't connected
  let opacity = 1;
  if (hoveredNodeId) {
    const connected = getConnectedNodeIds(hoveredNodeId);
    const clusterNodeIds = data.components?.map(c => c.id) || [];
    const isConnected = clusterNodeIds.some(nid => connected.has(nid) || nid === hoveredNodeId);
    if (!isConnected) opacity = 0.25;
  }

  return (
    <div
      style={{
        borderColor: isDark ? '#27272a' : '#e4e4e7',
        borderLeftWidth: 3,
        borderLeftColor: colors.border,
        background: isDark ? '#18181b' : '#ffffff',
        opacity, transition: 'opacity 0.2s ease',
        minWidth: 320,
      }}
      className="rounded-xl border shadow-sm"
    >
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !border-0 !rounded-full" style={{ background: colors.color, opacity: 0.5 }} />
      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !border-0 !rounded-full" style={{ background: colors.color, opacity: 0.5 }} />

      {/* Header */}
      <div
        onClick={() => showComponents ? setExpanded(!expanded) : selectAllInCluster(id)}
        className="flex items-center justify-between px-4 pt-3 pb-2 cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.color }} />
          <span className="text-sm font-semibold tracking-tight"
            style={{ color: colors.color, fontFamily: 'var(--font-display)' }}>
            {data.label}
          </span>
          {showComponents && (
            expanded
              ? <ChevronDown size={14} style={{ color: isDark ? '#52525b' : '#a1a1aa' }} />
              : <ChevronRight size={14} style={{ color: isDark ? '#52525b' : '#a1a1aa' }} />
          )}
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full"
          style={{ color: isDark ? '#71717a' : '#a1a1aa', background: isDark ? '#27272a' : '#f4f4f5' }}>
          {data.componentCount} files
        </span>
      </div>

      {/* Description */}
      {viewMode === 'descriptive' && (
        <p className="text-[11px] leading-snug px-4 pb-2"
          style={{ color: isDark ? '#a1a1aa' : '#71717a' }}>
          {data.description}
        </p>
      )}

      {/* Component list — the key change: embedded inside the card */}
      {showComponents && expanded && data.components && data.components.length > 0 && (
        <div className="border-t mx-2 mb-2 pt-1"
          style={{ borderColor: isDark ? '#27272a' : '#e4e4e7' }}>
          {data.components.map((comp) => {
            const isSelected = selectedNodeIds.has(comp.id);
            const Icon = ROLE_ICONS[comp.role] || FileText;
            const isHovered = hoveredNodeId === comp.id;

            return (
              <div
                key={comp.id}
                onClick={(e) => {
                  e.stopPropagation();
                  if (e.shiftKey) {
                    toggleNodeSelection(comp.id);
                  } else {
                    selectNode(comp.id);
                  }
                }}
                onMouseEnter={() => useGraphStore.getState().setHoveredNode(comp.id)}
                onMouseLeave={() => useGraphStore.getState().setHoveredNode(null)}
                className="flex items-start gap-2.5 px-2 py-2 rounded-lg cursor-pointer transition-all duration-100"
                style={{
                  background: isSelected
                    ? 'rgba(59,130,246,0.08)'
                    : isHovered
                    ? (isDark ? '#27272a' : '#f4f4f5')
                    : 'transparent',
                  borderLeft: isSelected ? '2px solid #3b82f6' : '2px solid transparent',
                }}
              >
                <div className="w-6 h-6 rounded flex items-center justify-center shrink-0 mt-0.5"
                  style={{ backgroundColor: colors.soft, color: colors.color }}>
                  <Icon size={13} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-medium"
                    style={{ color: isDark ? '#fafafa' : '#18181b' }}>
                    {comp.label}
                  </div>
                  <div className="text-[10px] leading-snug mt-0.5"
                    style={{ color: isDark ? '#71717a' : '#a1a1aa' }}>
                    {viewMode === 'descriptive' ? comp.description : comp.relativePath}
                  </div>
                </div>
                {comp.connectionCount > 0 && (
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded shrink-0 mt-1"
                    style={{ color: isDark ? '#52525b' : '#a1a1aa', background: isDark ? '#27272a' : '#f4f4f5' }}>
                    {comp.connectionCount}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Stats footer */}
      <div className="flex gap-4 px-4 py-2 border-t"
        style={{ borderColor: isDark ? '#27272a' : '#e4e4e7' }}>
        <div>
          <div className="text-sm font-bold tracking-tight" style={{ color: colors.color, fontFamily: 'var(--font-display)' }}>
            {data.componentCount}
          </div>
          <div className="text-[8px] uppercase tracking-wider" style={{ color: isDark ? '#52525b' : '#a1a1aa' }}>Components</div>
        </div>
        <div>
          <div className="text-sm font-bold tracking-tight" style={{ color: colors.color, fontFamily: 'var(--font-display)' }}>
            {data.connectionCount}
          </div>
          <div className="text-[8px] uppercase tracking-wider" style={{ color: isDark ? '#52525b' : '#a1a1aa' }}>Connections</div>
        </div>
      </div>
    </div>
  );
});
