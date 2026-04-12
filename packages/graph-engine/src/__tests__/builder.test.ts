import { describe, it, expect } from 'vitest';
import type { AnalysisResult } from '@codeview/shared';
import { buildGraph } from '../builder';

function makeAnalysis(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    rootDir: '/project',
    files: [],
    errors: [],
    ...overrides,
  };
}

describe('buildGraph', () => {
  it('creates nodes from files', () => {
    const analysis = makeAnalysis({
      files: [
        {
          filePath: '/project/src/app/page.tsx',
          relativePath: 'src/app/page.tsx',
          imports: [],
          exports: [{ name: 'default', isDefault: true, isTypeOnly: false }],
          framework: { role: 'page', confidence: 0.95, framework: 'nextjs' },
        },
      ],
    });

    const graph = buildGraph(analysis);
    expect(graph.nodes).toHaveLength(1);
    expect(graph.nodes[0].id).toBe('src/app/page.tsx');
    expect(graph.nodes[0].layer).toBe('ui');
    expect(graph.nodes[0].role).toBe('page');
  });

  it('generates human-readable labels', () => {
    const analysis = makeAnalysis({
      files: [
        {
          filePath: '/project/src/LoginPage.tsx',
          relativePath: 'src/LoginPage.tsx',
          imports: [],
          exports: [{ name: 'default', isDefault: true, isTypeOnly: false }],
          framework: null,
        },
      ],
    });

    const graph = buildGraph(analysis);
    expect(graph.nodes[0].label).toBe('Login Page');
  });

  it('creates edges from imports', () => {
    const analysis = makeAnalysis({
      files: [
        {
          filePath: '/project/src/app/page.tsx',
          relativePath: 'src/app/page.tsx',
          imports: [
            { source: '../utils/format', specifiers: ['formatDate'], isTypeOnly: false, isDynamic: false },
          ],
          exports: [{ name: 'default', isDefault: true, isTypeOnly: false }],
          framework: null,
        },
        {
          filePath: '/project/src/utils/format.ts',
          relativePath: 'src/utils/format.ts',
          imports: [],
          exports: [{ name: 'formatDate', isDefault: false, isTypeOnly: false }],
          framework: null,
        },
      ],
    });

    const graph = buildGraph(analysis);
    expect(graph.edges).toHaveLength(1);
    expect(graph.edges[0].source).toBe('src/app/page.tsx');
    expect(graph.edges[0].target).toBe('src/utils/format.ts');
  });

  it('skips external package imports', () => {
    const analysis = makeAnalysis({
      files: [
        {
          filePath: '/project/src/app.ts',
          relativePath: 'src/app.ts',
          imports: [
            { source: 'react', specifiers: ['useState'], isTypeOnly: false, isDynamic: false },
            { source: 'next/router', specifiers: ['useRouter'], isTypeOnly: false, isDynamic: false },
          ],
          exports: [],
          framework: null,
        },
      ],
    });

    const graph = buildGraph(analysis);
    expect(graph.edges).toHaveLength(0);
  });

  it('creates clusters by layer', () => {
    const analysis = makeAnalysis({
      files: [
        {
          filePath: '/project/src/app/page.tsx',
          relativePath: 'src/app/page.tsx',
          imports: [],
          exports: [{ name: 'default', isDefault: true, isTypeOnly: false }],
          framework: { role: 'page', confidence: 0.95, framework: 'nextjs' },
        },
        {
          filePath: '/project/src/app/layout.tsx',
          relativePath: 'src/app/layout.tsx',
          imports: [],
          exports: [{ name: 'default', isDefault: true, isTypeOnly: false }],
          framework: { role: 'layout', confidence: 0.95, framework: 'nextjs' },
        },
        {
          filePath: '/project/src/utils/format.ts',
          relativePath: 'src/utils/format.ts',
          imports: [],
          exports: [{ name: 'formatDate', isDefault: false, isTypeOnly: false }],
          framework: { role: 'utility', confidence: 0.6, framework: 'unknown' },
        },
      ],
    });

    const graph = buildGraph(analysis);
    expect(graph.clusters.length).toBeGreaterThanOrEqual(2);

    const uiCluster = graph.clusters.find((c) => c.layer === 'ui');
    expect(uiCluster).toBeDefined();
    expect(uiCluster!.nodeIds).toHaveLength(2);
    expect(uiCluster!.label).toBe('UI Components');

    const utilCluster = graph.clusters.find((c) => c.layer === 'utils');
    expect(utilCluster).toBeDefined();
    expect(utilCluster!.nodeIds).toHaveLength(1);
  });

  it('updates connection counts on nodes', () => {
    const analysis = makeAnalysis({
      files: [
        {
          filePath: '/project/src/app/page.tsx',
          relativePath: 'src/app/page.tsx',
          imports: [
            { source: '../utils/format', specifiers: ['formatDate'], isTypeOnly: false, isDynamic: false },
          ],
          exports: [{ name: 'default', isDefault: true, isTypeOnly: false }],
          framework: null,
        },
        {
          filePath: '/project/src/utils/format.ts',
          relativePath: 'src/utils/format.ts',
          imports: [],
          exports: [{ name: 'formatDate', isDefault: false, isTypeOnly: false }],
          framework: null,
        },
      ],
    });

    const graph = buildGraph(analysis);
    const pageNode = graph.nodes.find((n) => n.id === 'src/app/page.tsx');
    const utilNode = graph.nodes.find((n) => n.id === 'src/utils/format.ts');
    expect(pageNode!.metadata.connectionCount).toBe(1);
    expect(utilNode!.metadata.connectionCount).toBe(1);
  });

  it('handles @/ alias paths', () => {
    const analysis = makeAnalysis({
      files: [
        {
          filePath: '/project/src/app/page.tsx',
          relativePath: 'src/app/page.tsx',
          imports: [
            { source: '@/utils/format', specifiers: ['formatDate'], isTypeOnly: false, isDynamic: false },
          ],
          exports: [],
          framework: null,
        },
        {
          filePath: '/project/src/utils/format.ts',
          relativePath: 'src/utils/format.ts',
          imports: [],
          exports: [{ name: 'formatDate', isDefault: false, isTypeOnly: false }],
          framework: null,
        },
      ],
    });

    const graph = buildGraph(analysis);
    expect(graph.edges).toHaveLength(1);
    expect(graph.edges[0].target).toBe('src/utils/format.ts');
  });
});
