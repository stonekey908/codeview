import type { Node, Edge } from '@xyflow/react';
import type { GraphData } from '@codeview/shared';
import type { LayoutResult } from '@codeview/graph-engine';

export function buildRfNodes(
  graph: GraphData,
  layout: LayoutResult,
  theme: 'dark' | 'light'
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edgeColor = theme === 'dark' ? '#3f3f46' : '#d4d4d8';

  // Single view: cluster nodes with embedded components
  for (const cluster of graph.clusters) {
    const pos = layout.groups.get(cluster.id);
    if (!pos) continue;

    const components = cluster.nodeIds.map((nodeId) => {
      const node = graph.nodes.find((n) => n.id === nodeId);
      if (!node) return null;
      return {
        id: node.id,
        label: node.label,
        description: node.description,
        role: node.role,
        connectionCount: node.metadata.connectionCount,
        relativePath: node.relativePath,
      };
    }).filter(Boolean);

    nodes.push({
      id: cluster.id,
      type: 'cluster',
      position: { x: pos.x, y: pos.y },
      data: {
        label: cluster.label,
        description: cluster.description,
        layer: cluster.layer,
        componentCount: cluster.metadata.componentCount,
        connectionCount: cluster.metadata.connectionCount,
        components,
      },
      draggable: true,
    });
  }

  // Cluster-level edges (aggregated)
  const edgeSet = new Set<string>();
  const edges: Edge[] = [];
  const edgeCounts = new Map<string, number>();

  for (const edge of graph.edges) {
    const srcCluster = graph.clusters.find((c) => c.nodeIds.includes(edge.source));
    const tgtCluster = graph.clusters.find((c) => c.nodeIds.includes(edge.target));
    if (!srcCluster || !tgtCluster || srcCluster.id === tgtCluster.id) continue;

    const key = `${srcCluster.id}->${tgtCluster.id}`;
    edgeCounts.set(key, (edgeCounts.get(key) || 0) + 1);

    if (edgeSet.has(key)) continue;
    edgeSet.add(key);

    edges.push({
      id: key,
      source: srcCluster.id,
      target: tgtCluster.id,
      type: 'smoothstep',
      animated: true,
      label: '', // will be set below
      style: { stroke: edgeColor, strokeWidth: 1.5 },
      markerEnd: { type: 'arrowclosed' as any, width: 12, height: 12, color: edgeColor },
    });
  }

  // Add labels with connection counts
  for (const edge of edges) {
    const key = edge.id;
    const count = edgeCounts.get(key) || 0;
    if (count > 0) {
      edge.label = `${count} connection${count > 1 ? 's' : ''}`;
      (edge as any).labelStyle = { fill: theme === 'dark' ? '#71717a' : '#a1a1aa', fontSize: 10 };
      (edge as any).labelBgStyle = { fill: theme === 'dark' ? '#18181b' : '#ffffff' };
      // Thicker lines for more connections
      if (edge.style) edge.style.strokeWidth = Math.min(1 + count * 0.3, 4);
    }
  }

  return { nodes, edges };
}
