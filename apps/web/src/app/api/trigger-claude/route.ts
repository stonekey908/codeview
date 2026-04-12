import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export async function POST(request: NextRequest) {
  const { action, componentPath, componentPaths } = await request.json();
  const projectDir = process.env.CODEVIEW_PROJECT_DIR || process.cwd();

  // Find claude CLI
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
    return NextResponse.json({ error: 'Claude CLI not found. Make sure claude is installed.' }, { status: 500 });
  }

  const descDir = path.join(projectDir, '.codeview');
  fs.mkdirSync(descDir, { recursive: true });
  const descPath = path.join(descDir, 'descriptions.json');

  if (action === 'generate-all') {
    const analysisPath = path.join(descDir, 'analysis.json');
    if (!fs.existsSync(analysisPath)) {
      return NextResponse.json({ error: 'No analysis found. Run the CLI first.' }, { status: 404 });
    }

    const analysis = JSON.parse(fs.readFileSync(analysisPath, 'utf-8'));
    // If specific paths provided, use those. Otherwise take first 30.
    let components = analysis.graph.nodes;
    if (componentPaths && componentPaths.length > 0) {
      components = components.filter((n: any) => componentPaths.includes(n.relativePath));
    } else {
      components = components.slice(0, 30);
    }

    let prompt = 'Generate plain-English descriptions for these code components. ';
    prompt += 'For each one, write 1-2 sentences explaining what it does for a non-technical product owner. ';
    prompt += 'Return ONLY a JSON object mapping file paths to descriptions, no other text. ';
    prompt += 'Example format: {"src/app/page.tsx": "The main dashboard screen showing key metrics and recent activity"}\n\n';

    for (const node of components) {
      const filePath = path.join(projectDir, node.relativePath);
      let content = '';
      try {
        if (fs.existsSync(filePath)) {
          content = fs.readFileSync(filePath, 'utf-8').slice(0, 1500);
        }
      } catch {}
      prompt += `File: ${node.relativePath} (${node.label}, ${node.role})\n`;
      if (content) prompt += '```\n' + content + '\n```\n\n';
    }

    runClaudeAndSave(claudePath, projectDir, prompt, descPath, 'all');
    return NextResponse.json({ status: 'started', total: components.length });
  }

  if (action === 'explain' && componentPath) {
    const filePath = path.join(projectDir, componentPath);
    let content = '';
    try {
      if (fs.existsSync(filePath)) content = fs.readFileSync(filePath, 'utf-8');
    } catch {}

    const prompt = `Explain this code component in plain English for a non-technical product owner. Cover: what it does, how it works, what data it uses, and what other parts of the app it connects to. Return ONLY the explanation text, no markdown formatting.\n\nFile: ${componentPath}\n\`\`\`\n${content}\n\`\`\``;

    runClaudeAndSave(claudePath, projectDir, prompt, descPath, 'single', componentPath);
    return NextResponse.json({ status: 'started', componentPath });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

function runClaudeAndSave(
  claudePath: string,
  cwd: string,
  prompt: string,
  descPath: string,
  mode: 'all' | 'single',
  componentPath?: string
) {
  let output = '';

  const child = spawn(claudePath, ['-p', prompt, '--output-format', 'text'], {
    cwd,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, PATH: process.env.PATH + ':/usr/local/bin:/opt/homebrew/bin' },
  });

  child.stdout?.on('data', (data) => {
    output += data.toString();
  });

  child.stderr?.on('data', (data) => {
    console.error(`[claude-err] ${data.toString().slice(0, 300)}`);
  });

  child.on('close', (code) => {
    console.log(`[trigger-claude] Exited with code ${code}, output length: ${output.length}`);

    if (code !== 0 || !output.trim()) {
      console.error('[trigger-claude] Claude returned no output or failed');
      return;
    }

    try {
      // Load existing descriptions
      let existing: Record<string, string> = {};
      try {
        if (fs.existsSync(descPath)) {
          existing = JSON.parse(fs.readFileSync(descPath, 'utf-8'));
        }
      } catch {}

      if (mode === 'all') {
        // Parse JSON from Claude's response
        const jsonMatch = output.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const descriptions = JSON.parse(jsonMatch[0]);
          Object.assign(existing, descriptions);
          console.log(`[trigger-claude] Parsed ${Object.keys(descriptions).length} descriptions`);
        } else {
          console.error('[trigger-claude] Could not find JSON in Claude response');
          console.error('[trigger-claude] Response:', output.slice(0, 500));
        }
      } else if (mode === 'single' && componentPath) {
        existing[componentPath] = output.trim();
        console.log(`[trigger-claude] Saved explanation for ${componentPath}`);
      }

      fs.writeFileSync(descPath, JSON.stringify(existing, null, 2));
      console.log(`[trigger-claude] Wrote ${Object.keys(existing).length} descriptions to ${descPath}`);
    } catch (err) {
      console.error(`[trigger-claude] Error saving: ${err}`);
    }
  });

  child.on('error', (err) => {
    console.error(`[trigger-claude] Spawn error: ${err.message}`);
  });
}
