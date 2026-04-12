import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export async function POST(request: NextRequest) {
  const { action, componentPath } = await request.json();
  const projectDir = process.env.CODEVIEW_PROJECT_DIR || process.cwd();

  if (action === 'generate-all') {
    // Read all component files and ask Claude to describe them
    const analysisPath = path.join(projectDir, '.codeview', 'analysis.json');
    if (!fs.existsSync(analysisPath)) {
      return NextResponse.json({ error: 'No analysis found' }, { status: 404 });
    }

    const analysis = JSON.parse(fs.readFileSync(analysisPath, 'utf-8'));
    const components = analysis.graph.nodes.slice(0, 30); // Limit to 30 at a time

    // Build a prompt with file contents
    let prompt = 'I need you to generate plain-English descriptions for these components in my project. ';
    prompt += 'For each one, explain what it does, how it works, and what it connects to. ';
    prompt += 'Write for a non-technical product owner.\n\n';

    for (const node of components) {
      const filePath = path.join(projectDir, node.relativePath);
      let content = '';
      try {
        if (fs.existsSync(filePath)) {
          content = fs.readFileSync(filePath, 'utf-8').slice(0, 2000); // First 2000 chars
        }
      } catch { /* skip */ }

      prompt += `---\nFile: ${node.relativePath} (${node.label}, ${node.role})\n`;
      if (content) prompt += `\`\`\`\n${content}\n\`\`\`\n`;
      prompt += '\n';
    }

    prompt += '\nAfter analyzing, call the save_descriptions MCP tool with a JSON object mapping each relative file path to its description.';

    return runClaude(projectDir, prompt);
  }

  if (action === 'explain' && componentPath) {
    // Read single file and ask Claude to explain it
    const filePath = path.join(projectDir, componentPath);
    let content = '';
    try {
      if (fs.existsSync(filePath)) {
        content = fs.readFileSync(filePath, 'utf-8');
      }
    } catch { /* skip */ }

    const prompt = `Read this component and explain in plain English what it does, how it works, what data it processes, and what other parts of the app it interacts with. Write for a non-technical product owner.\n\nFile: ${componentPath}\n\`\`\`\n${content}\n\`\`\`\n\nAfter your analysis, call the save_explanation MCP tool with componentPath="${componentPath}" and your explanation.`;

    return runClaude(projectDir, prompt);
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

function runClaude(projectDir: string, prompt: string): NextResponse {
  try {
    // Find claude CLI — check common locations
    const { execSync } = require('child_process');
    let claudePath = 'claude';
    try {
      claudePath = execSync('which claude', { encoding: 'utf-8' }).trim();
    } catch {
      // Try common locations
      const candidates = [
        '/usr/local/bin/claude',
        `${process.env.HOME}/.nvm/versions/node/v20.15.0/bin/claude`,
        `${process.env.HOME}/.npm/bin/claude`,
      ];
      for (const c of candidates) {
        try { require('fs').accessSync(c); claudePath = c; break; } catch {}
      }
    }

    console.log(`[trigger-claude] Using: ${claudePath}`);
    console.log(`[trigger-claude] CWD: ${projectDir}`);
    console.log(`[trigger-claude] Prompt length: ${prompt.length} chars`);

    const child = spawn(claudePath, ['-p', prompt, '--output-format', 'text'], {
      cwd: projectDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, PATH: process.env.PATH + ':/usr/local/bin:/opt/homebrew/bin' },
      detached: true,
    });

    // Don't wait for it — let it run in background
    child.unref();

    // Log output for debugging
    child.stdout?.on('data', (data) => {
      console.log(`[claude] ${data.toString().slice(0, 200)}`);
    });
    child.stderr?.on('data', (data) => {
      console.error(`[claude-err] ${data.toString().slice(0, 500)}`);
    });

    child.on('error', (err) => {
      console.error(`[trigger-claude] Spawn error: ${err.message}`);
    });

    child.on('exit', (code) => {
      console.log(`[trigger-claude] Claude exited with code ${code}`);
    });

    return NextResponse.json({ status: 'started', message: 'Claude is processing...', claudePath }) as any;
  } catch (err) {
    return NextResponse.json({
      error: 'Could not start Claude. Make sure claude CLI is installed and you are logged in.',
      detail: err instanceof Error ? err.message : String(err),
    }, { status: 500 }) as any;
  }
}
