'use client';

import { useEffect, useRef, useState } from 'react';

import { Toolbar } from '@/components/toolbar/Toolbar';
import { LeftPanel } from '@/components/left/LeftPanel';
import { GraphCanvas } from '@/components/graph/GraphCanvas';
import { DetailPanel } from '@/components/detail/DetailPanel';
import { SearchPalette } from '@/components/search/SearchPalette';
import { KeyboardShortcuts } from '@/components/keyboard/KeyboardShortcuts';
import { OverviewPanel } from '@/components/overview/OverviewPanel';
import { ProjectPicker } from '@/components/project/ProjectPicker';
import { ChatWidget } from '@/components/chat/ChatWidget';
import { useGraphStore } from '@/store/graph-store';
import { computeLayout } from '@codeview/graph-engine';
import type { LayoutResult } from '@codeview/graph-engine';
import type { ArchitecturalLayer } from '@codeview/shared';
import { buildRfNodes } from '@/lib/build-rf-nodes';

export default function Home() {
  const { setGraphData, setRfNodes, setRfEdges, setLoading, theme, setTheme, graphData, detailMode, middleView, detailWidth, leftWidth, leftTab, detailNodeId, isLoading, capabilityLensOn, capabilities, activeCapabilityIndex } = useGraphStore();
  const layoutRef = useRef<LayoutResult | null>(null);
  const originalGraphRef = useRef<import('@codeview/shared').GraphData | null>(null);
  const [hasProject, setHasProject] = useState(true);

  // Restore theme from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('codeview-theme') as 'dark' | 'light' | null;
      if (saved) { setTheme(saved); document.documentElement.classList.toggle('dark', saved === 'dark'); }
    } catch {}
  }, [setTheme]);

  const loadAnalysis = async () => {
    setLoading(true, 'Loading architecture...');
    try {
      const res = await fetch('/api/analysis');
      const data = await res.json();
      if (!data.graph) {
        setHasProject(false);
        setLoading(false);
        return;
      }
      setHasProject(true);
      originalGraphRef.current = data.graph;
      setGraphData(data.graph);
      const layout = await computeLayout(data.graph);
      layoutRef.current = layout;
      const { nodes, edges } = buildRfNodes(data.graph, layout, theme);
      setRfNodes(nodes);
      setRfEdges(edges);
    } catch {
      setHasProject(false);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAnalysis();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!graphData || !layoutRef.current) return;
    const { nodes, edges } = buildRfNodes(graphData, layoutRef.current, theme);
    setRfNodes(nodes);
    setRfEdges(edges);
  }, [theme, graphData, setRfNodes, setRfEdges]);

  // Rebuild graph clusters when capability lens toggles
  useEffect(() => {
    const original = originalGraphRef.current;
    if (!original) return;

    if (capabilityLensOn && capabilities.length > 0) {
      // Build capability-based clusters
      const capClusters = capabilities.map((cap, i) => {
        const nodeIds = original.nodes
          .filter(n => cap.componentPaths.includes(n.relativePath))
          .map(n => n.id);
        return {
          id: `cap-${i}`,
          label: `${cap.icon} ${cap.title}`,
          description: cap.description,
          layer: 'ui' as ArchitecturalLayer, // color overridden in ClusterNode for cap clusters
          nodeIds,
          metadata: {
            componentCount: nodeIds.length,
            connectionCount: original.edges.filter(e => nodeIds.includes(e.source) || nodeIds.includes(e.target)).length,
          },
        };
      });
      // Safety net: add uncategorised components if AI missed any
      const allCapNodeIds = new Set(capClusters.flatMap(c => c.nodeIds));
      const otherIds = original.nodes.filter(n => !allCapNodeIds.has(n.id)).map(n => n.id);
      if (otherIds.length > 0) {
        capClusters.push({
          id: 'cap-other',
          label: '📦 Uncategorised',
          description: 'Components not yet assigned to a capability',
          layer: 'utils' as ArchitecturalLayer,
          nodeIds: otherIds,
          metadata: {
            componentCount: otherIds.length,
            connectionCount: original.edges.filter(e => otherIds.includes(e.source) || otherIds.includes(e.target)).length,
          },
        });
      }
      const capGraph = { ...original, clusters: capClusters };
      computeLayout(capGraph).then(layout => {
        layoutRef.current = layout;
        const { nodes, edges } = buildRfNodes(capGraph, layout, theme);
        setGraphData(capGraph);
        setRfNodes(nodes);
        setRfEdges(edges);
      });
    } else {
      // Restore original layer-based clusters
      computeLayout(original).then(layout => {
        layoutRef.current = layout;
        const { nodes, edges } = buildRfNodes(original, layout, theme);
        setGraphData(original);
        setRfNodes(nodes);
        setRfEdges(edges);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capabilityLensOn, capabilities]);

  // Layout
  const showOverview = leftTab === 'overview';
  const isSlideOut = detailMode === 'slide-out';
  const isExpanded = detailMode === 'expanded';
  const hasDetail = !!detailNodeId;

  // Graph shows for: Architecture tab (unless expanded detail overrides), OR any tab when slide-out mode
  const showGraph = (leftTab === 'architecture' && !(isExpanded && hasDetail)) || (isSlideOut && hasDetail);
  const showSlideOut = isSlideOut && hasDetail;
  // Full-width detail when expanded (any tab except overview)
  const showFullDetail = !showOverview && !showGraph && isExpanded && hasDetail;
  // Empty state when no component selected in Features/Categories
  const showEmpty = !showOverview && !showGraph && !showFullDetail && !hasDetail;

  let gridCols = `${leftWidth}px 1fr`;
  if (showSlideOut) gridCols = `${leftWidth}px 1fr ${detailWidth}px`;

  return (
    <div className="h-screen flex flex-col">
      <Toolbar />
      {!hasProject ? (
        <ProjectPicker onLoaded={loadAnalysis} />
      ) : (
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
      )}
      <SearchPalette />
      <KeyboardShortcuts />
      {hasProject && <ChatWidget />}
    </div>
  );
}
