import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { requireProvider } from '@/lib/ai-provider';

export async function POST(request: NextRequest) {
  const { action, componentPath, componentPaths } = await request.json();
  const projectDir = process.env.CODEVIEW_PROJECT_DIR || process.cwd();

  let provider;
  try {
    provider = requireProvider();
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
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

    runAndSave(provider, projectDir, prompt, descPath, 'all');
    return NextResponse.json({ status: 'started', total: components.length });
  }

  if (action === 'explain' && componentPath) {
    const filePath = path.join(projectDir, componentPath);
    let content = '';
    try {
      if (fs.existsSync(filePath)) content = fs.readFileSync(filePath, 'utf-8');
    } catch {}

    const prompt = `Explain this code component in plain English for a non-technical product owner.

Use this structure with markdown headings and emojis:

## 🎯 What It Does
One paragraph explaining the purpose simply.

## ⚙️ How It Works
Bullet points explaining the key steps or logic.

## 🔗 What It Connects To
Bullet points listing other parts of the app it depends on or is used by.

## 📊 Key Details
Any important data it handles, notable patterns, or things worth knowing.

Keep it concise — 2-4 bullet points per section. Write for someone who cannot read code.

File: ${componentPath}
\`\`\`
${content}
\`\`\``;

    runAndSave(provider, projectDir, prompt, descPath, 'single', componentPath);
    return NextResponse.json({ status: 'started', componentPath });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

function runAndSave(
  provider: { bin: string; buildArgs: (prompt: string) => string[]; env?: Record<string, string> },
  cwd: string,
  prompt: string,
  descPath: string,
  mode: 'all' | 'single',
  componentPath?: string
) {
  let output = '';

  const child = spawn(provider.bin, provider.buildArgs(prompt), {
    cwd,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, ...provider.env, PATH: process.env.PATH + ':/usr/local/bin:/opt/homebrew/bin' },
  });

  child.stdout?.on('data', (data) => {
    output += data.toString();
  });

  child.stderr?.on('data', (data) => {
    console.error(`[ai-err] ${data.toString().slice(0, 300)}`);
  });

  child.on('close', (code) => {
    console.log(`[trigger-ai] Exited with code ${code}, output length: ${output.length}`);

    if (code !== 0 || !output.trim()) {
      console.error('[trigger-ai] AI returned no output or failed');
      return;
    }

    try {
      let existing: Record<string, string> = {};
      try {
        if (fs.existsSync(descPath)) {
          existing = JSON.parse(fs.readFileSync(descPath, 'utf-8'));
        }
      } catch {}

      if (mode === 'all') {
        const jsonMatch = output.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const descriptions = JSON.parse(jsonMatch[0]);
          Object.assign(existing, descriptions);
          console.log(`[trigger-ai] Parsed ${Object.keys(descriptions).length} descriptions`);
        } else {
          console.error('[trigger-ai] Could not find JSON in response');
          console.error('[trigger-ai] Response:', output.slice(0, 500));
        }
      } else if (mode === 'single' && componentPath) {
        existing[componentPath] = output.trim();
        console.log(`[trigger-ai] Saved explanation for ${componentPath}`);
      }

      fs.writeFileSync(descPath, JSON.stringify(existing, null, 2));
      console.log(`[trigger-ai] Wrote ${Object.keys(existing).length} descriptions to ${descPath}`);
    } catch (err) {
      console.error(`[trigger-ai] Error saving: ${err}`);
    }
  });

  child.on('error', (err) => {
    console.error(`[trigger-ai] Spawn error: ${err.message}`);
  });
}
