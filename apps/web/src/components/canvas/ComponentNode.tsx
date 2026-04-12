'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { ArchitecturalLayer, ComponentRole } from '@codeview/shared';
import { LAYER_COLORS } from './layer-colors';
import { useGraphStore } from '@/store/graph-store';
import {
  FileText,
  Layout,
  Zap,
  Database,
  Wrench,
  ExternalLink,
  Lock,
  Settings,
  Code,
  Globe,
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
  page: FileText,
  component: Layout,
  layout: Layout,
  'api-route': Zap,
  middleware: Lock,
  model: Database,
  schema: Database,
  utility: Wrench,
  hook: Code,
  context: Globe,
  service: ExternalLink,
  config: Settings,
  unknown: FileText,
};

export const ComponentNode = memo(function ComponentNode({
  id,
  data,
  selected,
}: NodeProps & { data: ComponentNodeData }) {
  const {
    selectedNodeIds,
    hoveredNodeId,
    viewMode,
    toggleNodeSelection,
    setSidebarNode,
    getConnectedNodeIds,
  } = useGraphStore();

  const isSelected = selectedNodeIds.has(id);
  const isHovered = hoveredNodeId === id;
  const colors = LAYER_COLORS[data.layer];
  const Icon = ROLE_ICONS[data.role] || FileText;

  // Dim if another node is hovered and this one isn't connected
  let opacity = 1;
  if (hoveredNodeId && hoveredNodeId !== id) {
    const connected = getConnectedNodeIds(hoveredNodeId);
    if (!connected.has(id)) {
      opacity = 0.2;
    }
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleNodeSelection(id);
    setSidebarNode(id);
  };

  return (
    <div
      onClick={handleClick}
      style={{ opacity, transition: 'opacity 0.2s ease' }}
      className={`
        flex items-center gap-2 px-2.5 py-1.5 rounded-lg border cursor-pointer
        transition-all duration-150 min-w-[240px]
        ${isSelected
          ? 'border-blue-500 bg-blue-500/5 shadow-[0_0_0_2px_rgba(59,130,246,0.12)]'
          : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700 hover:bg-zinc-800/80'
        }
      `}
    >
      <Handle type="target" position={Position.Top} className="!w-1.5 !h-1.5 !bg-zinc-600 !border-0 !opacity-0" />
      <Handle type="source" position={Position.Bottom} className="!w-1.5 !h-1.5 !bg-zinc-600 !border-0 !opacity-0" />

      {/* Icon */}
      <div
        className="w-6 h-6 rounded flex items-center justify-center shrink-0"
        style={{ backgroundColor: colors.soft, color: colors.color }}
      >
        <Icon size={13} />
      </div>

      {/* Label */}
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-zinc-100 truncate">
          {data.label}
        </div>
        <div className="text-[10px] text-zinc-500 font-mono truncate">
          {viewMode === 'descriptive' ? data.description : data.relativePath}
        </div>
      </div>

      {/* Connection count badge */}
      {data.connectionCount > 0 && (
        <span className="text-[9px] font-mono text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded shrink-0">
          {data.connectionCount}
        </span>
      )}
    </div>
  );
});
