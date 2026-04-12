import { describe, it, expect } from 'vitest';
import type { GraphData } from '@codeview/shared';
import { diffGraphs } from '../diff';

function makeGraph(nodeIds: string[], edgeIds: string[] = []): GraphData {
  return {
    nodes: nodeIds.map((id) => ({
      id,
      label: id.split('/').pop()?.replace('.ts', '') || id,
      description: `Desc: ${id}`,
      filePath: `/p/${id}`,
      relativePath: id,
      layer: 'ui' as const,
      role: 'component' as const,
      metadata: { exportCount: 1, importCount: 1, connectionCount: 1 },
    })),
    edges: edgeIds.map((id, i) => ({
      id,
      source: nodeIds[i % nodeIds.length],
      target: nodeIds[(i + 1) % nodeIds.length],
      type: 'import' as const,
    })),
    clusters: [],
  };
}

describe('diffGraphs', () => {
  it('detects added nodes', () => {
    const before = makeGraph(['a.ts', 'b.ts']);
    const after = makeGraph(['a.ts', 'b.ts', 'c.ts']);
    const diff = diffGraphs(before, after);
    expect(diff.addedNodes).toHaveLength(1);
    expect(diff.addedNodes[0].id).toBe('c.ts');
    expect(diff.removedNodes).toHaveLength(0);
  });

  it('detects removed nodes', () => {
    const before = makeGraph(['a.ts', 'b.ts', 'c.ts']);
    const after = makeGraph(['a.ts', 'b.ts']);
    const diff = diffGraphs(before, after);
    expect(diff.removedNodes).toHaveLength(1);
    expect(diff.removedNodes[0].id).toBe('c.ts');
    expect(diff.addedNodes).toHaveLength(0);
  });

  it('detects modified nodes (metadata change)', () => {
    const before = makeGraph(['a.ts']);
    const after = makeGraph(['a.ts']);
    after.nodes[0].metadata.connectionCount = 5; // changed
    const diff = diffGraphs(before, after);
    expect(diff.modifiedNodes).toHaveLength(1);
    expect(diff.modifiedNodes[0].after.metadata.connectionCount).toBe(5);
  });

  it('detects added edges', () => {
    const before: GraphData = { nodes: makeGraph(['a.ts', 'b.ts']).nodes, edges: [], clusters: [] };
    const after: GraphData = {
      nodes: makeGraph(['a.ts', 'b.ts']).nodes,
      edges: [{ id: 'e1', source: 'a.ts', target: 'b.ts', type: 'import' }],
      clusters: [],
    };
    const diff = diffGraphs(before, after);
    expect(diff.addedEdges).toHaveLength(1);
  });

  it('detects removed edges', () => {
    const before: GraphData = {
      nodes: makeGraph(['a.ts', 'b.ts']).nodes,
      edges: [{ id: 'e1', source: 'a.ts', target: 'b.ts', type: 'import' }],
      clusters: [],
    };
    const after: GraphData = { nodes: makeGraph(['a.ts', 'b.ts']).nodes, edges: [], clusters: [] };
    const diff = diffGraphs(before, after);
    expect(diff.removedEdges).toHaveLength(1);
  });

  it('returns empty diff for identical graphs', () => {
    const graph = makeGraph(['a.ts', 'b.ts'], ['e1']);
    const diff = diffGraphs(graph, graph);
    expect(diff.addedNodes).toHaveLength(0);
    expect(diff.removedNodes).toHaveLength(0);
    expect(diff.modifiedNodes).toHaveLength(0);
    expect(diff.addedEdges).toHaveLength(0);
    expect(diff.removedEdges).toHaveLength(0);
  });
});
