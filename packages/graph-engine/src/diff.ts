import type { GraphData, GraphNode, GraphEdge } from '@codeview/shared';

export interface ArchitectureDiff {
  addedNodes: GraphNode[];
  removedNodes: GraphNode[];
  modifiedNodes: { before: GraphNode; after: GraphNode }[];
  addedEdges: GraphEdge[];
  removedEdges: GraphEdge[];
}

export function diffGraphs(before: GraphData, after: GraphData): ArchitectureDiff {
  const beforeNodeIds = new Set(before.nodes.map((n) => n.id));
  const afterNodeIds = new Set(after.nodes.map((n) => n.id));
  const beforeEdgeIds = new Set(before.edges.map((e) => e.id));
  const afterEdgeIds = new Set(after.edges.map((e) => e.id));

  const addedNodes = after.nodes.filter((n) => !beforeNodeIds.has(n.id));
  const removedNodes = before.nodes.filter((n) => !afterNodeIds.has(n.id));

  const modifiedNodes: { before: GraphNode; after: GraphNode }[] = [];
  for (const afterNode of after.nodes) {
    if (!beforeNodeIds.has(afterNode.id)) continue;
    const beforeNode = before.nodes.find((n) => n.id === afterNode.id);
    if (!beforeNode) continue;
    if (
      beforeNode.metadata.connectionCount !== afterNode.metadata.connectionCount ||
      beforeNode.metadata.exportCount !== afterNode.metadata.exportCount ||
      beforeNode.metadata.importCount !== afterNode.metadata.importCount ||
      beforeNode.layer !== afterNode.layer ||
      beforeNode.role !== afterNode.role
    ) {
      modifiedNodes.push({ before: beforeNode, after: afterNode });
    }
  }

  const addedEdges = after.edges.filter((e) => !beforeEdgeIds.has(e.id));
  const removedEdges = before.edges.filter((e) => !afterEdgeIds.has(e.id));

  return { addedNodes, removedNodes, modifiedNodes, addedEdges, removedEdges };
}
