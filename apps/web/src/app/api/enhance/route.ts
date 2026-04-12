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
  let prompt = 'I need you to quickly categorize these code files. For each one I will show the file path and the first few lines of code. ';
  prompt += 'Return ONLY a JSON object with this structure: { "filepath": { "title": "Better Human Title", "layer": "ui|api|data|utils|external", "summary": "One sentence what it does" } }\n\n';
  prompt += 'Layer rules:\n';
  prompt += '- "ui" = React components, pages, layouts that users see\n';
  prompt += '- "api" = API route handlers (route.ts, endpoints)\n';
  prompt += '- "data" = Database models, schemas, static data files, type definitions\n';
  prompt += '- "utils" = Helper functions, formatting, validation\n';
  prompt += '- "external" = Connections to third-party services (Stripe, Gemini, SendGrid, AWS, etc.)\n\n';

  for (const node of components.slice(0, 40)) {
    const filePath = path.join(projectDir, node.relativePath);
    let preview = '';
    try {
      if (fs.existsSync(filePath)) {
        preview = fs.readFileSync(filePath, 'utf-8').slice(0, 300);
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
