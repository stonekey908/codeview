import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

// Returns the list of components that need descriptions
// The web frontend will show this as a progress list
export async function GET() {
  const projectDir = process.env.CODEVIEW_PROJECT_DIR || process.cwd();
  const analysisPath = path.join(projectDir, '.codeview', 'analysis.json');
  const descPath = path.join(projectDir, '.codeview', 'descriptions.json');

  if (!fs.existsSync(analysisPath)) {
    return NextResponse.json({ error: 'No analysis found. Run the CLI first.' }, { status: 404 });
  }

  const analysis = JSON.parse(fs.readFileSync(analysisPath, 'utf-8'));
  const existing: Record<string, string> = fs.existsSync(descPath)
    ? JSON.parse(fs.readFileSync(descPath, 'utf-8'))
    : {};

  const components = analysis.graph.nodes.map((n: any) => ({
    path: n.relativePath,
    label: n.label,
    role: n.role,
    layer: n.layer,
    hasDescription: !!existing[n.relativePath],
    description: existing[n.relativePath] || n.description,
  }));

  return NextResponse.json({
    total: components.length,
    described: Object.keys(existing).length,
    components,
  });
}

// Save a description for a component (called by the frontend after Claude generates it)
export async function POST(request: NextRequest) {
  const projectDir = process.env.CODEVIEW_PROJECT_DIR || process.cwd();
  const descPath = path.join(projectDir, '.codeview', 'descriptions.json');
  const dir = path.join(projectDir, '.codeview');
  fs.mkdirSync(dir, { recursive: true });

  const body = await request.json();

  // Load existing
  let existing: Record<string, string> = {};
  try {
    if (fs.existsSync(descPath)) {
      existing = JSON.parse(fs.readFileSync(descPath, 'utf-8'));
    }
  } catch { /* ignore */ }

  // Merge new descriptions
  if (body.descriptions) {
    Object.assign(existing, body.descriptions);
  } else if (body.path && body.description) {
    existing[body.path] = body.description;
  }

  fs.writeFileSync(descPath, JSON.stringify(existing, null, 2));

  return NextResponse.json({ saved: Object.keys(existing).length });
}
