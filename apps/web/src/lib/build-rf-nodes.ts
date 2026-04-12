import type { Node, Edge } from '@xyflow/react';
import type { GraphData } from '@codeview/shared';
import type { LayoutResult } from '@codeview/graph-engine';
import type { ZoomLevel } from '@/store/graph-store';

export function buildRfNodes(
  graph: GraphData,
  layout: LayoutResult,
  zoomLevel: ZoomLevel,
  theme: 'dark' | 'light'
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edgeColor = theme === 'dark' ? '#3f3f46' : '#d4d4d8';

  // All views use cluster nodes — components are embedded inside the cluster card
  for (const cluster of graph.clusters) {
    const pos = layout.groups.get(cluster.id);
    if (!pos) continue;

    // Gather the component data for this cluster
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

  // Edges between clusters (aggregated)
  const clusterEdges = buildClusterEdges(graph, edgeColor);
  return { nodes, edges: clusterEdges };
}

function buildClusterEdges(graph: GraphData, color: string): Edge[] {
  const edgeSet = new Set<string>();
  const edges: Edge[] = [];

  for (const edge of graph.edges) {
    const srcCluster = graph.clusters.find((c) => c.nodeIds.includes(edge.source));
    const tgtCluster = graph.clusters.find((c) => c.nodeIds.includes(edge.target));
    if (!srcCluster || !tgtCluster || srcCluster.id === tgtCluster.id) continue;

    const key = `${srcCluster.id}->${tgtCluster.id}`;
    if (edgeSet.has(key)) continue;
    edgeSet.add(key);

    edges.push({
      id: key,
      source: srcCluster.id,
      target: tgtCluster.id,
      type: 'smoothstep',
      animated: false,
      style: { stroke: color, strokeWidth: 1.5 },
      markerEnd: { type: 'arrowclosed' as any, width: 12, height: 12, color },
    });
  }

  return edges;
}
