import { describe, it, expect } from 'vitest';
import type { GraphData } from '@codeview/shared';
import { assembleContext } from '../assembler';

function makeGraph(): GraphData {
  return {
    nodes: [
      { id: 'src/app/page.tsx', label: 'Page', description: 'A screen in the app: Page', filePath: '/p/src/app/page.tsx', relativePath: 'src/app/page.tsx', layer: 'ui', role: 'page', metadata: { exportCount: 1, importCount: 1, connectionCount: 1 } },
      { id: 'src/api/auth/route.ts', label: 'Auth API', description: 'Handles requests from the app: Auth API', filePath: '/p/src/api/auth/route.ts', relativePath: 'src/api/auth/route.ts', layer: 'api', role: 'api-route', metadata: { exportCount: 2, importCount: 1, connectionCount: 2 } },
      { id: 'src/utils/format.ts', label: 'Format', description: 'A helper function used by other parts: Format', filePath: '/p/src/utils/format.ts', relativePath: 'src/utils/format.ts', layer: 'utils', role: 'utility', metadata: { exportCount: 2, importCount: 0, connectionCount: 1 } },
    ],
    edges: [
      { id: 'e1', source: 'src/app/page.tsx', target: 'src/api/auth/route.ts', type: 'import' },
      { id: 'e2', source: 'src/api/auth/route.ts', target: 'src/utils/format.ts', type: 'import' },
    ],
    clusters: [],
  };
}

describe('assembleContext', () => {
  it('assembles context for selected components', () => {
    const graph = makeGraph();
    const result = assembleContext({
      selectedNodeIds: ['src/app/page.tsx', 'src/api/auth/route.ts'],
      graphData: graph,
    });

    expect(result).toContain('Page');
    expect(result).toContain('Auth API');
    expect(result).toContain('src/app/page.tsx');
    expect(result).toContain('Depends on: Auth API');
    expect(result).toContain('Used by: Page');
  });

  it('includes the question when provided', () => {
    const graph = makeGraph();
    const result = assembleContext({
      selectedNodeIds: ['src/app/page.tsx'],
      question: 'How does login work?',
      graphData: graph,
    });

    expect(result).toContain('Question: How does login work?');
  });

  it('returns empty string when no nodes selected', () => {
    const graph = makeGraph();
    const result = assembleContext({
      selectedNodeIds: [],
      graphData: graph,
    });

    expect(result).toBe('');
  });

  it('summarizes when more than 15 components selected', () => {
    // Create 20 nodes
    const nodes = Array.from({ length: 20 }, (_, i) => ({
      id: `src/comp${i}.ts`,
      label: `Component ${i}`,
      description: `Desc ${i}`,
      filePath: `/p/src/comp${i}.ts`,
      relativePath: `src/comp${i}.ts`,
      layer: 'ui' as const,
      role: 'component' as const,
      metadata: { exportCount: 1, importCount: 0, connectionCount: 0 },
    }));

    const graph: GraphData = { nodes, edges: [], clusters: [] };
    const result = assembleContext({
      selectedNodeIds: nodes.map((n) => n.id),
      graphData: graph,
    });

    expect(result).toContain('Selected 20 components');
    expect(result).toContain('...and');
  });

  it('includes layer and role in detailed mode', () => {
    const graph = makeGraph();
    const result = assembleContext({
      selectedNodeIds: ['src/api/auth/route.ts'],
      graphData: graph,
    });

    expect(result).toContain('Layer: api');
    expect(result).toContain('Role: api-route');
  });

  it('shows dependency relationships', () => {
    const graph = makeGraph();
    const result = assembleContext({
      selectedNodeIds: ['src/api/auth/route.ts'],
      graphData: graph,
    });

    expect(result).toContain('Depends on: Format');
    expect(result).toContain('Used by: Page');
  });
});
