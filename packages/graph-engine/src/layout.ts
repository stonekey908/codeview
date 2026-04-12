import type { GraphData, ArchitecturalLayer } from '@codeview/shared';

const GRID = 20;
const NODE_WIDTH = 340;
const NODE_HEIGHT = 60;
const GROUP_GAP = 60;

// Estimate group height based on number of components
// In the UI, each component row is ~55px in descriptive mode, ~45px in technical
const EST_COMPONENT_ROW = 60;
const EST_HEADER = 120; // header + description + stats
const EST_MIN_HEIGHT = 180; // minimum group height

const LAYER_ORDER: Record<ArchitecturalLayer, number> = {
  ui: 0, api: 0, utils: 0, data: 1, external: 1,
};

export interface LayoutResult {
  nodes: Map<string, { x: number; y: number; width: number; height: number }>;
  groups: Map<string, { x: number; y: number; width: number; height: number }>;
}

export async function computeLayout(graph: GraphData): Promise<LayoutResult> {
  const nodePositions = new Map<string, { x: number; y: number; width: number; height: number }>();
  const groupPositions = new Map<string, { x: number; y: number; width: number; height: number }>();

  const sortedClusters = [...graph.clusters].sort(
    (a, b) => LAYER_ORDER[a.layer] - LAYER_ORDER[b.layer]
  );

  const rows = new Map<number, typeof sortedClusters>();
  for (const cluster of sortedClusters) {
    const row = LAYER_ORDER[cluster.layer];
    if (!rows.has(row)) rows.set(row, []);
    rows.get(row)!.push(cluster);
  }

  let currentY = GRID * 3;

  for (const [_, rowClusters] of [...rows.entries()].sort((a, b) => a[0] - b[0])) {
    let currentX = GRID * 3;
    let maxGroupHeight = 0;

    for (const cluster of rowClusters) {
      const nodeCount = cluster.nodeIds.length;
      const groupHeight = snap(Math.max(
        EST_MIN_HEIGHT,
        EST_HEADER + nodeCount * EST_COMPONENT_ROW
      ));
      const groupWidth = snap(NODE_WIDTH);

      const gx = snap(currentX);
      const gy = snap(currentY);
      groupPositions.set(cluster.id, { x: gx, y: gy, width: groupWidth, height: groupHeight });

      currentX += groupWidth + GROUP_GAP;
      if (groupHeight > maxGroupHeight) maxGroupHeight = groupHeight;
    }

    currentY += maxGroupHeight + GROUP_GAP;
  }

  return { nodes: nodePositions, groups: groupPositions };
}

function snap(value: number): number {
  return Math.round(value / GRID) * GRID;
}

export { GRID, NODE_WIDTH, NODE_HEIGHT };
