'use client';

import { memo } from 'react';
import { type NodeProps } from '@xyflow/react';
import type { ArchitecturalLayer } from '@codeview/shared';
import { LAYER_COLORS } from './layer-colors';
import { useGraphStore } from '@/store/graph-store';

interface ClusterNodeData {
  label: string;
  description: string;
  layer: ArchitecturalLayer;
  componentCount: number;
  connectionCount: number;
  [key: string]: unknown;
}

export const ClusterNode = memo(function ClusterNode({
  id,
  data,
}: NodeProps & { data: ClusterNodeData }) {
  const { viewMode, selectAllInCluster } = useGraphStore();
  const colors = LAYER_COLORS[data.layer];

  const handleHeaderClick = () => {
    selectAllInCluster(id);
  };

  return (
    <div
      className="rounded-xl border border-zinc-800 bg-zinc-900"
      style={{ borderLeftWidth: 3, borderLeftColor: colors.border, minWidth: 280 }}
    >
      {/* Header — click to select all */}
      <div
        onClick={handleHeaderClick}
        className="flex items-center justify-between px-3.5 pt-3 pb-2 cursor-pointer"
      >
        <div className="flex items-center gap-1.5">
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: colors.color }}
          />
          <span
            className="text-xs font-semibold tracking-tight"
            style={{ color: colors.color, fontFamily: 'var(--font-display)' }}
          >
            {data.label}
          </span>
        </div>
        <span className="text-[10px] font-mono text-zinc-500 bg-zinc-800/50 px-1.5 py-0.5 rounded">
          {data.componentCount} files
        </span>
      </div>

      {/* Description — only in descriptive mode */}
      {viewMode === 'descriptive' && data.description && (
        <p className="text-[11px] text-zinc-400 leading-snug px-3.5 pb-2 border-b border-zinc-800">
          {data.description}
        </p>
      )}

      {/* Stats footer */}
      <div className="flex gap-3 px-3.5 py-2 border-t border-zinc-800">
        <div>
          <div className="text-sm font-bold tracking-tight" style={{ color: colors.color, fontFamily: 'var(--font-display)' }}>
            {data.componentCount}
          </div>
          <div className="text-[8px] text-zinc-500 uppercase tracking-wide">Components</div>
        </div>
        <div>
          <div className="text-sm font-bold tracking-tight" style={{ color: colors.color, fontFamily: 'var(--font-display)' }}>
            {data.connectionCount}
          </div>
          <div className="text-[8px] text-zinc-500 uppercase tracking-wide">Connections</div>
        </div>
      </div>
    </div>
  );
});
