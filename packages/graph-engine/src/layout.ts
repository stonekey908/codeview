import type { GraphData, ArchitecturalLayer } from '@codeview/shared';

const GRID = 20;
const NODE_WIDTH = 300;
const NODE_HEIGHT = 60; // realistic height for node with description text
const NODE_GAP = 8;
const GROUP_PADDING_X = 20;
const GROUP_PADDING_TOP = 100; // header + description + some breathing room
const GROUP_PADDING_BOTTOM = 60; // stats footer
const GROUP_GAP = 60;

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
      const contentHeight = nodeCount * (NODE_HEIGHT + NODE_GAP) - NODE_GAP;
      const groupHeight = snap(GROUP_PADDING_TOP + contentHeight + GROUP_PADDING_BOTTOM);
      const groupWidth = snap(NODE_WIDTH + GROUP_PADDING_X * 2);

      const gx = snap(currentX);
      const gy = snap(currentY);
      groupPositions.set(cluster.id, { x: gx, y: gy, width: groupWidth, height: groupHeight });

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
