'use client';

import { create } from 'zustand';
import type { Node, Edge } from '@xyflow/react';
import type { GraphData, GraphNode, GraphCluster } from '@codeview/shared';

export type ViewMode = 'descriptive' | 'technical';

interface GraphState {
  // Data
  graphData: GraphData | null;
  rfNodes: Node[];
  rfEdges: Edge[];

  // UI state
  selectedNodeIds: Set<string>;
  hoveredNodeId: string | null;
  expandedClusterIds: Set<string>;
  focusedNodeId: string | null; // Focus mode: dim everything except this node's connections
  viewMode: ViewMode;
  theme: 'dark' | 'light';
  isLoading: boolean;
  loadingMessage: string;

  // Detail panel
  detailNodeId: string | null;
  detailNavStack: string[]; // navigation history for back button
  detailTab: 'overview' | 'connections' | 'code';

  // Claude integration
  claudeConnected: boolean;
  claudeExplanations: Record<string, string>; // componentId → explanation from Claude
  pendingExplanation: string | null; // componentId waiting for Claude response

  // Actions
  setGraphData: (data: GraphData) => void;
  setRfNodes: (nodes: Node[]) => void;
  setRfEdges: (edges: Edge[]) => void;
  selectNode: (nodeId: string) => void;
  toggleNodeSelection: (nodeId: string) => void;
  selectAllInCluster: (clusterId: string) => void;
  clearSelection: () => void;
  setHoveredNode: (nodeId: string | null) => void;
  toggleCluster: (clusterId: string) => void;
  expandAllClusters: () => void;
  collapseAllClusters: () => void;
  setFocusedNode: (nodeId: string | null) => void;
  setViewMode: (mode: ViewMode) => void;
  setTheme: (theme: 'dark' | 'light') => void;
  setLoading: (loading: boolean, message?: string) => void;

  // Detail panel actions
  openDetail: (nodeId: string) => void;
  navigateDetail: (nodeId: string) => void; // pushes to nav stack
  goBackDetail: () => void;
  closeDetail: () => void;
  setDetailTab: (tab: 'overview' | 'connections' | 'code') => void;

  // Claude actions
  setClaudeConnected: (connected: boolean) => void;
  setClaudeExplanation: (nodeId: string, explanation: string) => void;
  requestExplanation: (nodeId: string) => void;

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
  selectedNodeIds: new Set(),
  hoveredNodeId: null,
  expandedClusterIds: new Set(),
  focusedNodeId: null,
  viewMode: 'descriptive',
  theme: 'dark',
  isLoading: false,
  loadingMessage: '',
  detailNodeId: null,
  detailNavStack: [],
  detailTab: 'overview',
  claudeConnected: false,
  claudeExplanations: {},
  pendingExplanation: null,

  setGraphData: (data) => set({ graphData: data }),
  setRfNodes: (nodes) => set({ rfNodes: nodes }),
  setRfEdges: (edges) => set({ rfEdges: edges }),

  selectNode: (nodeId) =>
    set((state) => {
      if (state.selectedNodeIds.has(nodeId) && state.selectedNodeIds.size === 1) {
        return { selectedNodeIds: new Set(), detailNodeId: null, detailNavStack: [] };
      }
      return { selectedNodeIds: new Set([nodeId]), detailNodeId: nodeId, detailNavStack: [] };
    }),

  toggleNodeSelection: (nodeId) =>
    set((state) => {
      const next = new Set(state.selectedNodeIds);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return { selectedNodeIds: next, detailNodeId: nodeId };
    }),

  selectAllInCluster: (clusterId) =>
    set((state) => {
      const cluster = state.graphData?.clusters.find((c) => c.id === clusterId);
      if (!cluster) return state;
      const next = new Set(state.selectedNodeIds);
      for (const id of cluster.nodeIds) next.add(id);
      return { selectedNodeIds: next };
    }),

  clearSelection: () => set({ selectedNodeIds: new Set() }),
  setHoveredNode: (nodeId) => set({ hoveredNodeId: nodeId }),

  toggleCluster: (clusterId) =>
    set((state) => {
      const next = new Set(state.expandedClusterIds);
      if (next.has(clusterId)) next.delete(clusterId);
      else next.add(clusterId);
      return { expandedClusterIds: next };
    }),

  expandAllClusters: () =>
    set((state) => {
      const all = new Set(state.graphData?.clusters.map((c) => c.id) || []);
      return { expandedClusterIds: all };
    }),

  collapseAllClusters: () => set({ expandedClusterIds: new Set() }),

  setFocusedNode: (nodeId) => set({ focusedNodeId: nodeId }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setTheme: (theme) => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
    }
    set({ theme });
  },
  setLoading: (loading, message) =>
    set({ isLoading: loading, loadingMessage: message || '' }),

  // Detail panel
  openDetail: (nodeId) => set({ detailNodeId: nodeId, detailNavStack: [], detailTab: 'overview' }),

  navigateDetail: (nodeId) =>
    set((state) => ({
      detailNodeId: nodeId,
      detailNavStack: state.detailNodeId
        ? [...state.detailNavStack, state.detailNodeId]
        : state.detailNavStack,
    })),

  goBackDetail: () =>
    set((state) => {
      const stack = [...state.detailNavStack];
      const prev = stack.pop();
      return { detailNodeId: prev || null, detailNavStack: stack };
    }),

  closeDetail: () => set({ detailNodeId: null, detailNavStack: [], detailTab: 'overview' }),
  setDetailTab: (tab) => set({ detailTab: tab }),

  // Claude
  setClaudeConnected: (connected) => set({ claudeConnected: connected }),
  setClaudeExplanation: (nodeId, explanation) =>
    set((state) => ({
      claudeExplanations: { ...state.claudeExplanations, [nodeId]: explanation },
      pendingExplanation: state.pendingExplanation === nodeId ? null : state.pendingExplanation,
    })),
  requestExplanation: (nodeId) => set({ pendingExplanation: nodeId }),

  // Derived
  getNodeById: (id) => get().graphData?.nodes.find((n) => n.id === id),
  getClusterForNode: (nodeId) =>
    get().graphData?.clusters.find((c) => c.nodeIds.includes(nodeId)),

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
      .map((e) => {
        const node = graphData.nodes.find((n) => n.id === e.target);
        return node ? { node, type: e.type } : null;
      })
      .filter(Boolean) as { node: GraphNode; type: string }[];
  },

  getDependents: (nodeId) => {
    const { graphData } = get();
    if (!graphData) return [];
    return graphData.edges
      .filter((e) => e.target === nodeId)
      .map((e) => {
        const node = graphData.nodes.find((n) => n.id === e.source);
        return node ? { node, type: e.type } : null;
      })
      .filter(Boolean) as { node: GraphNode; type: string }[];
  },
}));
