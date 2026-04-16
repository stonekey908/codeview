/**
 * AI Provider abstraction — resolves which AI CLI to use for CodeView's
 * Enhance, Explain, and Overview features.
 *
 * Priority:
 *   1. CODEVIEW_AI_PROVIDER env var ("claude" | "gemini" | "copilot" | "aider" | custom path)
 *   2. Auto-detect: tries claude, gemini, gh copilot in order
 *
 * Each provider returns { bin, args(prompt), name }.
 *
 * Ollama support: HTTP-based provider that calls localhost:11434/api/generate.
 * Purely additive — CLI providers are unchanged.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';

export interface AIProvider {
  name: string;
  type: 'cli' | 'http';
  bin: string;
  buildArgs: (prompt: string) => string[];
  env?: Record<string, string>;
  /** Ollama model name, e.g. "qwen2.5-coder:7b" */
  model?: string;
  /** Context window in tokens — used for batch sizing in later tickets */
  contextWindow?: number;
}

const PROVIDERS: Record<string, (bin: string) => AIProvider> = {
  claude: (bin) => ({
    name: 'Claude Code',
    type: 'cli',
    bin,
    buildArgs: (prompt) => ['-p', prompt, '--output-format', 'text'],
  }),
  gemini: (bin) => ({
    name: 'Gemini CLI',
    type: 'cli',
    bin,
    buildArgs: (prompt) => ['-p', prompt],
  }),
  copilot: (bin) => ({
    name: 'GitHub Copilot',
    type: 'cli',
    bin,
    // gh copilot suggest doesn't have a clean non-interactive mode yet,
    // so this is a placeholder for when it does
    buildArgs: (prompt) => ['copilot', 'suggest', '-t', 'shell', prompt],
  }),
  aider: (bin) => ({
    name: 'Aider',
    type: 'cli',
    bin,
    buildArgs: (prompt) => ['--message', prompt, '--yes', '--no-git'],
  }),
};

/** Find the full path of a CLI binary */
function which(cmd: string): string | null {
  try {
    return execSync(`which ${cmd}`, { encoding: 'utf-8', timeout: 5000 }).trim();
  } catch {
    return null;
  }
}

/** Try common install locations for a binary */
function findInPaths(name: string): string | null {
  const home = process.env.HOME || '';
  const candidates = [
    `/usr/local/bin/${name}`,
    `/opt/homebrew/bin/${name}`,
    `${home}/.local/bin/${name}`,
    `${home}/.nvm/versions/node/v20.15.0/bin/${name}`,
  ];
  for (const c of candidates) {
    try { fs.accessSync(c); return c; } catch {}
  }
  return null;
}

/** Resolve the AI provider to use */
export function resolveProvider(): AIProvider | null {
  const explicit = process.env.CODEVIEW_AI_PROVIDER;

  // 1. Explicit provider name
  if (explicit && PROVIDERS[explicit]) {
    const bin = which(explicit) || findInPaths(explicit);
    if (bin) return PROVIDERS[explicit](bin);
  }

  // 2. Explicit custom binary path
  if (explicit && explicit.startsWith('/')) {
    try {
      fs.accessSync(explicit);
      // Treat as claude-compatible (accepts -p)
      return {
        name: 'Custom AI',
        type: 'cli',
        bin: explicit,
        buildArgs: (prompt) => ['-p', prompt],
      };
    } catch {}
  }

  // 3. Auto-detect in preference order
  const autoOrder: [string, string][] = [
    ['claude', 'claude'],
    ['gemini', 'gemini'],
  ];

  for (const [name, cmd] of autoOrder) {
    const bin = which(cmd) || findInPaths(cmd);
    if (bin) return PROVIDERS[name](bin);
  }

  return null;
}

/** Get provider or throw a user-friendly error */
export function requireProvider(): AIProvider {
  const provider = resolveProvider();
  if (!provider) {
    throw new Error(
      'No AI CLI found. Install one of: Claude Code (claude), Gemini CLI (gemini). ' +
      'Or set CODEVIEW_AI_PROVIDER=/path/to/your/cli'
    );
  }
  return provider;
}

// ---------------------------------------------------------------------------
// Settings-aware provider resolution — checks .codeview/settings.json first,
// then falls through to existing resolveProvider() (env var → auto-detect)
// ---------------------------------------------------------------------------

export interface ProviderSettings {
  provider?: string | null;
  batchSize?: number | null;
}

/** Read .codeview/settings.json for the given project dir */
export function readSettings(projectDir: string): ProviderSettings {
  const settingsPath = require('path').join(projectDir, '.codeview', 'settings.json');
  try {
    if (fs.existsSync(settingsPath)) {
      return JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    }
  } catch {}
  return {};
}

/** Write .codeview/settings.json for the given project dir */
export function writeSettings(projectDir: string, settings: ProviderSettings): void {
  const dir = require('path').join(projectDir, '.codeview');
  fs.mkdirSync(dir, { recursive: true });
  const settingsPath = require('path').join(dir, 'settings.json');
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
}

/**
 * Resolve provider with settings awareness.
 * Priority: settings.json → env var → auto-detect (existing behavior)
 */
export function resolveProviderWithSettings(projectDir: string): AIProvider | null {
  const settings = readSettings(projectDir);

  // If settings specify a provider, use it
  if (settings.provider) {
    // Ollama model (e.g. "ollama:qwen2.5-coder:7b")
    if (settings.provider.startsWith('ollama:')) {
      const model = settings.provider.slice('ollama:'.length);
      return createOllamaProvider(model);
    }
    // CLI provider name (e.g. "claude", "gemini")
    if (PROVIDERS[settings.provider]) {
      const bin = which(settings.provider) || findInPaths(settings.provider);
      if (bin) return PROVIDERS[settings.provider](bin);
    }
  }

  // Fall through to existing resolution (env var → auto-detect)
  return resolveProvider();
}

// ---------------------------------------------------------------------------
// Ollama HTTP provider — purely additive, does not touch CLI providers above
// ---------------------------------------------------------------------------

const OLLAMA_BASE = 'http://localhost:11434';

/** Create an Ollama provider for a specific model */
export function createOllamaProvider(model: string, contextWindow?: number): AIProvider {
  return {
    name: `Ollama — ${model}`,
    type: 'http',
    bin: '', // not used for HTTP providers
    model,
    contextWindow: contextWindow ?? 131072,
    buildArgs: () => [], // not used for HTTP providers
  };
}

/**
 * Run a prompt via Ollama's HTTP API.
 * Calls onComplete(output) when done — same callback pattern the CLI spawn uses.
 */
export function runViaHttp(
  provider: AIProvider,
  prompt: string,
  onComplete: (output: string, code: number) => void,
): void {
  const model = provider.model;
  if (!model) {
    console.error('[ollama] No model specified on provider');
    onComplete('', 1);
    return;
  }

  console.log(`[ollama] Sending prompt to ${model} (${prompt.length} chars)`);

  fetch(`${OLLAMA_BASE}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
      options: { temperature: 0.3 },
    }),
  })
    .then((res) => {
      if (!res.ok) {
        throw new Error(`Ollama responded with ${res.status}: ${res.statusText}`);
      }
      return res.json();
    })
    .then((data: { response?: string }) => {
      const output = data.response ?? '';
      console.log(`[ollama] Got response from ${model} (${output.length} chars)`);
      onComplete(output, 0);
    })
    .catch((err: Error) => {
      console.error(`[ollama] Error: ${err.message}`);
      onComplete('', 1);
    });
}

// ---------------------------------------------------------------------------
// Provider detection — used by GET /api/providers
// ---------------------------------------------------------------------------

export interface DetectedProvider {
  id: string;
  name: string;
  type: 'cli' | 'http';
  available: boolean;
  contextWindow: number;
}

/** Detect all available CLI providers */
export function detectCliProviders(): DetectedProvider[] {
  const cliChecks: { id: string; name: string; cmd: string; contextWindow: number }[] = [
    { id: 'claude', name: 'Claude Code', cmd: 'claude', contextWindow: 200000 },
    { id: 'gemini', name: 'Gemini CLI', cmd: 'gemini', contextWindow: 1000000 },
  ];

  return cliChecks.map(({ id, name, cmd, contextWindow }) => {
    const bin = which(cmd) || findInPaths(cmd);
    return { id, name, type: 'cli' as const, available: !!bin, contextWindow };
  });
}

/** Detect available Ollama models (returns empty array if Ollama isn't running) */
export async function detectOllamaModels(): Promise<DetectedProvider[]> {
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`, {
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) return [];

    const data = await res.json() as { models?: { name: string; details?: { parameter_size?: string } }[] };
    if (!data.models?.length) return [];

    // Fetch context window for each model
    const providers: DetectedProvider[] = [];
    for (const model of data.models) {
      let contextWindow = 131072; // default assumption
      try {
        const showRes = await fetch(`${OLLAMA_BASE}/api/show`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: model.name }),
          signal: AbortSignal.timeout(2000),
        });
        if (showRes.ok) {
          const showData = await showRes.json() as { model_info?: Record<string, unknown> };
          const ctxKey = Object.keys(showData.model_info ?? {}).find(k => k.includes('context_length'));
          if (ctxKey && showData.model_info) {
            contextWindow = Number(showData.model_info[ctxKey]) || contextWindow;
          }
        }
      } catch {}

      providers.push({
        id: `ollama:${model.name}`,
        name: `Ollama — ${model.name}`,
        type: 'http',
        available: true,
        contextWindow,
      });
    }

    return providers;
  } catch {
    return [];
  }
}
