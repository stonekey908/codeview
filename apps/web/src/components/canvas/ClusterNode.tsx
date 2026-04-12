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
  id, data,
}: NodeProps & { data: ClusterNodeData }) {
  const { viewMode, theme, selectAllInCluster } = useGraphStore();
  const colors = LAYER_COLORS[data.layer];
  const isDark = theme === 'dark';

  return (
    <div
      className="rounded-xl border"
      style={{
        borderColor: isDark ? '#27272a' : '#e4e4e7',
        borderLeftWidth: 3,
        borderLeftColor: colors.border,
        background: isDark ? '#18181b' : '#ffffff',
        minWidth: 280,
      }}
    >
      <div
        onClick={() => selectAllInCluster(id)}
        className="flex items-center justify-between px-3.5 pt-3 pb-2 cursor-pointer"
      >
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colors.color }} />
          <span className="text-xs font-semibold tracking-tight"
            style={{ color: colors.color, fontFamily: 'var(--font-display)' }}>
            {data.label}
          </span>
        </div>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded"
          style={{ color: isDark ? '#71717a' : '#a1a1aa', background: isDark ? 'rgba(39,39,42,0.5)' : 'rgba(244,244,245,0.8)' }}>
          {data.componentCount} files
        </span>
      </div>

      {viewMode === 'descriptive' && data.description && (
        <p className="text-[11px] leading-snug px-3.5 pb-2 border-b"
          style={{ color: isDark ? '#a1a1aa' : '#71717a', borderColor: isDark ? '#27272a' : '#e4e4e7' }}>
          {data.description}
        </p>
      )}

      <div className="flex gap-3 px-3.5 py-2 border-t"
        style={{ borderColor: isDark ? '#27272a' : '#e4e4e7' }}>
        <div>
          <div className="text-sm font-bold tracking-tight" style={{ color: colors.color, fontFamily: 'var(--font-display)' }}>
            {data.componentCount}
          </div>
          <div className="text-[8px] uppercase tracking-wide" style={{ color: isDark ? '#52525b' : '#a1a1aa' }}>Components</div>
        </div>
        <div>
          <div className="text-sm font-bold tracking-tight" style={{ color: colors.color, fontFamily: 'var(--font-display)' }}>
            {data.connectionCount}
          </div>
          <div className="text-[8px] uppercase tracking-wide" style={{ color: isDark ? '#52525b' : '#a1a1aa' }}>Connections</div>
        </div>
      </div>
    </div>
  );
});
