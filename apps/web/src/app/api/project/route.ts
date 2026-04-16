import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { analyzeProject } from '@codeview/analyzer';
import { buildGraph, computeLayout } from '@codeview/graph-engine';

// GET — return the currently active project directory
export async function GET() {
  const projectDir = process.env.CODEVIEW_PROJECT_DIR || null;
  return NextResponse.json({ projectDir });
}

// POST — switch to a new project directory, run analyzer, write analysis.json
export async function POST(request: NextRequest) {
  const body = await request.json();
  let requestedPath: string = body.path;

  if (!requestedPath || typeof requestedPath !== 'string') {
    return NextResponse.json({ error: 'Path is required' }, { status: 400 });
  }

  // Expand ~ to home directory
  if (requestedPath.startsWith('~')) {
    requestedPath = requestedPath.replace(/^~/, os.homedir());
  }

  // Resolve to absolute path
  const projectDir = path.resolve(requestedPath);

  // Validate directory exists
  if (!fs.existsSync(projectDir)) {
    return NextResponse.json({ error: `Directory not found: ${projectDir}` }, { status: 404 });
  }

  const stat = fs.statSync(projectDir);
  if (!stat.isDirectory()) {
    return NextResponse.json({ error: `Not a directory: ${projectDir}` }, { status: 400 });
  }

  try {
    console.log(`[project] Analyzing ${projectDir}...`);
    const analysis = await analyzeProject(projectDir);

    if (analysis.files.length === 0) {
      return NextResponse.json({
        error: `No TypeScript or JavaScript files found in ${projectDir}. Make sure the directory contains .ts, .tsx, .js, or .jsx files.`,
      }, { status: 400 });
    }

    const graph = buildGraph(analysis);
    const layout = await computeLayout(graph);

    // Write analysis.json to the project's .codeview/ directory
    const dataDir = path.join(projectDir, '.codeview');
    fs.mkdirSync(dataDir, { recursive: true });
    const analysisPath = path.join(dataDir, 'analysis.json');
    fs.writeFileSync(analysisPath, JSON.stringify({
      graph,
      layout: {
        nodes: Object.fromEntries(layout.nodes),
        groups: Object.fromEntries(layout.groups),
      },
    }, null, 2));

    // Update the active project directory for subsequent API calls
    process.env.CODEVIEW_PROJECT_DIR = projectDir;

    console.log(`[project] Loaded ${projectDir}: ${graph.nodes.length} components, ${graph.edges.length} connections`);

    return NextResponse.json({
      ok: true,
      projectDir,
      stats: {
        fileCount: analysis.files.length,
        nodeCount: graph.nodes.length,
        edgeCount: graph.edges.length,
      },
    });
  } catch (err: any) {
    console.error(`[project] Error analyzing ${projectDir}:`, err);
    return NextResponse.json({ error: `Failed to analyze project: ${err.message}` }, { status: 500 });
  }
}
