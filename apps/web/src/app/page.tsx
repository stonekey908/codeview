'use client';

import { useEffect, useRef } from 'react';
import { Toolbar } from '@/components/toolbar/Toolbar';
import { LeftPanel } from '@/components/left/LeftPanel';
import { GraphCanvas } from '@/components/graph/GraphCanvas';
import { DetailPanel } from '@/components/detail/DetailPanel';
import { SearchPalette } from '@/components/search/SearchPalette';
import { KeyboardShortcuts } from '@/components/keyboard/KeyboardShortcuts';
import { OverviewPanel } from '@/components/overview/OverviewPanel';
import { useGraphStore } from '@/store/graph-store';
import { buildGraph, computeLayout } from '@codeview/graph-engine';
import type { LayoutResult } from '@codeview/graph-engine';
import type { GraphData } from '@codeview/shared';
import { buildRfNodes } from '@/lib/build-rf-nodes';

const DEMO_FILES = [
  { filePath: '/demo/src/app/page.tsx', relativePath: 'src/app/page.tsx', imports: [{ source: '@/api/auth', specifiers: ['authApi'], isTypeOnly: false, isDynamic: false }], exports: [{ name: 'default', isDefault: true, isTypeOnly: false }], framework: { role: 'page', confidence: 0.95, framework: 'nextjs' } },
  { filePath: '/demo/src/app/layout.tsx', relativePath: 'src/app/layout.tsx', imports: [], exports: [{ name: 'default', isDefault: true, isTypeOnly: false }], framework: { role: 'layout', confidence: 0.95, framework: 'nextjs' } },
  { filePath: '/demo/src/api/auth/route.ts', relativePath: 'src/api/auth/route.ts', imports: [], exports: [{ name: 'POST', isDefault: false, isTypeOnly: false }], framework: { role: 'api-route', confidence: 0.95, framework: 'nextjs' } },
  { filePath: '/demo/src/utils/jwt.ts', relativePath: 'src/utils/jwt.ts', imports: [], exports: [{ name: 'signToken', isDefault: false, isTypeOnly: false }], framework: { role: 'utility', confidence: 0.6, framework: 'unknown' } },
];

export default function Home() {
  const { setGraphData, setRfNodes, setRfEdges, setLoading, theme, setTheme, graphData, detailMode, middleView, detailWidth, leftWidth, leftTab, detailNodeId, isLoading } = useGraphStore();
  const layoutRef = useRef<LayoutResult | null>(null);

  // Restore theme from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('codeview-theme') as 'dark' | 'light' | null;
      if (saved) { setTheme(saved); document.documentElement.classList.toggle('dark', saved === 'dark'); }
    } catch {}
  }, [setTheme]);

  useEffect(() => {
    async function init() {
      setLoading(true, 'Loading architecture...');
      let graph: GraphData;
      try {
        const res = await fetch('/api/analysis');
        if (res.ok) {
          const data = await res.json();
          graph = data.graph || buildGraph({ rootDir: '/demo', files: DEMO_FILES, errors: [] });
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

  useEffect(() => {
    if (!graphData || !layoutRef.current) return;
    const { nodes, edges } = buildRfNodes(graphData, layoutRef.current, theme);
    setRfNodes(nodes);
    setRfEdges(edges);
  }, [theme, graphData, setRfNodes, setRfEdges]);

  // Layout
  const showOverview = leftTab === 'overview';
  const isSlideOut = detailMode === 'slide-out';
  const isExpanded = detailMode === 'expanded';
  const hasDetail = !!detailNodeId;

  // Graph shows for: Architecture tab always, OR any tab when slide-out mode
  const showGraph = leftTab === 'architecture' || (isSlideOut && hasDetail);
  const showSlideOut = isSlideOut && hasDetail;
  // Full-width detail for Features/Categories when expanded
  const showFullDetail = !showOverview && !showGraph && isExpanded && hasDetail;
  // Empty state when no component selected in Features/Categories
  const showEmpty = !showOverview && !showGraph && !showFullDetail && !hasDetail;

  let gridCols = `${leftWidth}px 1fr`;
  if (showSlideOut) gridCols = `${leftWidth}px 1fr ${detailWidth}px`;

  return (
    <div className="h-screen flex flex-col">
      <Toolbar />
      <div className="flex-1 overflow-hidden" style={{ display: 'grid', gridTemplateColumns: gridCols }}>
        <LeftPanel />
        {showOverview && <OverviewPanel />}
        {showGraph && <GraphCanvas />}
        {showSlideOut && <DetailPanel />}
        {showFullDetail && <DetailPanel fullWidth />}
        {showEmpty && (
          <div className="h-full flex items-center justify-center bg-background">
            <div className="text-center">
              <div className="text-3xl mb-3 opacity-30">←</div>
              <p className="text-sm text-muted-foreground">Select a component from the left panel</p>
            </div>
          </div>
        )}
      </div>
      <SearchPalette />
      <KeyboardShortcuts />
    </div>
  );
}
