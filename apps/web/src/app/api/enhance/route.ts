import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { resolveProviderWithSettings, runViaHttp } from '@/lib/ai-provider';

export async function POST(request: NextRequest) {
  const { componentPaths } = await request.json();
  const projectDir = process.env.CODEVIEW_PROJECT_DIR || process.cwd();

  const provider = resolveProviderWithSettings(projectDir);
  if (!provider) return NextResponse.json({ error: 'No AI CLI found. Install Claude Code, Gemini CLI, or set CODEVIEW_AI_PROVIDER.' }, { status: 500 });

  const analysisPath = path.join(projectDir, '.codeview', 'analysis.json');
  if (!fs.existsSync(analysisPath)) return NextResponse.json({ error: 'No analysis found' }, { status: 404 });

  const analysis = JSON.parse(fs.readFileSync(analysisPath, 'utf-8'));
  let components = analysis.graph.nodes;
  if (componentPaths?.length > 0) {
    components = components.filter((n: any) => componentPaths.includes(n.relativePath));
  }

  const descDir = path.join(projectDir, '.codeview');
  fs.mkdirSync(descDir, { recursive: true });
  const enhancePath = path.join(descDir, 'enhancements.json');
  const progressPath = path.join(descDir, 'enhance-progress.json');

  const totalCount = components.length;
  fs.writeFileSync(progressPath, JSON.stringify({ status: 'running', total: totalCount, done: 0, batch: 0, batches: Math.ceil(totalCount / 30) }));

  let allEnhancements: Record<string, any> = {};
  try {
    if (fs.existsSync(enhancePath)) allEnhancements = JSON.parse(fs.readFileSync(enhancePath, 'utf-8'));
  } catch {}

  const BATCH_SIZE = 30;
  const batches: any[][] = [];
  for (let i = 0; i < components.length; i += BATCH_SIZE) {
    batches.push(components.slice(i, i + BATCH_SIZE));
  }

  processBatches(batches, 0, provider, projectDir, descDir, enhancePath, progressPath, allEnhancements, totalCount);

  return NextResponse.json({ status: 'started', total: totalCount, batches: batches.length });
}

function buildPrompt(components: any[], projectDir: string): string {
  let prompt = 'Categorize these code files for a non-technical product owner. For each file I show the path and first few lines.\n\n';
  prompt += 'Return ONLY a JSON object: { "filepath": { "title": "Short Human Name", "layer": "ui|api|data|utils|external", "summary": "What this does in plain English (1-2 sentences max)" } }\n\n';
  prompt += 'RULES FOR TITLE:\n';
  prompt += '- Short, clear, descriptive. "Daily Summary Scheduler" not "Daily Summary". "Firebase Push Notifications" not "Fcm Helper".\n';
  prompt += '- Never just repeat the filename.\n\n';
  prompt += 'RULES FOR SUMMARY:\n';
  prompt += '- Explain what it DOES for the app. Be specific. Write for someone who cannot read code.\n\n';
  prompt += 'RULES FOR LAYER:\n';
  prompt += '- "ui" = screens, pages, modals, buttons, visual components, React hooks (useXxx)\n';
  prompt += '- "api" = backend API endpoints, route handlers\n';
  prompt += '- "data" = static data, constants, prompt templates, colour palettes, type definitions, config objects\n';
  prompt += '- "utils" = pure helper functions only: formatting, validation, string manipulation\n';
  prompt += '- "external" = anything that talks to external services or runs server-side: Cloud Functions, Firebase, AI APIs, push notifications, encryption, email\n\n';
  prompt += 'COMMON MISTAKES:\n';
  prompt += '- Cloud functions (functions/src/*) → EXTERNAL not utils\n';
  prompt += '- Constants/prompt templates → DATA not utils\n';
  prompt += '- React hooks → UI not utils\n';
  prompt += '- Encryption/crypto → EXTERNAL not utils\n\n';
  prompt += 'FOR UTILS: explain WHAT the functions do. "Formats dates, converts currency" not "Helper functions".\n\n';

  for (const node of components) {
    const filePath = path.join(projectDir, node.relativePath);
    let preview = '';
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const rp = node.relativePath;
        const isLikelyUI = rp.match(/\.(tsx|jsx)$/) &&
          (rp.includes('/app/') || rp.includes('/components/') || rp.includes('/pages/'));
        const isUtilOrLib = rp.includes('/utils/') || rp.includes('/lib/') ||
          rp.includes('/helpers/') || rp.includes('/hooks/') ||
          rp.includes('/constants/') || rp.includes('/functions/') ||
          (!rp.includes('/app/') && !rp.includes('/components/') && rp.match(/\.(ts|js|mjs)$/));
        const charLimit = isLikelyUI ? 500 : isUtilOrLib ? 3000 : 1500;
        preview = content.slice(0, charLimit);
      }
    } catch {}
    prompt += `File: ${node.relativePath}\n\`\`\`\n${preview}\n\`\`\`\n\n`;
  }

  return prompt;
}

interface ProviderLike {
  name: string;
  type?: 'cli' | 'http';
  bin: string;
  buildArgs: (prompt: string) => string[];
  env?: Record<string, string>;
  model?: string;
}

function processBatches(
  batches: any[][], batchIndex: number, provider: ProviderLike, projectDir: string,
  descDir: string, enhancePath: string, progressPath: string,
  allEnhancements: Record<string, any>, totalCount: number
) {
  if (batchIndex >= batches.length) {
    fs.writeFileSync(enhancePath, JSON.stringify(allEnhancements, null, 2));
    fs.writeFileSync(progressPath, JSON.stringify({ status: 'done', total: totalCount, done: Object.keys(allEnhancements).length, batch: batches.length, batches: batches.length }));
    console.log(`[enhance] All ${batches.length} batches complete. ${Object.keys(allEnhancements).length} total enhancements.`);
    return;
  }

  const batch = batches[batchIndex];
  const prompt = buildPrompt(batch, projectDir);

  console.log(`[enhance] Starting batch ${batchIndex + 1}/${batches.length} (${batch.length} components) via ${provider.name}`);
  fs.writeFileSync(progressPath, JSON.stringify({
    status: 'running', total: totalCount,
    done: Object.keys(allEnhancements).length,
    batch: batchIndex + 1, batches: batches.length,
  }));

  // Shared handler for processing AI output — used by both CLI and HTTP paths
  const handleOutput = (output: string, code: number | null) => {
    console.log(`[enhance] Batch ${batchIndex + 1} done. Code: ${code}, output: ${output.length} chars`);

    if (code === 0 && output.trim()) {
      try {
        const jsonMatch = output.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const batchEnhancements = JSON.parse(jsonMatch[0]);
          Object.assign(allEnhancements, batchEnhancements);
          fs.writeFileSync(enhancePath, JSON.stringify(allEnhancements, null, 2));
          console.log(`[enhance] Batch ${batchIndex + 1}: +${Object.keys(batchEnhancements).length} (total: ${Object.keys(allEnhancements).length})`);
        }
      } catch (err) {
        console.error(`[enhance] Batch ${batchIndex + 1} parse error: ${err}`);
      }
    }

    processBatches(batches, batchIndex + 1, provider, projectDir, descDir, enhancePath, progressPath, allEnhancements, totalCount);
  };

  if (provider.type === 'http') {
    // Ollama HTTP path
    runViaHttp(provider as any, prompt, (output, code) => handleOutput(output, code));
  } else {
    // Existing CLI spawn path — untouched
    let output = '';
    const child = spawn(provider.bin, provider.buildArgs(prompt), {
      cwd: projectDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, ...provider.env, PATH: process.env.PATH + ':/usr/local/bin:/opt/homebrew/bin' },
    });

    child.stdout?.on('data', (data: Buffer) => { output += data.toString(); });
    child.stderr?.on('data', (data: Buffer) => { console.error(`[enhance-err] ${data.toString().slice(0, 200)}`); });

    child.on('close', (code: number | null) => handleOutput(output, code));

    child.on('error', (err: Error) => {
      console.error(`[enhance] Batch ${batchIndex + 1} spawn error: ${err.message}`);
      processBatches(batches, batchIndex + 1, provider, projectDir, descDir, enhancePath, progressPath, allEnhancements, totalCount);
    });
  }
}

export async function GET() {
  const projectDir = process.env.CODEVIEW_PROJECT_DIR || process.cwd();
  const dir = path.join(projectDir, '.codeview');
  const enhancePath = path.join(dir, 'enhancements.json');
  const progressPath = path.join(dir, 'enhance-progress.json');

  let progress = null;
  try {
    if (fs.existsSync(progressPath)) progress = JSON.parse(fs.readFileSync(progressPath, 'utf-8'));
  } catch {}

  if (progress?.status === 'running') {
    return NextResponse.json({
      status: 'running',
      total: progress.total,
      done: progress.done || 0,
      batch: progress.batch || 0,
      batches: progress.batches || 1,
    });
  }

  if (!fs.existsSync(enhancePath)) {
    return NextResponse.json({ status: 'not-started', enhancements: null, count: 0, total: 0 });
  }

  try {
    const raw = fs.readFileSync(enhancePath, 'utf-8').trim();
    if (!raw || raw.length < 2) return NextResponse.json({ status: 'not-started', enhancements: null, count: 0, total: 0 });
    const enhancements = JSON.parse(raw);
    const count = Object.keys(enhancements).length;
    return NextResponse.json({ status: 'done', enhancements, count, total: progress?.total || count });
  } catch {
    return NextResponse.json({ status: 'error', enhancements: null, count: 0, total: 0 });
  }
}
