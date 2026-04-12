import type { ArchitecturalLayer, ComponentRole } from './detection';

export interface GraphNode {
  id: string;
  label: string;
  description: string;
  filePath: string;
  relativePath: string;
  layer: ArchitecturalLayer;
  role: ComponentRole;
  metadata: {
    exportCount: number;
    importCount: number;
    connectionCount: number;
    framework?: string;
  };
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: 'import' | 're-export' | 'dynamic-import';
  label?: string;
}

export interface GraphCluster {
  id: string;
  label: string;
  description: string;
  layer: ArchitecturalLayer;
  nodeIds: string[];
  metadata: {
    componentCount: number;
    connectionCount: number;
  };
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  clusters: GraphCluster[];
}
