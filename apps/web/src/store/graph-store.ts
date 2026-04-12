'use client';

import { create } from 'zustand';
import type { Node, Edge } from '@xyflow/react';
import type { GraphData, GraphNode, GraphCluster } from '@codeview/shared';

export type ViewMode = 'descriptive' | 'technical';
export type ZoomLevel = 'architecture' | 'modules' | 'components';

interface GraphState {
  // Data
  graphData: GraphData | null;
  rfNodes: Node[];
  rfEdges: Edge[];

  // UI state
  selectedNodeIds: Set<string>;
  hoveredNodeId: string | null;
  sidebarNodeId: string | null;
  viewMode: ViewMode;
  zoomLevel: ZoomLevel;
  theme: 'dark' | 'light';
  isLoading: boolean;
  loadingMessage: string;

  // Actions
  setGraphData: (data: GraphData) => void;
  setRfNodes: (nodes: Node[]) => void;
  setRfEdges: (edges: Edge[]) => void;
  toggleNodeSelection: (nodeId: string) => void;
  selectAllInCluster: (clusterId: string) => void;
  clearSelection: () => void;
  setHoveredNode: (nodeId: string | null) => void;
  setSidebarNode: (nodeId: string | null) => void;
  setViewMode: (mode: ViewMode) => void;
  setZoomLevel: (level: ZoomLevel) => void;
  setTheme: (theme: 'dark' | 'light') => void;
  setLoading: (loading: boolean, message?: string) => void;

  // Derived
  getNodeById: (id: string) => GraphNode | undefined;
  getClusterForNode: (nodeId: string) => GraphCluster | undefined;
  getConnectedNodeIds: (nodeId: string) => Set<string>;
}

export const useGraphStore = create<GraphState>((set, get) => ({
  graphData: null,
  rfNodes: [],
  rfEdges: [],
  selectedNodeIds: new Set(),
  hoveredNodeId: null,
  sidebarNodeId: null,
  viewMode: 'descriptive',
  zoomLevel: 'architecture',
  theme: 'dark',
  isLoading: false,
  loadingMessage: '',

  setGraphData: (data) => set({ graphData: data }),
  setRfNodes: (nodes) => set({ rfNodes: nodes }),
  setRfEdges: (edges) => set({ rfEdges: edges }),

  toggleNodeSelection: (nodeId) =>
    set((state) => {
      const next = new Set(state.selectedNodeIds);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return { selectedNodeIds: next, sidebarNodeId: nodeId };
    }),

  selectAllInCluster: (clusterId) =>
    set((state) => {
      const cluster = state.graphData?.clusters.find((c) => c.id === clusterId);
      if (!cluster) return state;
      const next = new Set(state.selectedNodeIds);
      for (const id of cluster.nodeIds) {
        next.add(id);
      }
      return { selectedNodeIds: next };
    }),

  clearSelection: () => set({ selectedNodeIds: new Set() }),

  setHoveredNode: (nodeId) => set({ hoveredNodeId: nodeId }),
  setSidebarNode: (nodeId) => set({ sidebarNodeId: nodeId }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setZoomLevel: (level) => set({ zoomLevel: level }),
  setTheme: (theme) => set({ theme }),
  setLoading: (loading, message) =>
    set({ isLoading: loading, loadingMessage: message || '' }),

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
}));
