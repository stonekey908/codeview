import type { ArchitecturalLayer } from '@codeview/shared';

// Muted, professional palette — no generic AI blues/purples
export const LAYER_COLORS: Record<ArchitecturalLayer, { color: string; soft: string; border: string }> = {
  ui:       { color: '#4a90a4', soft: 'rgba(74,144,164,0.08)', border: '#4a90a4' },   // Slate teal
  api:      { color: '#5a8a6e', soft: 'rgba(90,138,110,0.08)', border: '#5a8a6e' },   // Sage green
  data:     { color: '#b08d57', soft: 'rgba(176,141,87,0.08)', border: '#b08d57' },   // Warm sand
  utils:    { color: '#7c8594', soft: 'rgba(124,133,148,0.06)', border: '#7c8594' },   // Cool steel
  external: { color: '#8b7a9e', soft: 'rgba(139,122,158,0.08)', border: '#8b7a9e' },  // Muted plum
};

export const LAYER_LABELS: Record<ArchitecturalLayer, string> = {
  ui: 'UI Components',
  api: 'API Routes',
  data: 'Data Layer',
  utils: 'Utilities',
  external: 'External Services',
};
