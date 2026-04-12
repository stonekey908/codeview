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

  if (zoomLevel === 'architecture') {
    // Show only cluster groups — no individual component nodes
    for (const cluster of graph.clusters) {
      const pos = layout.groups.get(cluster.id);
      if (!pos) continue;
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
        },
        style: { width: pos.width, height: pos.height },
        draggable: true,
      });
    }

    // Edges between clusters (aggregate)
    const clusterEdges = buildClusterEdges(graph, edgeColor);
    return { nodes, edges: clusterEdges };
  }

  // "modules" and "components" — show groups + individual component nodes
  for (const cluster of graph.clusters) {
    const pos = layout.groups.get(cluster.id);
    if (!pos) continue;
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
      },
      style: { width: pos.width, height: pos.height },
      draggable: true,
    });
  }

  for (const node of graph.nodes) {
    const pos = layout.nodes.get(node.id);
    if (!pos) continue;
    const cluster = graph.clusters.find((c) => c.nodeIds.includes(node.id));

    let x = pos.x;
    let y = pos.y;
    if (cluster) {
      const parentPos = layout.groups.get(cluster.id);
      if (parentPos) {
        x = pos.x - parentPos.x;
        y = pos.y - parentPos.y;
      }
    }

    nodes.push({
      id: node.id,
      type: 'component',
      position: { x, y },
      parentId: cluster?.id,
      data: {
        label: node.label,
        description: node.description,
        layer: node.layer,
        role: node.role,
        connectionCount: node.metadata.connectionCount,
        framework: node.metadata.framework,
        relativePath: node.relativePath,
      },
    });
  }

  const edges: Edge[] = graph.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: 'smoothstep',
    animated: false,
    style: { stroke: edgeColor, strokeWidth: 1 },
    markerEnd: { type: 'arrowclosed' as any, width: 10, height: 10, color: edgeColor },
  }));

  return { nodes, edges };
}

function buildClusterEdges(graph: GraphData, color: string): Edge[] {
  // Build edges between clusters based on which clusters have nodes that connect
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
