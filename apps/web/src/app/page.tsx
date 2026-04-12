'use client';

import { useEffect, useRef } from 'react';
import { Toolbar } from '@/components/toolbar/Toolbar';
import { ArchitectureCanvas } from '@/components/canvas/ArchitectureCanvas';
import { PromptPanel } from '@/components/prompt/PromptPanel';
import { DetailSidebar } from '@/components/sidebar/DetailSidebar';
import { SearchPalette } from '@/components/search/SearchPalette';
import { Onboarding } from '@/components/onboarding/Onboarding';
import { KeyboardShortcuts } from '@/components/keyboard/KeyboardShortcuts';
import { useGraphStore } from '@/store/graph-store';
import { buildGraph, computeLayout } from '@codeview/graph-engine';
import type { LayoutResult } from '@codeview/graph-engine';
import type { GraphData } from '@codeview/shared';
import { buildRfNodes } from '@/lib/build-rf-nodes';

// Demo data for when no real analysis is available
const DEMO_FILES = [
  { filePath: '/demo/src/app/page.tsx', relativePath: 'src/app/page.tsx', imports: [{ source: '@/api/auth', specifiers: ['authApi'], isTypeOnly: false, isDynamic: false }], exports: [{ name: 'default', isDefault: true, isTypeOnly: false }], framework: { role: 'page', confidence: 0.95, framework: 'nextjs' } },
  { filePath: '/demo/src/app/layout.tsx', relativePath: 'src/app/layout.tsx', imports: [], exports: [{ name: 'default', isDefault: true, isTypeOnly: false }], framework: { role: 'layout', confidence: 0.95, framework: 'nextjs' } },
  { filePath: '/demo/src/api/auth/route.ts', relativePath: 'src/api/auth/route.ts', imports: [{ source: '@/utils/jwt', specifiers: ['signToken'], isTypeOnly: false, isDynamic: false }], exports: [{ name: 'POST', isDefault: false, isTypeOnly: false }], framework: { role: 'api-route', confidence: 0.95, framework: 'nextjs' } },
  { filePath: '/demo/src/utils/jwt.ts', relativePath: 'src/utils/jwt.ts', imports: [], exports: [{ name: 'signToken', isDefault: false, isTypeOnly: false }], framework: { role: 'utility', confidence: 0.6, framework: 'unknown' } },
];

export default function Home() {
  const { setGraphData, setRfNodes, setRfEdges, setLoading, theme, graphData } = useGraphStore();
  const layoutRef = useRef<LayoutResult | null>(null);

  // Initial load
  useEffect(() => {
    async function init() {
      setLoading(true, 'Loading architecture...');

      let graph: GraphData;
      try {
        const res = await fetch('/api/analysis');
        if (res.ok) {
          const data = await res.json();
          if (data.graph) {
            graph = data.graph;
          } else {
            graph = buildGraph({ rootDir: '/demo', files: DEMO_FILES, errors: [] });
          }
        } else {
          graph = buildGraph({ rootDir: '/demo', files: DEMO_FILES, errors: [] });
        }
      } catch {
        graph = buildGraph({ rootDir: '/demo', files: DEMO_FILES, errors: [] });
      }

      setGraphData(graph);
      const layout = await computeLayout(graph);
      layoutRef.current = layout;

      const { nodes, edges } = buildRfNodes(graph, layout, theme);
      setRfNodes(nodes);
      setRfEdges(edges);
      setLoading(false);
    }
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Rebuild when theme changes
  useEffect(() => {
    if (!graphData || !layoutRef.current) return;
    const { nodes, edges } = buildRfNodes(graphData, layoutRef.current, theme);
    setRfNodes(nodes);
    setRfEdges(edges);
  }, [theme, graphData, setRfNodes, setRfEdges]);

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
