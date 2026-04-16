import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { resolveProviderWithSettings, runViaHttp } from '@/lib/ai-provider';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  message: string;
  history?: ChatMessage[];
  focusedPath?: string | null;
}

export async function POST(request: NextRequest) {
  const body: ChatRequest = await request.json();
  const { message, history = [], focusedPath } = body;

  if (!message?.trim()) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 });
  }

  const projectDir = process.env.CODEVIEW_PROJECT_DIR || process.cwd();
  const provider = resolveProviderWithSettings(projectDir);

  if (!provider) {
    return NextResponse.json({
      error: 'No AI provider available. Install Claude Code, Gemini CLI, or Ollama.',
    }, { status: 500 });
  }

  // Load codebase context
  const dataDir = path.join(projectDir, '.codeview');
  const overview = readJson(path.join(dataDir, 'overview.json'));
  const enhancements: Record<string, { title?: string; layer?: string; summary?: string }> =
    readJson(path.join(dataDir, 'enhancements.json')) ?? {};
  const descriptions: Record<string, string> = readJson(path.join(dataDir, 'descriptions.json')) ?? {};
  const analysis = readJson(path.join(dataDir, 'analysis.json'));

  if (!overview && !enhancements) {
    return NextResponse.json({
      error: 'No codebase context available. Run Enhance and Overview first.',
    }, { status: 400 });
  }

  // Assemble context
  const basePrompt = buildSystemPrompt(overview, enhancements);
  const dynamicContext = buildDynamicContext(message, focusedPath, enhancements, descriptions, analysis, overview);
  const historyText = buildHistoryText(history);

  const focusHint = focusedPath
    ? `\n\n## Currently Viewing\nThe user is looking at \`${focusedPath}\` in the graph. This is just a hint — only use it if the question is ambiguous (e.g. "this", "it", "explain this"). Otherwise, answer the literal question they asked.`
    : '';

  const fullPrompt = [
    basePrompt,
    focusHint,
    dynamicContext,
    historyText,
    `\nUser: ${message}\n\nAssistant:`,
  ].filter(Boolean).join('\n\n');

  // Token safety for small-context providers
  if (provider.type === 'http' && provider.contextWindow) {
    const estimatedTokens = Math.ceil(fullPrompt.length / 4);
    const limit = Math.floor(provider.contextWindow * 0.85);
    if (estimatedTokens > limit) {
      return NextResponse.json({
        error: `Conversation context is too large for ${provider.name} (~${estimatedTokens.toLocaleString()} tokens vs ${provider.contextWindow.toLocaleString()} window). Try clearing the chat, switching to Claude/Gemini, or using a larger Ollama model.`,
      }, { status: 400 });
    }
  }

  console.log(`[chat] ${provider.name} — prompt ${fullPrompt.length} chars`);

  return new Promise<Response>((resolve) => {
    const done = (reply: string, status = 200) => {
      resolve(NextResponse.json({ reply, provider: provider.name }, { status }));
    };

    if (provider.type === 'http') {
      runViaHttp(provider, fullPrompt, (output, code) => {
        if (code !== 0 || !output.trim()) {
          resolve(NextResponse.json({ error: 'AI did not respond' }, { status: 500 }));
          return;
        }
        done(output.trim());
      });
    } else {
      let output = '';
      const child = spawn(provider.bin, provider.buildArgs(fullPrompt), {
        cwd: projectDir,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, ...provider.env, PATH: process.env.PATH + ':/usr/local/bin:/opt/homebrew/bin' },
      });
      child.stdout?.on('data', (d: Buffer) => { output += d.toString(); });
      child.stderr?.on('data', (d: Buffer) => { console.error(`[chat-err] ${d.toString().slice(0, 200)}`); });
      child.on('close', (code: number | null) => {
        if (code !== 0 || !output.trim()) {
          resolve(NextResponse.json({ error: 'AI did not respond' }, { status: 500 }));
          return;
        }
        done(output.trim());
      });
      child.on('error', (err: Error) => {
        resolve(NextResponse.json({ error: err.message }, { status: 500 }));
      });
    }
  });
}

function readJson(filePath: string): any | null {
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8').trim();
      if (raw.length < 2) return null;
      return JSON.parse(raw);
    }
  } catch {}
  return null;
}

function buildSystemPrompt(overview: any, enhancements: Record<string, any>): string {
  const appName = overview?.appName || 'this project';
  let prompt = `You are a helpful assistant embedded inside CodeView — a visual architecture tool. You answer questions about the user's codebase (${appName}) in plain English, for a non-technical product owner.

Response style:
- Use markdown formatting: **bold** for emphasis, bullet lists for multiple items, \`code\` for file paths and component names.
- Short headings (## or ###) are fine when the answer has multiple distinct sections. Skip them for simple one-paragraph answers.
- Feel free to use relevant emojis sparingly in headings (📄 🔐 🤖 ✅) — matches the app's visual style.
- Keep answers focused — 2-4 short paragraphs or a short bulleted list. Don't pad.
- When referring to a file or component, wrap its exact path in backticks: \`path/to/file.tsx\`.

Content rules:
- Base every answer on the project data below. Don't invent files, features, or technical details that aren't in the context.
- If the question is outside the scope of this codebase, say so briefly.
- If you don't have enough context to answer confidently, say so rather than guessing.

## Project Overview
${overview?.summary ?? '(no overview generated yet)'}
`;

  if (overview?.features?.length) {
    prompt += `\n### Features\n`;
    for (const f of overview.features) {
      prompt += `- **${f.title}** — ${f.description}\n`;
    }
  }

  if (overview?.flows?.length) {
    prompt += `\n### Flows\n`;
    for (const flow of overview.flows) {
      prompt += `- **${flow.title}** — ${flow.description}\n`;
    }
  }

  if (overview?.capabilities?.length) {
    prompt += `\n### Capabilities\n`;
    for (const c of overview.capabilities) {
      prompt += `- **${c.title}** — ${c.description}\n`;
    }
  }

  const entries = Object.entries(enhancements);
  if (entries.length > 0) {
    prompt += `\n## Component Index (${entries.length})\n`;
    for (const [p, e] of entries) {
      prompt += `- \`${p}\` [${e.layer ?? '?'}] ${e.title ?? ''}: ${e.summary ?? ''}\n`;
    }
  }

  return prompt;
}

function buildDynamicContext(
  message: string,
  focusedPath: string | null | undefined,
  enhancements: Record<string, any>,
  descriptions: Record<string, string>,
  analysis: any,
  overview: any,
): string {
  const msg = message.toLowerCase();
  const matchedPaths = new Set<string>();
  const matchedCapabilities = new Set<string>();

  // Focused path (from graph selection) always gets included
  if (focusedPath) matchedPaths.add(focusedPath);

  // Match on component titles + file paths
  for (const [p, e] of Object.entries(enhancements)) {
    const title = (e as any).title?.toLowerCase?.() ?? '';
    const filename = p.split('/').pop()?.toLowerCase() ?? '';
    if (title && title.length > 3 && msg.includes(title)) matchedPaths.add(p);
    if (filename && filename.length > 4 && msg.includes(filename.replace(/\.(ts|tsx|js|jsx)$/, ''))) matchedPaths.add(p);
  }

  // Match on capability titles — pull in all components of that capability
  if (overview?.capabilities) {
    for (const cap of overview.capabilities) {
      const title = cap.title?.toLowerCase() ?? '';
      if (title && msg.includes(title.toLowerCase())) {
        matchedCapabilities.add(cap.title);
        for (const p of cap.componentPaths ?? []) matchedPaths.add(p);
      }
    }
  }

  if (matchedPaths.size === 0) return '';

  let context = `\n## Relevant Details\n`;

  // Include descriptions when available
  let tokenBudget = 8000 * 4; // ~8K tokens in chars
  const pathsArray = Array.from(matchedPaths);
  for (const p of pathsArray) {
    if (tokenBudget <= 0) break;
    const desc = descriptions[p];
    const enh = enhancements[p];
    if (desc) {
      const snippet = desc.length > 1200 ? desc.slice(0, 1200) + '...' : desc;
      context += `\n### \`${p}\`\n${snippet}\n`;
      tokenBudget -= snippet.length;
    } else if (enh) {
      context += `\n### \`${p}\`\n${(enh as any).summary ?? '(no summary)'}\n`;
      tokenBudget -= 200;
    }
  }

  // Include graph edges for focused path or matched components
  if (analysis?.graph && (focusedPath || matchedPaths.size <= 5)) {
    const nodesById = new Map<string, any>();
    for (const n of analysis.graph.nodes ?? []) nodesById.set(n.id, n);
    const idsByPath = new Map<string, string>();
    for (const n of analysis.graph.nodes ?? []) idsByPath.set(n.relativePath, n.id);

    const edges: string[] = [];
    for (const p of pathsArray.slice(0, 5)) {
      const nodeId = idsByPath.get(p);
      if (!nodeId) continue;
      const incoming = (analysis.graph.edges ?? []).filter((e: any) => e.target === nodeId).slice(0, 10);
      const outgoing = (analysis.graph.edges ?? []).filter((e: any) => e.source === nodeId).slice(0, 10);
      if (incoming.length || outgoing.length) {
        edges.push(`\n**Connections for \`${p}\`:**`);
        for (const e of outgoing) {
          const tgt = nodesById.get(e.target);
          if (tgt) edges.push(`- imports \`${tgt.relativePath}\``);
        }
        for (const e of incoming) {
          const src = nodesById.get(e.source);
          if (src) edges.push(`- used by \`${src.relativePath}\``);
        }
      }
    }
    if (edges.length) context += '\n' + edges.join('\n') + '\n';
  }

  return context;
}

function buildHistoryText(history: ChatMessage[]): string {
  // Keep last 6 exchanges (12 messages) to stay within budget
  const recent = history.slice(-12);
  if (recent.length === 0) return '';
  let text = '\n## Conversation so far\n';
  for (const m of recent) {
    text += `\n${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}\n`;
  }
  return text;
}
