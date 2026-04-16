import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { resolveProvider, runViaHttp } from '@/lib/ai-provider';

// GET — return cached overview
export async function GET() {
  const projectDir = process.env.CODEVIEW_PROJECT_DIR || process.cwd();
  const overviewPath = path.join(projectDir, '.codeview', 'overview.json');
  const progressPath = path.join(projectDir, '.codeview', 'overview-progress.json');

  let progress = null;
  try {
    if (fs.existsSync(progressPath)) progress = JSON.parse(fs.readFileSync(progressPath, 'utf-8'));
  } catch {}

  if (progress?.status === 'running') {
    return NextResponse.json({ status: 'running' });
  }

  if (!fs.existsSync(overviewPath)) {
    return NextResponse.json({ status: 'not-generated', overview: null });
  }

  try {
    const raw = fs.readFileSync(overviewPath, 'utf-8').trim();
    if (!raw || raw.length < 2) return NextResponse.json({ status: 'not-generated', overview: null });
    const overview = JSON.parse(raw);
    return NextResponse.json({ status: 'done', overview });
  } catch {
    return NextResponse.json({ status: 'error', overview: null });
  }
}

// POST — generate overview using AI
export async function POST() {
  const projectDir = process.env.CODEVIEW_PROJECT_DIR || process.cwd();
  const descDir = path.join(projectDir, '.codeview');
  fs.mkdirSync(descDir, { recursive: true });

  const analysisPath = path.join(descDir, 'analysis.json');
  if (!fs.existsSync(analysisPath)) {
    return NextResponse.json({ error: 'No analysis found' }, { status: 404 });
  }

  const provider = resolveProvider();
  if (!provider) return NextResponse.json({ error: 'No AI CLI found. Install Claude Code, Gemini CLI, or set CODEVIEW_AI_PROVIDER.' }, { status: 500 });

  const analysis = JSON.parse(fs.readFileSync(analysisPath, 'utf-8'));
  const graph = analysis.graph;

  // Load enhancements and descriptions for richer context
  let enhancements: Record<string, any> = {};
  let descriptions: Record<string, string> = {};
  try {
    const enhPath = path.join(descDir, 'enhancements.json');
    if (fs.existsSync(enhPath)) enhancements = JSON.parse(fs.readFileSync(enhPath, 'utf-8'));
  } catch {}
  try {
    const descPath = path.join(descDir, 'descriptions.json');
    if (fs.existsSync(descPath)) descriptions = JSON.parse(fs.readFileSync(descPath, 'utf-8'));
  } catch {}

  // Build the component summary
  const layers: Record<string, any[]> = {};
  for (const node of graph.nodes) {
    const enh = enhancements[node.relativePath];
    const layer = enh?.layer || node.layer;
    if (!layers[layer]) layers[layer] = [];
    layers[layer].push({
      name: enh?.title || node.label,
      path: node.relativePath,
      role: node.role,
      summary: enh?.summary || descriptions[node.relativePath] || node.description,
      connections: node.metadata?.connectionCount || 0,
    });
  }

  // Build prompt
  let prompt = 'Generate an interactive overview of this software project for a non-technical product owner.\n\n';
  prompt += 'Return ONLY a JSON object with this exact structure:\n';
  prompt += '{\n';
  prompt += '  "appName": "Name of the app",\n';
  prompt += '  "summary": "2-3 sentence description of what the app does and who it is for",\n';
  prompt += '  "stats": { "screens": N, "cloudFunctions": N, "aiFeatures": N, "dataTypes": N },\n';
  prompt += '  "features": [\n';
  prompt += '    { "icon": "emoji", "title": "Feature Name", "description": "What this feature does for the user (2 sentences)", "layer": "ui|api|data|utils|external", "componentPaths": ["path/to/file.tsx"] }\n';
  prompt += '  ],\n';
  prompt += '  "flows": [\n';
  prompt += '    {\n';
  prompt += '      "title": "Name of Flow (e.g. Document Upload Flow)",\n';
  prompt += '      "description": "One sentence describing this flow",\n';
  prompt += '      "steps": [\n';
  prompt += '        { "title": "What happens", "description": "Brief explanation", "layer": "ui|api|data|utils|external", "componentPaths": ["path"] }\n';
  prompt += '      ]\n';
  prompt += '    }\n';
  prompt += '  ],\n';
  prompt += '  "backend": [\n';
  prompt += '    { "icon": "emoji", "title": "Service Name", "description": "What it does (2 sentences)", "componentPaths": ["path"] }\n';
  prompt += '  ],\n';
  prompt += '  "dataTypes": [\n';
  prompt += '    { "name": "Type Name", "description": "What it stores (short)" }\n';
  prompt += '  ],\n';
  prompt += '  "capabilities": [\n';
  prompt += '    { "icon": "emoji", "title": "Capability Name", "description": "What this reusable pattern does and why it matters (1-2 sentences)", "componentPaths": ["path/to/file.tsx"] }\n';
  prompt += '  ],\n';
  prompt += '  "generatedAt": "ISO date string"\n';
  prompt += '}\n\n';
  prompt += 'RULES:\n';
  prompt += '- Write for a non-technical product owner who has never seen the code\n';
  prompt += '- Features should be the main things users DO with the app (5-8 features max)\n';
  prompt += '- Flows should show how data moves through the system (1-3 flows, 3-6 steps each)\n';
  prompt += '- Backend should be server-side services explained simply (cloud functions, AI, notifications)\n';
  prompt += '- Capabilities are reusable technical patterns that span multiple components — things like authentication, file upload, payment processing, encryption, real-time sync, email notifications. Each capability should group components that actually import from or connect to each other. EVERY component must appear in at least one capability — do not leave any component uncategorised. A component can appear in multiple capabilities if it serves multiple patterns. If a component does not fit a specific pattern, group it into a general capability like "Core App Shell" or "Shared Utilities".\n';
  prompt += '- Use specific component names in componentPaths so the UI can link to them\n';
  prompt += '- Keep descriptions concise — 1-2 sentences each\n\n';
  prompt += '=== PROJECT ARCHITECTURE ===\n\n';

  for (const [layer, comps] of Object.entries(layers)) {
    prompt += `--- ${layer.toUpperCase()} (${comps.length} components) ---\n`;
    for (const c of comps) {
      prompt += `  ${c.name} (${c.path}) — ${c.role} — ${c.summary}\n`;
    }
    prompt += '\n';
  }

  prompt += `\n--- CONNECTIONS (${graph.edges.length} total) ---\n`;
  const sampleEdges = graph.edges.slice(0, 30);
  for (const e of sampleEdges) {
    const src = graph.nodes.find((n: any) => n.id === e.source);
    const tgt = graph.nodes.find((n: any) => n.id === e.target);
    if (src && tgt) prompt += `  ${src.label} → ${tgt.label}\n`;
  }

  // Write progress
  const progressPath = path.join(descDir, 'overview-progress.json');
  const overviewPath = path.join(descDir, 'overview.json');
  fs.writeFileSync(progressPath, JSON.stringify({ status: 'running', started: new Date().toISOString() }));

  // Shared handler for processing AI output — used by both CLI and HTTP paths
  const handleOutput = (output: string, code: number | null) => {
    console.log(`[overview] AI exited with code ${code}, output: ${output.length} chars`);
    if (code === 0 && output.trim()) {
      try {
        const jsonMatch = output.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const overview = JSON.parse(jsonMatch[0]);
          overview.generatedAt = new Date().toISOString();
          overview.componentCount = graph.nodes.length;
          fs.writeFileSync(overviewPath, JSON.stringify(overview, null, 2));
          fs.writeFileSync(progressPath, JSON.stringify({ status: 'done' }));
          console.log(`[overview] Saved overview for "${overview.appName}"`);
        } else {
          fs.writeFileSync(progressPath, JSON.stringify({ status: 'error' }));
        }
      } catch (err) {
        console.error(`[overview] Parse error: ${err}`);
        fs.writeFileSync(progressPath, JSON.stringify({ status: 'error' }));
      }
    } else {
      fs.writeFileSync(progressPath, JSON.stringify({ status: 'error' }));
    }
  };

  if (provider.type === 'http') {
    // Ollama HTTP path
    runViaHttp(provider, prompt, (output, code) => handleOutput(output, code));
  } else {
    // Existing CLI spawn path — untouched
    let output = '';
    const child = spawn(provider.bin, provider.buildArgs(prompt), {
      cwd: projectDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, ...provider.env, PATH: process.env.PATH + ':/usr/local/bin:/opt/homebrew/bin' },
    });

    child.stdout?.on('data', (data: Buffer) => { output += data.toString(); });
    child.stderr?.on('data', (data: Buffer) => { console.error(`[overview-err] ${data.toString().slice(0, 200)}`); });

    child.on('close', (code: number | null) => handleOutput(output, code));

    child.on('error', (err: Error) => {
      console.error(`[overview] Spawn error: ${err.message}`);
      fs.writeFileSync(progressPath, JSON.stringify({ status: 'error' }));
    });
  }

  return NextResponse.json({ status: 'started' });
}
