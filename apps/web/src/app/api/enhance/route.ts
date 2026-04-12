import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// "Enhance" — quick AI skim to improve titles and categorization
export async function POST(request: NextRequest) {
  const { componentPaths } = await request.json();
  const projectDir = process.env.CODEVIEW_PROJECT_DIR || process.cwd();

  // Find claude
  let claudePath = '';
  try {
    const { execSync } = require('child_process');
    claudePath = execSync('which claude', { encoding: 'utf-8' }).trim();
  } catch {
    const candidates = [
      '/usr/local/bin/claude',
      `${process.env.HOME}/.nvm/versions/node/v20.15.0/bin/claude`,
    ];
    for (const c of candidates) {
      try { fs.accessSync(c); claudePath = c; break; } catch {}
    }
  }

  if (!claudePath) {
    return NextResponse.json({ error: 'Claude CLI not found' }, { status: 500 });
  }

  const analysisPath = path.join(projectDir, '.codeview', 'analysis.json');
  if (!fs.existsSync(analysisPath)) {
    return NextResponse.json({ error: 'No analysis found' }, { status: 404 });
  }

  const analysis = JSON.parse(fs.readFileSync(analysisPath, 'utf-8'));
  let components = analysis.graph.nodes;
  if (componentPaths?.length > 0) {
    components = components.filter((n: any) => componentPaths.includes(n.relativePath));
  }

  // Build a quick skim prompt — only first 300 chars of each file
  let prompt = 'Categorize these code files for a non-technical product owner. For each file I show the path and first few lines.\n\n';
  prompt += 'Return ONLY a JSON object: { "filepath": { "title": "Short Human Name", "layer": "ui|api|data|utils|external", "summary": "What this does in plain English (1-2 sentences max)" } }\n\n';
  prompt += 'RULES:\n';
  prompt += '- title: Short, clear name. "Mobile Detection Hook" not "Use Mobile". "API Response Cache" not "Cache". Never just repeat the filename.\n';
  prompt += '- summary: Explain what it DOES for the app, not what it IS. "Detects if the user is on a phone or tablet to adjust the layout" not "Helper functions: useIsMobile". Write for someone who cannot read code.\n';
  prompt += '- layer "ui" = screens, pages, buttons, components users see and interact with\n';
  prompt += '- layer "api" = backend endpoints that handle requests (route.ts files)\n';
  prompt += '- layer "data" = database models, static datasets, type definitions, data files\n';
  prompt += '- layer "utils" = helper functions, formatting, validation, caching\n';
  prompt += '- layer "external" = connections to third-party services (Google Gemini, Stripe, SendGrid, AWS, etc.)\n\n';

  for (const node of components.slice(0, 40)) {
    const filePath = path.join(projectDir, node.relativePath);
    let preview = '';
    try {
      if (fs.existsSync(filePath)) {
        preview = fs.readFileSync(filePath, 'utf-8').slice(0, 500);
      }
    } catch {}
    prompt += `File: ${node.relativePath}\n\`\`\`\n${preview}\n\`\`\`\n\n`;
  }

  // Spawn claude
  const descDir = path.join(projectDir, '.codeview');
  fs.mkdirSync(descDir, { recursive: true });
  const enhancePath = path.join(descDir, 'enhancements.json');

  let output = '';
  const child = spawn(claudePath, ['-p', prompt, '--output-format', 'text'], {
    cwd: projectDir,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, PATH: process.env.PATH + ':/usr/local/bin:/opt/homebrew/bin' },
  });

  child.stdout?.on('data', (data: Buffer) => { output += data.toString(); });
  child.stderr?.on('data', (data: Buffer) => {
    console.error(`[enhance-err] ${data.toString().slice(0, 300)}`);
  });

  child.on('close', (code: number | null) => {
    console.log(`[enhance] Claude exited with code ${code}, output: ${output.length} chars`);
    if (code !== 0 || !output.trim()) return;

    try {
      const jsonMatch = output.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const enhancements = JSON.parse(jsonMatch[0]);
        fs.writeFileSync(enhancePath, JSON.stringify(enhancements, null, 2));
        console.log(`[enhance] Saved ${Object.keys(enhancements).length} enhancements`);

        // Also merge summaries into descriptions
        const descPath = path.join(descDir, 'descriptions.json');
        let descriptions: Record<string, string> = {};
        try {
          if (fs.existsSync(descPath)) descriptions = JSON.parse(fs.readFileSync(descPath, 'utf-8'));
        } catch {}

        for (const [filePath, data] of Object.entries(enhancements) as [string, any][]) {
          if (data.summary && !descriptions[filePath]) {
            descriptions[filePath] = data.summary;
          }
        }
        fs.writeFileSync(descPath, JSON.stringify(descriptions, null, 2));
      }
    } catch (err) {
      console.error(`[enhance] Parse error: ${err}`);
    }
  });

  return NextResponse.json({
    status: 'started',
    components: components.length,
    message: 'Claude is doing a quick skim...',
  });
}

// Check for enhancement results
export async function GET() {
  const projectDir = process.env.CODEVIEW_PROJECT_DIR || process.cwd();
  const enhancePath = path.join(projectDir, '.codeview', 'enhancements.json');

  if (!fs.existsSync(enhancePath)) {
    return NextResponse.json({ status: 'not-started', enhancements: null });
  }

  try {
    const enhancements = JSON.parse(fs.readFileSync(enhancePath, 'utf-8'));
    return NextResponse.json({ status: 'done', enhancements, count: Object.keys(enhancements).length });
  } catch {
    return NextResponse.json({ status: 'error', enhancements: null });
  }
}
