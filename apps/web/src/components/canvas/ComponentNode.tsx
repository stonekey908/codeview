'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { ArchitecturalLayer, ComponentRole } from '@codeview/shared';
import { LAYER_COLORS } from './layer-colors';
import { useGraphStore } from '@/store/graph-store';
import {
  FileText, Layout, Zap, Database, Wrench, ExternalLink,
  Lock, Settings, Code, Globe,
} from 'lucide-react';

interface ComponentNodeData {
  label: string;
  description: string;
  layer: ArchitecturalLayer;
  role: ComponentRole;
  connectionCount: number;
  framework?: string;
  relativePath: string;
  [key: string]: unknown;
}

const ROLE_ICONS: Record<ComponentRole, typeof FileText> = {
  page: FileText, component: Layout, layout: Layout, 'api-route': Zap,
  middleware: Lock, model: Database, schema: Database, utility: Wrench,
  hook: Code, context: Globe, service: ExternalLink, config: Settings, unknown: FileText,
};

export const ComponentNode = memo(function ComponentNode({
  id, data,
}: NodeProps & { data: ComponentNodeData }) {
  const {
    selectedNodeIds, hoveredNodeId, viewMode, theme,
    toggleNodeSelection, setSidebarNode, getConnectedNodeIds,
  } = useGraphStore();

  const isSelected = selectedNodeIds.has(id);
  const colors = LAYER_COLORS[data.layer];
  const Icon = ROLE_ICONS[data.role] || FileText;
  const isDark = theme === 'dark';

  let opacity = 1;
  if (hoveredNodeId && hoveredNodeId !== id) {
    const connected = getConnectedNodeIds(hoveredNodeId);
    if (!connected.has(id)) opacity = 0.2;
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleNodeSelection(id);
    setSidebarNode(id);
  };

  return (
    <div
      onClick={handleClick}
      style={{
        opacity, transition: 'opacity 0.2s ease',
        background: isSelected
          ? 'rgba(59,130,246,0.06)'
          : isDark ? '#18181b' : '#ffffff',
        borderColor: isSelected ? '#3b82f6' : isDark ? '#27272a' : '#e4e4e7',
        boxShadow: isSelected ? '0 0 0 2px rgba(59,130,246,0.12)' : 'none',
      }}
      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border cursor-pointer transition-all duration-150 min-w-[240px]"
    >
      <Handle type="target" position={Position.Top} className="!w-1.5 !h-1.5 !bg-zinc-600 !border-0 !opacity-0" />
      <Handle type="source" position={Position.Bottom} className="!w-1.5 !h-1.5 !bg-zinc-600 !border-0 !opacity-0" />

      <div className="w-6 h-6 rounded flex items-center justify-center shrink-0"
        style={{ backgroundColor: colors.soft, color: colors.color }}>
        <Icon size={13} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium truncate"
          style={{ color: isDark ? '#fafafa' : '#18181b' }}>
          {data.label}
        </div>
        <div className="text-[10px] font-mono truncate"
          style={{ color: isDark ? '#71717a' : '#a1a1aa' }}>
          {viewMode === 'descriptive' ? data.description : data.relativePath}
        </div>
      </div>

      {data.connectionCount > 0 && (
        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded shrink-0"
          style={{
            color: isDark ? '#71717a' : '#a1a1aa',
            background: isDark ? '#27272a' : '#f4f4f5',
          }}>
          {data.connectionCount}
        </span>
      )}
    </div>
  );
});
