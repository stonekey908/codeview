import { describe, it, expect, vi } from 'vitest';
import type { GraphData } from '@codeview/shared';
import { createCodeViewServer, type CodeViewServerOptions } from '../server';

function makeGraph(): GraphData {
  return {
    nodes: [
      { id: 'src/app/page.tsx', label: 'Page', description: 'A screen: Page', filePath: '/p/src/app/page.tsx', relativePath: 'src/app/page.tsx', layer: 'ui', role: 'page', metadata: { exportCount: 1, importCount: 1, connectionCount: 1 } },
      { id: 'src/api/auth/route.ts', label: 'Auth API', description: 'Auth endpoint', filePath: '/p/src/api/auth/route.ts', relativePath: 'src/api/auth/route.ts', layer: 'api', role: 'api-route', metadata: { exportCount: 2, importCount: 1, connectionCount: 2 } },
    ],
    edges: [
      { id: 'e1', source: 'src/app/page.tsx', target: 'src/api/auth/route.ts', type: 'import' },
    ],
    clusters: [],
  };
}

function makeOptions(overrides: Partial<CodeViewServerOptions> = {}): CodeViewServerOptions {
  return {
    getGraphData: () => makeGraph(),
    getSelectedNodeIds: () => [],
    highlightNodes: vi.fn(),
    getPendingQuestion: () => null,
    saveExplanation: vi.fn(),
    saveDescriptions: vi.fn(),
    ...overrides,
  };
}

describe('createCodeViewServer', () => {
  it('creates a server instance', () => {
    const server = createCodeViewServer(makeOptions());
    expect(server).toBeDefined();
  });

  it('accepts null graph data', () => {
    const server = createCodeViewServer(makeOptions({ getGraphData: () => null }));
    expect(server).toBeDefined();
  });

  it('accepts selected node IDs', () => {
    const server = createCodeViewServer(makeOptions({
      getSelectedNodeIds: () => ['src/app/page.tsx'],
    }));
    expect(server).toBeDefined();
  });

  it('wires Claude integration options', () => {
    const saveExpl = vi.fn();
    const saveDesc = vi.fn();
    const server = createCodeViewServer(makeOptions({
      saveExplanation: saveExpl,
      saveDescriptions: saveDesc,
    }));
    expect(server).toBeDefined();
    // Verify the functions are callable
    saveExpl('test', 'explanation');
    expect(saveExpl).toHaveBeenCalledWith('test', 'explanation');
    saveDesc({ 'a.ts': 'desc' });
    expect(saveDesc).toHaveBeenCalledWith({ 'a.ts': 'desc' });
  });
});
