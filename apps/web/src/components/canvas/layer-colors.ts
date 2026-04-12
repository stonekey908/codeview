import type { ArchitecturalLayer } from '@codeview/shared';

export const LAYER_COLORS: Record<ArchitecturalLayer, { color: string; soft: string; border: string }> = {
  ui: { color: '#3b82f6', soft: 'rgba(59,130,246,0.08)', border: '#3b82f6' },
  api: { color: '#22c55e', soft: 'rgba(34,197,94,0.08)', border: '#22c55e' },
  data: { color: '#f59e0b', soft: 'rgba(245,158,11,0.08)', border: '#f59e0b' },
  utils: { color: '#71717a', soft: 'rgba(113,113,122,0.06)', border: '#71717a' },
  external: { color: '#a855f7', soft: 'rgba(168,85,247,0.08)', border: '#a855f7' },
};

export const LAYER_LABELS: Record<ArchitecturalLayer, string> = {
  ui: 'UI Components',
  api: 'API Routes',
  data: 'Data Layer',
  utils: 'Utilities',
  external: 'External Services',
};
