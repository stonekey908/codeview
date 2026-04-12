'use client';

import { useEffect } from 'react';
import { Toolbar } from '@/components/toolbar/Toolbar';
import { ArchitectureCanvas } from '@/components/canvas/ArchitectureCanvas';
import { PromptPanel } from '@/components/prompt/PromptPanel';
import { DetailSidebar } from '@/components/sidebar/DetailSidebar';
import { SearchPalette } from '@/components/search/SearchPalette';
import { Onboarding } from '@/components/onboarding/Onboarding';
import { KeyboardShortcuts } from '@/components/keyboard/KeyboardShortcuts';
import { useGraphStore } from '@/store/graph-store';
import { buildGraph } from '@codeview/graph-engine';
import { computeLayout, NODE_WIDTH, NODE_HEIGHT } from '@codeview/graph-engine';
import type { AnalysisResult, ArchitecturalLayer } from '@codeview/shared';
import type { Node, Edge } from '@xyflow/react';
import { LAYER_COLORS } from '@/components/canvas/layer-colors';

// Demo data — will be replaced with real analysis from CLI
const DEMO_ANALYSIS: AnalysisResult = {
  rootDir: '/demo',
  files: [
    { filePath: '/demo/src/app/page.tsx', relativePath: 'src/app/page.tsx', imports: [{ source: '@/api/auth', specifiers: ['authApi'], isTypeOnly: false, isDynamic: false }], exports: [{ name: 'default', isDefault: true, isTypeOnly: false }], framework: { role: 'page', confidence: 0.95, framework: 'nextjs' } },
    { filePath: '/demo/src/app/layout.tsx', relativePath: 'src/app/layout.tsx', imports: [], exports: [{ name: 'default', isDefault: true, isTypeOnly: false }], framework: { role: 'layout', confidence: 0.95, framework: 'nextjs' } },
    { filePath: '/demo/src/app/dashboard/page.tsx', relativePath: 'src/app/dashboard/page.tsx', imports: [{ source: '@/api/users', specifiers: ['usersApi'], isTypeOnly: false, isDynamic: false }, { source: '@/utils/format', specifiers: ['formatDate'], isTypeOnly: false, isDynamic: false }], exports: [{ name: 'default', isDefault: true, isTypeOnly: false }], framework: { role: 'page', confidence: 0.95, framework: 'nextjs' } },
    { filePath: '/demo/src/app/settings/page.tsx', relativePath: 'src/app/settings/page.tsx', imports: [{ source: '@/api/users', specifiers: ['usersApi'], isTypeOnly: false, isDynamic: false }], exports: [{ name: 'default', isDefault: true, isTypeOnly: false }], framework: { role: 'page', confidence: 0.95, framework: 'nextjs' } },
    { filePath: '/demo/src/api/auth/route.ts', relativePath: 'src/api/auth/route.ts', imports: [{ source: '@/utils/jwt', specifiers: ['signToken'], isTypeOnly: false, isDynamic: false }, { source: '@/db/user', specifiers: ['findUser'], isTypeOnly: false, isDynamic: false }], exports: [{ name: 'POST', isDefault: false, isTypeOnly: false }, { name: 'GET', isDefault: false, isTypeOnly: false }], framework: { role: 'api-route', confidence: 0.95, framework: 'nextjs' } },
    { filePath: '/demo/src/api/users/route.ts', relativePath: 'src/api/users/route.ts', imports: [{ source: '@/db/user', specifiers: ['getUsers'], isTypeOnly: false, isDynamic: false }], exports: [{ name: 'GET', isDefault: false, isTypeOnly: false }], framework: { role: 'api-route', confidence: 0.95, framework: 'nextjs' } },
    { filePath: '/demo/src/api/billing/route.ts', relativePath: 'src/api/billing/route.ts', imports: [{ source: '@/services/stripe', specifiers: ['stripe'], isTypeOnly: false, isDynamic: false }], exports: [{ name: 'POST', isDefault: false, isTypeOnly: false }], framework: { role: 'api-route', confidence: 0.95, framework: 'nextjs' } },
    { filePath: '/demo/src/db/user.ts', relativePath: 'src/db/user.ts', imports: [], exports: [{ name: 'findUser', isDefault: false, isTypeOnly: false }, { name: 'getUsers', isDefault: false, isTypeOnly: false }], framework: { role: 'model', confidence: 0.5, framework: 'unknown' } },
    { filePath: '/demo/src/db/session.ts', relativePath: 'src/db/session.ts', imports: [], exports: [{ name: 'createSession', isDefault: false, isTypeOnly: false }], framework: { role: 'model', confidence: 0.5, framework: 'unknown' } },
    { filePath: '/demo/src/utils/format.ts', relativePath: 'src/utils/format.ts', imports: [], exports: [{ name: 'formatDate', isDefault: false, isTypeOnly: false }, { name: 'formatCurrency', isDefault: false, isTypeOnly: false }], framework: { role: 'utility', confidence: 0.6, framework: 'unknown' } },
    { filePath: '/demo/src/utils/jwt.ts', relativePath: 'src/utils/jwt.ts', imports: [], exports: [{ name: 'signToken', isDefault: false, isTypeOnly: false }, { name: 'verifyToken', isDefault: false, isTypeOnly: false }], framework: { role: 'utility', confidence: 0.6, framework: 'unknown' } },
    { filePath: '/demo/src/services/stripe.ts', relativePath: 'src/services/stripe.ts', imports: [], exports: [{ name: 'stripe', isDefault: false, isTypeOnly: false }], framework: { role: 'service', confidence: 0.7, framework: 'unknown' } },
    { filePath: '/demo/src/services/sendgrid.ts', relativePath: 'src/services/sendgrid.ts', imports: [], exports: [{ name: 'sendEmail', isDefault: false, isTypeOnly: false }], framework: { role: 'service', confidence: 0.7, framework: 'unknown' } },
  ],
  errors: [],
};

export default function Home() {
  const { setGraphData, setRfNodes, setRfEdges, setLoading } = useGraphStore();

  useEffect(() => {
    async function init() {
      setLoading(true, 'Building architecture graph...');

      // Build graph from analysis
      const graph = buildGraph(DEMO_ANALYSIS);
      setGraphData(graph);

      // Compute layout
      const layout = await computeLayout(graph);

      // Convert to React Flow nodes
      const rfNodes: Node[] = [];

      // Add cluster (group) nodes
      for (const cluster of graph.clusters) {
        const pos = layout.groups.get(cluster.id);
        if (!pos) continue;
        rfNodes.push({
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

      // Add component nodes
      for (const node of graph.nodes) {
        const pos = layout.nodes.get(node.id);
        if (!pos) continue;
        const cluster = graph.clusters.find((c) => c.nodeIds.includes(node.id));
        rfNodes.push({
          id: node.id,
          type: 'component',
          position: { x: pos.x, y: pos.y },
          parentId: cluster?.id,
          extent: cluster ? 'parent' as const : undefined,
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

      // Convert to React Flow edges
      const rfEdges: Edge[] = graph.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: 'smoothstep',
        animated: false,
        style: {
          stroke: '#27272a',
          strokeWidth: 1,
        },
        markerEnd: { type: 'arrowclosed' as any, width: 10, height: 10, color: '#3f3f46' },
      }));

      setRfNodes(rfNodes);
      setRfEdges(rfEdges);
      setLoading(false);
    }

    init();
  }, [setGraphData, setRfNodes, setRfEdges, setLoading]);

  return (
    <div className="flex flex-col h-screen">
      <Toolbar />
      <main className="flex-1 relative">
        <ArchitectureCanvas />
      </main>
      <PromptPanel />
      <DetailSidebar />
      <SearchPalette />
      <Onboarding />
      <KeyboardShortcuts />
    </div>
  );
}
