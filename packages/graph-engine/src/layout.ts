import ELK, { type ElkNode, type ElkExtendedEdge } from 'elkjs/lib/elk.bundled.js';
import type { GraphData, ArchitecturalLayer } from '@codeview/shared';

const elk = new ELK();

const GRID = 20;
const NODE_WIDTH = 280;
const NODE_HEIGHT = 40;
const NODE_GAP = 10; // 40+10=50, divisible by common factors
const GROUP_PADDING_X = 20; // aligned to grid
const GROUP_PADDING_TOP = 60; // space for header + description
const GROUP_PADDING_BOTTOM = 40; // space for stats footer
const GROUP_GAP = 40;

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

  // Sort clusters into rows by layer order
  const sortedClusters = [...graph.clusters].sort(
    (a, b) => LAYER_ORDER[a.layer] - LAYER_ORDER[b.layer]
  );

  // Group clusters by row
  const rows = new Map<number, typeof sortedClusters>();
  for (const cluster of sortedClusters) {
    const row = LAYER_ORDER[cluster.layer];
    if (!rows.has(row)) rows.set(row, []);
    rows.get(row)!.push(cluster);
  }

  // Layout each row
  let currentY = GRID * 3; // top margin

  for (const [_, rowClusters] of [...rows.entries()].sort((a, b) => a[0] - b[0])) {
    let currentX = GRID * 3; // left margin
    let maxGroupHeight = 0;

    for (const cluster of rowClusters) {
      const nodeCount = cluster.nodeIds.length;
      const groupHeight = GROUP_PADDING_TOP + (nodeCount * (NODE_HEIGHT + NODE_GAP)) - NODE_GAP + GROUP_PADDING_BOTTOM;
      const groupWidth = NODE_WIDTH + GROUP_PADDING_X * 2;

      // Position the group
      const gx = snap(currentX);
      const gy = snap(currentY);
      groupPositions.set(cluster.id, {
        x: gx, y: gy,
        width: groupWidth, height: groupHeight,
      });

      // Position children vertically inside the group (absolute coords, snapped)
      cluster.nodeIds.forEach((nodeId, i) => {
        nodePositions.set(nodeId, {
          x: snap(gx + GROUP_PADDING_X),
          y: snap(gy + GROUP_PADDING_TOP + i * (NODE_HEIGHT + NODE_GAP)),
          width: NODE_WIDTH,
          height: NODE_HEIGHT,
        });
      });

      currentX += groupWidth + GROUP_GAP;
      if (groupHeight > maxGroupHeight) maxGroupHeight = groupHeight;
    }

    currentY += maxGroupHeight + GROUP_GAP;
  }

  // Position any ungrouped nodes below everything
  const groupedNodeIds = new Set(graph.clusters.flatMap((c) => c.nodeIds));
  const ungroupedNodes = graph.nodes.filter((n) => !groupedNodeIds.has(n.id));
  ungroupedNodes.forEach((node, i) => {
    nodePositions.set(node.id, {
      x: snap(GRID * 3 + i * (NODE_WIDTH + 20)),
      y: snap(currentY),
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    });
  });

  return { nodes: nodePositions, groups: groupPositions };
}

function snap(value: number): number {
  return Math.round(value / GRID) * GRID;
}

export { GRID, NODE_WIDTH, NODE_HEIGHT };
