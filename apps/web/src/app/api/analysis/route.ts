import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

export async function GET() {
  const projectDir = process.env.CODEVIEW_PROJECT_DIR || process.cwd();

  const candidates = [
    path.join(projectDir, '.codeview', 'analysis.json'),
    path.join(process.cwd(), '.codeview', 'analysis.json'),
    path.join(process.cwd(), '..', '..', '.codeview', 'analysis.json'),
  ];

  for (const filePath of candidates) {
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

      // Apply enhancements if they exist (better titles, categories, summaries)
      const enhancePath = path.join(path.dirname(filePath), 'enhancements.json');
      if (fs.existsSync(enhancePath)) {
        try {
          const enhancements = JSON.parse(fs.readFileSync(enhancePath, 'utf-8'));
          if (data.graph?.nodes) {
            for (const node of data.graph.nodes) {
              const enh = enhancements[node.relativePath];
              if (enh) {
                if (enh.title) node.label = enh.title;
                if (enh.layer && ['ui', 'api', 'data', 'utils', 'external'].includes(enh.layer)) {
                  node.layer = enh.layer;
                }
                if (enh.summary) node.description = enh.summary;
              }
            }
            // Re-cluster by updated layers
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
            // Rebuild clusters from updated node layers
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
        } catch (err) {
          console.error('[analysis] Error applying enhancements:', err);
        }
      }

      // Apply cached descriptions if they exist
      const descPath = path.join(path.dirname(filePath), 'descriptions.json');
      if (fs.existsSync(descPath)) {
        try {
          const descriptions = JSON.parse(fs.readFileSync(descPath, 'utf-8'));
          if (data.graph?.nodes) {
            for (const node of data.graph.nodes) {
              if (descriptions[node.relativePath]) {
                node.description = descriptions[node.relativePath];
              }
            }
          }
        } catch {}
      }

      return NextResponse.json(data);
    }
  }

  return NextResponse.json({ graph: null, layout: null }, { status: 404 });
}
