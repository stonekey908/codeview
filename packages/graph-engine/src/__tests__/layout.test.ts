import { describe, it, expect } from 'vitest';
import type { GraphData } from '@codeview/shared';
import { computeLayout, GRID } from '../layout';

function makeGraph(): GraphData {
  return {
    nodes: [
      {
        id: 'src/app/page.tsx',
        label: 'Page',
        description: 'A page',
        filePath: '/p/src/app/page.tsx',
        relativePath: 'src/app/page.tsx',
        layer: 'ui',
        role: 'page',
        metadata: { exportCount: 1, importCount: 1, connectionCount: 1, framework: 'nextjs' },
      },
      {
        id: 'src/app/layout.tsx',
        label: 'Layout',
        description: 'A layout',
        filePath: '/p/src/app/layout.tsx',
        relativePath: 'src/app/layout.tsx',
        layer: 'ui',
        role: 'layout',
        metadata: { exportCount: 1, importCount: 0, connectionCount: 0 },
      },
      {
        id: 'src/api/auth/route.ts',
        label: 'Auth API',
        description: 'Auth endpoint',
        filePath: '/p/src/api/auth/route.ts',
        relativePath: 'src/api/auth/route.ts',
        layer: 'api',
        role: 'api-route',
        metadata: { exportCount: 2, importCount: 1, connectionCount: 1 },
      },
      {
        id: 'src/utils/format.ts',
        label: 'Format',
        description: 'Formatter',
        filePath: '/p/src/utils/format.ts',
        relativePath: 'src/utils/format.ts',
        layer: 'utils',
        role: 'utility',
        metadata: { exportCount: 2, importCount: 0, connectionCount: 1 },
      },
    ],
    edges: [
      { id: 'e1', source: 'src/app/page.tsx', target: 'src/api/auth/route.ts', type: 'import' },
      { id: 'e2', source: 'src/api/auth/route.ts', target: 'src/utils/format.ts', type: 'import' },
    ],
    clusters: [
      {
        id: 'cluster-ui',
        label: 'UI Components',
        description: 'UI layer',
        layer: 'ui',
        nodeIds: ['src/app/page.tsx', 'src/app/layout.tsx'],
        metadata: { componentCount: 2, connectionCount: 1 },
      },
      {
        id: 'cluster-api',
        label: 'API Routes',
        description: 'API layer',
        layer: 'api',
        nodeIds: ['src/api/auth/route.ts'],
        metadata: { componentCount: 1, connectionCount: 2 },
      },
      {
        id: 'cluster-utils',
        label: 'Utilities',
        description: 'Utils layer',
        layer: 'utils',
        nodeIds: ['src/utils/format.ts'],
        metadata: { componentCount: 1, connectionCount: 1 },
      },
    ],
  };
}

describe('computeLayout', () => {
  it('produces positions for all nodes', async () => {
    const graph = makeGraph();
    const layout = await computeLayout(graph);
    expect(layout.nodes.size).toBe(4);
    for (const [, pos] of layout.nodes) {
      expect(pos.x).toBeGreaterThanOrEqual(0);
      expect(pos.y).toBeGreaterThanOrEqual(0);
      expect(pos.width).toBeGreaterThan(0);
      expect(pos.height).toBeGreaterThan(0);
    }
  });

  it('produces positions for all groups', async () => {
    const graph = makeGraph();
    const layout = await computeLayout(graph);
    expect(layout.groups.size).toBe(3);
    expect(layout.groups.has('cluster-ui')).toBe(true);
    expect(layout.groups.has('cluster-api')).toBe(true);
    expect(layout.groups.has('cluster-utils')).toBe(true);
  });

  it('snaps all positions to grid', async () => {
    const graph = makeGraph();
    const layout = await computeLayout(graph);
    for (const [, pos] of layout.nodes) {
      expect(pos.x % GRID).toBe(0);
      expect(pos.y % GRID).toBe(0);
    }
    for (const [, pos] of layout.groups) {
      expect(pos.x % GRID).toBe(0);
      expect(pos.y % GRID).toBe(0);
    }
  });

  it('positions UI layer above API layer', async () => {
    const graph = makeGraph();
    const layout = await computeLayout(graph);
    const uiGroup = layout.groups.get('cluster-ui');
    const apiGroup = layout.groups.get('cluster-api');
    expect(uiGroup).toBeDefined();
    expect(apiGroup).toBeDefined();
    // UI should be at same level or above API
    expect(uiGroup!.y).toBeLessThanOrEqual(apiGroup!.y);
  });

  it('handles empty graph', async () => {
    const graph: GraphData = { nodes: [], edges: [], clusters: [] };
    const layout = await computeLayout(graph);
    expect(layout.nodes.size).toBe(0);
    expect(layout.groups.size).toBe(0);
  });

  it('completes within 2 seconds for small graph', async () => {
    const graph = makeGraph();
    const start = Date.now();
    await computeLayout(graph);
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(2000);
  });
});
