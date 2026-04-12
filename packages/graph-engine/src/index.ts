export { buildGraph } from './builder';
export { humanLabel, humanDescription, layerDescription } from './labeler';
export { computeLayout, GRID, NODE_WIDTH, NODE_HEIGHT } from './layout';
export type { LayoutResult } from './layout';
export { diffGraphs } from './diff';
export type { ArchitectureDiff } from './diff';
// snapshot I/O (fs/child_process) — Node-only, import from '@codeview/graph-engine/snapshot'
export type { Snapshot } from './snapshot';
