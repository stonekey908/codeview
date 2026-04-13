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
  prompt += 'RULES FOR TITLE:\n';
  prompt += '- Short, clear, descriptive. "Daily Summary Scheduler" not "Daily Summary". "Firebase Push Notifications" not "Fcm Helper".\n';
  prompt += '- Never just repeat the filename. Give it a name a product owner would understand.\n\n';
  prompt += 'RULES FOR SUMMARY:\n';
  prompt += '- Explain what it DOES for the app. "Sends parents a morning email summarizing their childrens upcoming events and tasks" not "Cloud function for daily summaries".\n';
  prompt += '- Write for someone who cannot read code. Be specific about WHAT it does, not vague.\n\n';
  prompt += 'RULES FOR LAYER (be precise — this matters):\n';
  prompt += '- "ui" = screens, pages, modals, buttons, visual components users see. Includes React hooks that serve UI (useXxx).\n';
  prompt += '- "api" = backend API endpoints, route handlers (route.ts, API controllers)\n';
  prompt += '- "data" = static data files, constants, prompt templates, colour palettes, type definitions, config objects, seed data. If it STORES information that other code reads, it is data.\n';
  prompt += '- "utils" = pure helper functions with no side effects: formatting, validation, string manipulation, date math. ONLY things that transform input to output.\n';
  prompt += '- "external" = anything that talks to an external service or runs as a separate process: Cloud Functions, Firebase, Gemini API calls, push notifications, email sending, payment processing, encryption. If it makes network calls or runs server-side, it is external.\n\n';
  prompt += 'COMMON MISTAKES TO AVOID:\n';
  prompt += '- Cloud functions (functions/src/*) are EXTERNAL not utils — they run on a server\n';
  prompt += '- Prompt templates and constants are DATA not utils — they store information\n';
  prompt += '- React hooks (useXxx) are UI not utils — they serve components\n';
  prompt += '- Encryption/crypto utilities that call external APIs are EXTERNAL not utils\n';
  prompt += '- Index/barrel files that just re-export are UTILS\n\n';
  prompt += 'SPECIAL RULE FOR UTILS:\n';
  prompt += 'Utility files are the hardest to understand from a glance. For these, your summary must explain WHAT the functions actually do, not just say "helper functions". Example:\n';
  prompt += '- BAD: "Utility functions for the app"\n';
  prompt += '- BAD: "Helper functions used across the app"\n';
  prompt += '- GOOD: "Formats dates into human-readable strings, converts currency amounts, and truncates long text with ellipsis"\n';
  prompt += '- GOOD: "Encrypts sensitive data before storing it and decrypts it when retrieved, using AES-256 encryption"\n\n';

  for (const node of components.slice(0, 80)) {
    const filePath = path.join(projectDir, node.relativePath);
    let preview = '';
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        // Tiered context: UI needs less, utils/lib need more to understand
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

  // Spawn claude
  const descDir = path.join(projectDir, '.codeview');
  fs.mkdirSync(descDir, { recursive: true });
  const enhancePath = path.join(descDir, 'enhancements.json');

  // Write progress file
  const progressPath = path.join(descDir, 'enhance-progress.json');
  fs.writeFileSync(progressPath, JSON.stringify({ status: 'running', total: components.length, done: 0, started: new Date().toISOString() }));

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
    if (code !== 0 || !output.trim()) {
      fs.writeFileSync(progressPath, JSON.stringify({ status: 'error', total: components.length, done: 0 }));
      return;
    }

    try {
      const jsonMatch = output.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const enhancements = JSON.parse(jsonMatch[0]);
        fs.writeFileSync(enhancePath, JSON.stringify(enhancements, null, 2));
        const done = Object.keys(enhancements).length;
        console.log(`[enhance] Saved ${done} enhancements`);

        // Enhancements stay separate from descriptions
        // enhancements.json = titles, layers, short summaries (from Enhance)
        // descriptions.json = deep explanations only (from Describe / Ask Claude)
        fs.writeFileSync(progressPath, JSON.stringify({ status: 'done', total: components.length, done }));
      }
    } catch (err) {
      console.error(`[enhance] Parse error: ${err}`);
      fs.writeFileSync(progressPath, JSON.stringify({ status: 'error', total: components.length, done: 0 }));
    }
  });

  return NextResponse.json({
    status: 'started',
    total: components.length,
  });
}

// Check for enhancement progress and results
export async function GET() {
  const projectDir = process.env.CODEVIEW_PROJECT_DIR || process.cwd();
  const dir = path.join(projectDir, '.codeview');
  const enhancePath = path.join(dir, 'enhancements.json');
  const progressPath = path.join(dir, 'enhance-progress.json');

  // Check progress first
  let progress = null;
  try {
    if (fs.existsSync(progressPath)) {
      progress = JSON.parse(fs.readFileSync(progressPath, 'utf-8'));
    }
  } catch {}

  // If running, return progress
  if (progress?.status === 'running') {
    return NextResponse.json({ status: 'running', total: progress.total, done: 0 });
  }

  // Check for completed enhancements
  if (!fs.existsSync(enhancePath)) {
    return NextResponse.json({ status: 'not-started', enhancements: null, count: 0, total: 0 });
  }

  try {
    const enhancements = JSON.parse(fs.readFileSync(enhancePath, 'utf-8'));
    const count = Object.keys(enhancements).length;
    return NextResponse.json({ status: 'done', enhancements, count, total: progress?.total || count });
  } catch {
    return NextResponse.json({ status: 'error', enhancements: null, count: 0, total: 0 });
  }
}
