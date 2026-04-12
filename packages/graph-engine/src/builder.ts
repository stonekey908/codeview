import * as path from 'path';
import type {
  AnalysisResult,
  GraphData,
  GraphNode,
  GraphEdge,
  GraphCluster,
  ArchitecturalLayer,
  ComponentRole,
} from '@codeview/shared';
import { humanLabel, humanDescription, layerDescription } from './labeler';

export function buildGraph(analysis: AnalysisResult): GraphData {
  const nodes = buildNodes(analysis);
  const nodeMap = new Map(nodes.map((n) => [n.relativePath, n]));
  const edges = buildEdges(analysis, nodeMap);

  // Update connection counts
  for (const edge of edges) {
    const src = nodes.find((n) => n.id === edge.source);
    const tgt = nodes.find((n) => n.id === edge.target);
    if (src) src.metadata.connectionCount++;
    if (tgt) tgt.metadata.connectionCount++;
  }

  const clusters = buildClusters(nodes, edges);

  return { nodes, edges, clusters };
}

function buildNodes(analysis: AnalysisResult): GraphNode[] {
  return analysis.files.map((file) => {
    const layer = detectLayer(file.relativePath, file.framework?.role || null);
    const role = (file.framework?.role as ComponentRole) || 'unknown';

    return {
      id: file.relativePath,
      label: humanLabel(file.relativePath),
      description: humanDescription(
        file.relativePath,
        role,
        layer,
        file.imports.map(i => i.source),
        file.exports.map(e => e.name)
      ),
      filePath: file.filePath,
      relativePath: file.relativePath,
      layer,
      role,
      metadata: {
        exportCount: file.exports.length,
        importCount: file.imports.length,
        connectionCount: 0,
        framework: file.framework?.framework,
      },
    };
  });
}

function buildEdges(
  analysis: AnalysisResult,
  nodeMap: Map<string, GraphNode>
): GraphEdge[] {
  const edges: GraphEdge[] = [];
  const edgeSet = new Set<string>();

  for (const file of analysis.files) {
    for (const imp of file.imports) {
      // Resolve the import source to a file in the project
      const targetPath = resolveImportPath(
        file.relativePath,
        imp.source,
        nodeMap,
        analysis.rootDir
      );

      if (!targetPath || targetPath === file.relativePath) continue;

      const edgeId = `${file.relativePath}->${targetPath}`;
      if (edgeSet.has(edgeId)) continue;
      edgeSet.add(edgeId);

      edges.push({
        id: edgeId,
        source: file.relativePath,
        target: targetPath,
        type: imp.isDynamic ? 'dynamic-import' : 'import',
      });
    }
  }

  return edges;
}

function resolveImportPath(
  fromPath: string,
  importSource: string,
  nodeMap: Map<string, GraphNode>,
  _rootDir: string
): string | null {
  // Skip external packages (not relative imports)
  if (!importSource.startsWith('.') && !importSource.startsWith('@/') && !importSource.startsWith('~/')) {
    return null;
  }

  // Handle alias paths
  let resolved = importSource;
  if (importSource.startsWith('@/')) {
    resolved = 'src/' + importSource.slice(2);
  } else if (importSource.startsWith('~/')) {
    resolved = importSource.slice(2);
  } else {
    // Relative path resolution
    const fromDir = path.dirname(fromPath);
    resolved = path.join(fromDir, importSource);
  }

  // Normalize separators
  resolved = resolved.replace(/\\/g, '/');

  // Try exact match then with extensions
  const extensions = ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js'];
  for (const ext of extensions) {
    const candidate = resolved + ext;
    if (nodeMap.has(candidate)) return candidate;
  }

  return null;
}

function detectLayer(relativePath: string, role: string | null): ArchitecturalLayer {
  // If framework detector assigned a role, map it to a layer
  const roleLayerMap: Record<string, ArchitecturalLayer> = {
    page: 'ui',
    component: 'ui',
    layout: 'ui',
    hook: 'ui',
    context: 'ui',
    'api-route': 'api',
    middleware: 'api',
    model: 'data',
    schema: 'data',
    service: 'external',
    config: 'utils',
    utility: 'utils',
  };

  if (role && roleLayerMap[role]) return roleLayerMap[role];

  // Directory-based heuristics
  const normPath = '/' + relativePath.replace(/\\/g, '/');
  if (normPath.includes('/api/') || normPath.includes('/routes/')) return 'api';
  if (normPath.includes('/models/') || normPath.includes('/schema/') || normPath.includes('/db/')) return 'data';
  if (normPath.includes('/services/') || normPath.includes('/clients/')) return 'external';
  if (normPath.includes('/utils/') || normPath.includes('/lib/') || normPath.includes('/helpers/')) return 'utils';
  if (normPath.includes('/components/') || normPath.includes('/app/') || normPath.includes('/pages/')) return 'ui';

  return 'utils';
}

function buildClusters(nodes: GraphNode[], edges: GraphEdge[]): GraphCluster[] {
  // Group by layer
  const layerGroups = new Map<ArchitecturalLayer, GraphNode[]>();
  for (const node of nodes) {
    const group = layerGroups.get(node.layer) || [];
    group.push(node);
    layerGroups.set(node.layer, group);
  }

  const clusters: GraphCluster[] = [];
  const layerLabels: Record<ArchitecturalLayer, string> = {
    ui: 'UI Components',
    api: 'API Routes',
    data: 'Data Layer',
    utils: 'Utilities',
    external: 'External Services',
  };

  for (const [layer, layerNodes] of layerGroups) {
    const nodeIds = layerNodes.map((n) => n.id);
    const nodeIdSet = new Set(nodeIds);
    const connectionCount = edges.filter(
      (e) => nodeIdSet.has(e.source) || nodeIdSet.has(e.target)
    ).length;

    clusters.push({
      id: `cluster-${layer}`,
      label: layerLabels[layer],
      description: layerDescription(layer),
      layer,
      nodeIds,
      metadata: {
        componentCount: layerNodes.length,
        connectionCount,
      },
    });
  }

  return clusters;
}
