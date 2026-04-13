'use client';

import { create } from 'zustand';
import type { Node, Edge } from '@xyflow/react';
import type { GraphData, GraphNode, GraphCluster } from '@codeview/shared';

export type ViewMode = 'descriptive' | 'technical';
export type LeftTab = 'categories' | 'architecture';
export type MiddleView = 'graph' | 'full-detail';
export type DetailMode = 'hidden' | 'slide-out' | 'expanded';

interface GraphState {
  // Data
  graphData: GraphData | null;
  rfNodes: Node[];
  rfEdges: Edge[];

  // Left panel
  leftTab: LeftTab;
  setLeftTab: (tab: LeftTab) => void;

  // Middle view
  middleView: MiddleView;
  setMiddleView: (view: MiddleView) => void;

  // Detail panel
  detailNodeId: string | null;
  detailNavStack: string[];
  detailMode: DetailMode;
  openDetail: (nodeId: string) => void;
  navigateDetail: (nodeId: string) => void;
  goBackDetail: () => void;
  closeDetail: () => void;
  expandDetail: () => void;
  shrinkDetail: () => void;

  // Selection
  selectedNodeIds: Set<string>;
  hoveredNodeId: string | null;
  focusedNodeId: string | null;
  selectNode: (nodeId: string) => void;
  toggleNodeSelection: (nodeId: string) => void;
  clearSelection: () => void;
  setHoveredNode: (nodeId: string | null) => void;
  setFocusedNode: (nodeId: string | null) => void;

  // Panel width
  detailWidth: number;
  setDetailWidth: (width: number) => void;

  // Display
  viewMode: ViewMode;
  theme: 'dark' | 'light';
  isLoading: boolean;
  loadingMessage: string;
  expandedClusterIds: Set<string>;
  setViewMode: (mode: ViewMode) => void;
  setTheme: (theme: 'dark' | 'light') => void;
  setLoading: (loading: boolean, message?: string) => void;
  toggleCluster: (clusterId: string) => void;
  expandAllClusters: () => void;
  collapseAllClusters: () => void;

  // Data actions
  setGraphData: (data: GraphData) => void;
  setRfNodes: (nodes: Node[]) => void;
  setRfEdges: (edges: Edge[]) => void;

  // Claude
  claudeExplanations: Record<string, string>;
  setClaudeExplanation: (nodeId: string, explanation: string) => void;

  // Derived
  getNodeById: (id: string) => GraphNode | undefined;
  getClusterForNode: (nodeId: string) => GraphCluster | undefined;
  getConnectedNodeIds: (nodeId: string) => Set<string>;
  getDependencies: (nodeId: string) => { node: GraphNode; type: string }[];
  getDependents: (nodeId: string) => { node: GraphNode; type: string }[];
}

export const useGraphStore = create<GraphState>((set, get) => ({
  graphData: null,
  rfNodes: [],
  rfEdges: [],

  leftTab: 'categories',
  setLeftTab: (tab) => set({ leftTab: tab }),

  middleView: 'graph',
  setMiddleView: (view) => {
    if (view === 'full-detail') {
      set({ middleView: view, detailMode: 'expanded' });
    } else {
      const { detailNodeId } = get();
      set({ middleView: view, detailMode: detailNodeId ? 'slide-out' : 'hidden' });
    }
  },

  detailNodeId: null,
  detailNavStack: [],
  detailMode: 'hidden',

  openDetail: (nodeId) => set((s) => ({
    detailNodeId: nodeId,
    detailNavStack: [],
    // Preserve expanded mode if already in it
    detailMode: s.detailMode === 'expanded' ? 'expanded' : 'slide-out',
    middleView: s.middleView === 'full-detail' ? 'full-detail' : 'graph',
    selectedNodeIds: new Set([nodeId]),
  })),

  navigateDetail: (nodeId) => set((s) => ({
    detailNodeId: nodeId,
    detailNavStack: s.detailNodeId ? [...s.detailNavStack, s.detailNodeId] : s.detailNavStack,
  })),

  goBackDetail: () => set((s) => {
    const stack = [...s.detailNavStack];
    const prev = stack.pop();
    return prev ? { detailNodeId: prev, detailNavStack: stack } : { detailNodeId: null, detailNavStack: [], detailMode: 'hidden' };
  }),

  closeDetail: () => set({ detailNodeId: null, detailNavStack: [], detailMode: 'hidden', middleView: 'graph' }),

  expandDetail: () => set({ detailMode: 'expanded', middleView: 'full-detail' }),

  shrinkDetail: () => set({ detailMode: 'slide-out', middleView: 'graph' }),

  selectedNodeIds: new Set(),
  hoveredNodeId: null,
  focusedNodeId: null,

  selectNode: (nodeId) => set((s) => {
    if (s.selectedNodeIds.has(nodeId) && s.selectedNodeIds.size === 1) {
      return { selectedNodeIds: new Set() };
    }
    return { selectedNodeIds: new Set([nodeId]) };
  }),

  toggleNodeSelection: (nodeId) => set((s) => {
    const next = new Set(s.selectedNodeIds);
    if (next.has(nodeId)) next.delete(nodeId); else next.add(nodeId);
    return { selectedNodeIds: next };
  }),

  clearSelection: () => set({ selectedNodeIds: new Set() }),
  setHoveredNode: (nodeId) => set({ hoveredNodeId: nodeId }),
  setFocusedNode: (nodeId) => set({ focusedNodeId: nodeId }),

  detailWidth: 480,
  setDetailWidth: (width) => set({ detailWidth: Math.max(360, Math.min(800, width)) }),

  viewMode: 'descriptive',
  theme: 'light',
  isLoading: false,
  loadingMessage: '',
  expandedClusterIds: new Set(),

  setViewMode: (mode) => set({ viewMode: mode }),
  setTheme: (theme) => {
    if (typeof document !== 'undefined') document.documentElement.setAttribute('data-theme', theme);
    set({ theme });
  },
  setLoading: (loading, message) => set({ isLoading: loading, loadingMessage: message || '' }),
  toggleCluster: (clusterId) => set((s) => {
    const next = new Set(s.expandedClusterIds);
    if (next.has(clusterId)) next.delete(clusterId); else next.add(clusterId);
    return { expandedClusterIds: next };
  }),
  expandAllClusters: () => set((s) => ({ expandedClusterIds: new Set(s.graphData?.clusters.map(c => c.id) || []) })),
  collapseAllClusters: () => set({ expandedClusterIds: new Set() }),

  setGraphData: (data) => set({ graphData: data }),
  setRfNodes: (nodes) => set({ rfNodes: nodes }),
  setRfEdges: (edges) => set({ rfEdges: edges }),

  claudeExplanations: {},
  setClaudeExplanation: (nodeId, explanation) => set((s) => ({
    claudeExplanations: { ...s.claudeExplanations, [nodeId]: explanation },
  })),

  getNodeById: (id) => get().graphData?.nodes.find((n) => n.id === id),
  getClusterForNode: (nodeId) => get().graphData?.clusters.find((c) => c.nodeIds.includes(nodeId)),

  getConnectedNodeIds: (nodeId) => {
    const edges = get().graphData?.edges || [];
    const connected = new Set<string>();
    for (const edge of edges) {
      if (edge.source === nodeId) connected.add(edge.target);
      if (edge.target === nodeId) connected.add(edge.source);
    }
    return connected;
  },

  getDependencies: (nodeId) => {
    const { graphData } = get();
    if (!graphData) return [];
    return graphData.edges
      .filter((e) => e.source === nodeId)
      .map((e) => { const n = graphData.nodes.find((n) => n.id === e.target); return n ? { node: n, type: e.type } : null; })
      .filter(Boolean) as { node: GraphNode; type: string }[];
  },

  getDependents: (nodeId) => {
    const { graphData } = get();
    if (!graphData) return [];
    return graphData.edges
      .filter((e) => e.target === nodeId)
      .map((e) => { const n = graphData.nodes.find((n) => n.id === e.source); return n ? { node: n, type: e.type } : null; })
      .filter(Boolean) as { node: GraphNode; type: string }[];
  },
}));
