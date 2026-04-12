import type { GraphNode, GraphEdge, GraphData } from '@codeview/shared';

const MAX_DETAILED_NODES = 15;

export interface AssembleOptions {
  selectedNodeIds: string[];
  question?: string;
  graphData: GraphData;
}

export function assembleContext(options: AssembleOptions): string {
  const { selectedNodeIds, question, graphData } = options;
  const selectedNodes = graphData.nodes.filter((n) => selectedNodeIds.includes(n.id));

  if (selectedNodes.length === 0) return '';

  const lines: string[] = [];
  lines.push('I\'m asking about these components in the architecture:\n');

  if (selectedNodes.length <= MAX_DETAILED_NODES) {
    // Detailed mode — full info per component
    selectedNodes.forEach((node, i) => {
      const deps = getDependencyNames(node.id, graphData);
      const dependents = getDependentNames(node.id, graphData);

      lines.push(`${i + 1}. ${node.label} (${node.relativePath})`);
      lines.push(`   - ${node.description}`);
      lines.push(`   - Layer: ${node.layer}, Role: ${node.role}`);
      if (deps.length > 0) lines.push(`   - Depends on: ${deps.join(', ')}`);
      if (dependents.length > 0) lines.push(`   - Used by: ${dependents.join(', ')}`);
      lines.push('');
    });
  } else {
    // Summary mode for large selections
    lines.push(`Selected ${selectedNodes.length} components across these layers:\n`);

    const byLayer = groupByLayer(selectedNodes);
    for (const [layer, nodes] of Object.entries(byLayer)) {
      lines.push(`**${layer}** (${nodes.length}):`);
      // Show first 5 with names, then "and X more"
      const shown = nodes.slice(0, 5);
      const remaining = nodes.length - shown.length;
      shown.forEach((n) => lines.push(`  - ${n.label} (${n.relativePath})`));
      if (remaining > 0) lines.push(`  - ...and ${remaining} more`);
      lines.push('');
    }

    lines.push('Key relationships between selected components:');
    const internalEdges = graphData.edges.filter(
      (e) => selectedNodeIds.includes(e.source) && selectedNodeIds.includes(e.target)
    );
    const shownEdges = internalEdges.slice(0, 10);
    shownEdges.forEach((e) => {
      const src = graphData.nodes.find((n) => n.id === e.source);
      const tgt = graphData.nodes.find((n) => n.id === e.target);
      if (src && tgt) lines.push(`  ${src.label} → ${tgt.label}`);
    });
    if (internalEdges.length > 10) {
      lines.push(`  ...and ${internalEdges.length - 10} more connections`);
    }
    lines.push('');
  }

  if (question?.trim()) {
    lines.push(`Question: ${question.trim()}`);
  }

  return lines.join('\n');
}

function getDependencyNames(nodeId: string, graphData: GraphData): string[] {
  return graphData.edges
    .filter((e) => e.source === nodeId)
    .map((e) => graphData.nodes.find((n) => n.id === e.target)?.label)
    .filter((name): name is string => !!name);
}

function getDependentNames(nodeId: string, graphData: GraphData): string[] {
  return graphData.edges
    .filter((e) => e.target === nodeId)
    .map((e) => graphData.nodes.find((n) => n.id === e.source)?.label)
    .filter((name): name is string => !!name);
}

function groupByLayer(nodes: GraphNode[]): Record<string, GraphNode[]> {
  const groups: Record<string, GraphNode[]> = {};
  for (const node of nodes) {
    const key = node.layer.charAt(0).toUpperCase() + node.layer.slice(1);
    if (!groups[key]) groups[key] = [];
    groups[key].push(node);
  }
  return groups;
}
