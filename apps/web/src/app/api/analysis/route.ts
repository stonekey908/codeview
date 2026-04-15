import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

export async function GET() {
  const projectDir = process.env.CODEVIEW_PROJECT_DIR;

  // Only look for real project data when CODEVIEW_PROJECT_DIR is explicitly set
  if (projectDir) {
    const filePath = path.join(projectDir, '.codeview', 'analysis.json');
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      applyEnhancements(data, path.dirname(filePath));
      return NextResponse.json(data);
    }
  }

  return NextResponse.json({ graph: null, layout: null });
}

function applyEnhancements(data: any, dir: string) {
  const enhancePath = path.join(dir, 'enhancements.json');
  if (!fs.existsSync(enhancePath)) return;
  try {
    const raw = fs.readFileSync(enhancePath, 'utf-8').trim();
    if (!raw || raw.length < 2) return;
    const enhancements = JSON.parse(raw);
    if (!data.graph?.nodes) return;
    for (const node of data.graph.nodes) {
      const enh = enhancements[node.relativePath];
      if (enh) {
        if (enh.title) node.label = enh.title;
        if (enh.layer && ['ui', 'api', 'data', 'utils', 'external'].includes(enh.layer)) node.layer = enh.layer;
        if (enh.summary) node.description = enh.summary;
      }
    }
    rebuildClusters(data);
  } catch (err) {
    console.error('[analysis] Error applying enhancements:', err);
  }
}

function rebuildClusters(data: any) {
  const layerLabels: Record<string, string> = {
    ui: 'UI Components', api: 'API Routes', data: 'Data Layer',
    utils: 'Utilities', external: 'External Services',
  };
  const layerDescs: Record<string, string> = {
    ui: 'What users see and interact with — screens, buttons, and forms',
    api: 'Behind-the-scenes handlers that process requests',
    data: 'Database structure, static datasets, and type definitions',
    utils: 'Shared helper tools used across the app',
    external: 'Third-party services the app connects to',
  };
  const byLayer = new Map<string, string[]>();
  for (const node of data.graph.nodes) {
    const arr = byLayer.get(node.layer) || [];
    arr.push(node.id);
    byLayer.set(node.layer, arr);
  }
  data.graph.clusters = Array.from(byLayer.entries()).map(([layer, nodeIds]) => ({
    id: `cluster-${layer}`,
    label: layerLabels[layer] || layer,
    description: layerDescs[layer] || '',
    layer,
    nodeIds,
    metadata: {
      componentCount: nodeIds.length,
      connectionCount: data.graph.edges.filter((e: any) =>
        nodeIds.includes(e.source) || nodeIds.includes(e.target)
      ).length,
    },
  }));
}
