'use client';

import { memo, useEffect } from 'react';
import { Handle, Position, useUpdateNodeInternals, type NodeProps } from '@xyflow/react';
import type { ArchitecturalLayer, ComponentRole } from '@codeview/shared';
import { LAYER_COLORS } from './layer-colors';
import { useGraphStore } from '@/store/graph-store';
import {
  FileText, Layout, Zap, Database, Wrench, ExternalLink,
  Lock, Settings, Code, Globe, ChevronDown, ChevronRight, Focus,
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
    viewMode, theme, expandedClusterIds, toggleCluster, focusedNodeId,
    selectedNodeIds, selectNode, toggleNodeSelection,
    hoveredNodeId, getConnectedNodeIds, openDetail, setFocusedNode,
  } = useGraphStore();
  const colors = LAYER_COLORS[data.layer];
  const isDark = theme === 'dark';
  const expanded = expandedClusterIds.has(id);
  const updateNodeInternals = useUpdateNodeInternals();

  useEffect(() => {
    // Re-measure when expanded/collapsed
    const timer = setTimeout(() => updateNodeInternals(id), 50);
    return () => clearTimeout(timer);
  }, [expanded, viewMode, id, updateNodeInternals]);

  // Focus mode: dim if this cluster has no connection to focused node
  let opacity = 1;
  if (focusedNodeId) {
    const connected = getConnectedNodeIds(focusedNodeId);
    const clusterNodeIds = data.components?.map(c => c.id) || [];
    const isConnected = clusterNodeIds.some(nid => connected.has(nid) || nid === focusedNodeId);
    if (!isConnected) opacity = 0.1;
  } else if (hoveredNodeId) {
    const connected = getConnectedNodeIds(hoveredNodeId);
    const clusterNodeIds = data.components?.map(c => c.id) || [];
    const isConnected = clusterNodeIds.some(nid => connected.has(nid) || nid === hoveredNodeId);
    if (!isConnected) opacity = 0.25;
  }

  return (
    <div
      style={{ borderLeftWidth: 3, borderLeftColor: colors.border, opacity, transition: 'opacity 0.2s ease', minWidth: 340, maxWidth: 380 }}
      className="rounded-xl border border-border bg-card shadow-sm"
    >
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !border-0 !rounded-full" style={{ background: colors.color, opacity: 0.5 }} />
      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !border-0 !rounded-full" style={{ background: colors.color, opacity: 0.5 }} />

      {/* Header — click to expand/collapse */}
      <div
        onClick={() => toggleCluster(id)}
        className="flex items-center justify-between px-4 pt-3 pb-2 cursor-pointer group"
      >
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.color }} />
          <span className="text-sm font-semibold tracking-tight"
            style={{ color: colors.color, fontFamily: 'var(--font-display)' }}>
            {data.label}
          </span>
          {expanded
            ? <ChevronDown size={14} style={{ color: isDark ? '#52525b' : '#a1a1aa' }} />
            : <ChevronRight size={14} style={{ color: isDark ? '#52525b' : '#a1a1aa' }} />
          }
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full"
          style={{ color: isDark ? '#71717a' : '#a1a1aa', background: isDark ? '#27272a' : '#f4f4f5' }}>
          {data.componentCount}
        </span>
      </div>

      {/* Description */}
      {(
        <p className="text-[11px] leading-snug px-4 pb-2"
          style={{ color: isDark ? '#a1a1aa' : '#71717a' }}>
          {data.description}
        </p>
      )}

      {/* Expanded: component list */}
      {expanded && data.components && data.components.length > 0 && (
        <div className="border-t mx-2 mb-1 pt-1"
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
                    openDetail(comp.id);
                  }
                }}
                onMouseEnter={() => useGraphStore.getState().setHoveredNode(comp.id)}
                onMouseLeave={() => useGraphStore.getState().setHoveredNode(null)}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setFocusedNode(comp.id);
                }}
                className="flex items-start gap-2.5 px-2 py-2 rounded-lg cursor-pointer transition-all duration-100"
                style={{
                  background: isSelected
                    ? 'rgba(59,130,246,0.08)'
                    : isHovered ? (isDark ? '#27272a' : '#f4f4f5') : 'transparent',
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
                    style={{
                      color: isDark ? '#71717a' : '#a1a1aa',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical' as any,
                      overflow: 'hidden',
                    }}>
                    {comp.description}
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
      {!expanded && (
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
      )}
    </div>
  );
});
