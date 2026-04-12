import ELK, { type ElkNode, type ElkExtendedEdge } from 'elkjs/lib/elk.bundled.js';
import type { GraphData, GraphCluster, ArchitecturalLayer } from '@codeview/shared';

const elk = new ELK();

const GRID = 20;
const NODE_WIDTH = 260;
const NODE_HEIGHT = 40;
const GROUP_PADDING = 14;
const GROUP_HEADER = 48;

// Layer order: UI at top, API middle, Data/External at bottom
const LAYER_ORDER: Record<ArchitecturalLayer, number> = {
  ui: 0,
  api: 1,
  utils: 1,
  data: 2,
  external: 2,
};

export interface LayoutResult {
  nodes: Map<string, { x: number; y: number; width: number; height: number }>;
  groups: Map<string, { x: number; y: number; width: number; height: number }>;
}

export async function computeLayout(graph: GraphData): Promise<LayoutResult> {
  // Build ELK graph with compound nodes (groups containing children)
  const sortedClusters = [...graph.clusters].sort(
    (a, b) => LAYER_ORDER[a.layer] - LAYER_ORDER[b.layer]
  );

  const children: ElkNode[] = sortedClusters.map((cluster) => ({
    id: cluster.id,
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'DOWN',
      'elk.padding': `[top=${GROUP_HEADER + GROUP_PADDING},left=${GROUP_PADDING},bottom=${GROUP_PADDING},right=${GROUP_PADDING}]`,
      'elk.spacing.nodeNode': '6',
    },
    children: cluster.nodeIds.map((nodeId) => ({
      id: nodeId,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    })),
  }));

  // Add any ungrouped nodes at root level
  const groupedNodeIds = new Set(graph.clusters.flatMap((c) => c.nodeIds));
  const ungroupedNodes = graph.nodes
    .filter((n) => !groupedNodeIds.has(n.id))
    .map((n) => ({
      id: n.id,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    }));

  if (ungroupedNodes.length > 0) {
    children.push(...ungroupedNodes);
  }

  // Build edges for ELK (only between nodes that exist in the layout)
  const allNodeIds = new Set(graph.nodes.map((n) => n.id));
  const edges: ElkExtendedEdge[] = graph.edges
    .filter((e) => allNodeIds.has(e.source) && allNodeIds.has(e.target))
    .map((e) => ({
      id: e.id,
      sources: [e.source],
      targets: [e.target],
    }));

  const rootGraph: ElkNode = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'DOWN',
      'elk.spacing.nodeNode': '40',
      'elk.spacing.edgeNode': '30',
      'elk.layered.spacing.nodeNodeBetweenLayers': '60',
      'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
      'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
    },
    children,
    edges,
  };

  const layouted = await elk.layout(rootGraph);

  // Extract positions and snap to grid
  const nodePositions = new Map<string, { x: number; y: number; width: number; height: number }>();
  const groupPositions = new Map<string, { x: number; y: number; width: number; height: number }>();

  function extractPositions(node: ElkNode, offsetX = 0, offsetY = 0): void {
    const x = snapToGrid((node.x ?? 0) + offsetX);
    const y = snapToGrid((node.y ?? 0) + offsetY);
    const w = node.width ?? NODE_WIDTH;
    const h = node.height ?? NODE_HEIGHT;

    if (node.id.startsWith('cluster-')) {
      groupPositions.set(node.id, { x, y, width: w, height: h });
    } else if (node.id !== 'root') {
      nodePositions.set(node.id, { x, y, width: w, height: h });
    }

    if (node.children) {
      for (const child of node.children) {
        extractPositions(child, x, y);
      }
    }
  }

  if (layouted.children) {
    for (const child of layouted.children) {
      extractPositions(child);
    }
  }

  return { nodes: nodePositions, groups: groupPositions };
}

function snapToGrid(value: number): number {
  return Math.round(value / GRID) * GRID;
}

export { GRID, NODE_WIDTH, NODE_HEIGHT };
