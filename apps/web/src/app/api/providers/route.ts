import { NextRequest, NextResponse } from 'next/server';
import {
  detectCliProviders,
  detectOllamaModels,
  readSettings,
  writeSettings,
  resolveProviderWithSettings,
} from '@/lib/ai-provider';

// GET — detect available providers and return current selection
export async function GET() {
  const projectDir = process.env.CODEVIEW_PROJECT_DIR || process.cwd();
  const settings = readSettings(projectDir);

  // Detect CLI providers and Ollama models in parallel
  const [cliProviders, ollamaProviders] = await Promise.all([
    Promise.resolve(detectCliProviders()),
    detectOllamaModels(),
  ]);

  const providers = [...cliProviders, ...ollamaProviders];

  // Determine which provider is currently active
  const active = resolveProviderWithSettings(projectDir);
  let activeId: string | null = null;
  if (active) {
    if (active.type === 'http' && active.model) {
      activeId = `ollama:${active.model}`;
    } else {
      // Match by name to find the CLI provider id
      const match = cliProviders.find(p => active.name.toLowerCase().includes(p.id));
      activeId = match?.id ?? null;
    }
  }

  return NextResponse.json({
    active: activeId,
    setting: settings.provider ?? null,
    batchSize: settings.batchSize ?? null,
    providers,
  });
}

// POST — save provider preference
export async function POST(request: NextRequest) {
  const projectDir = process.env.CODEVIEW_PROJECT_DIR || process.cwd();
  const body = await request.json();
  const settings = readSettings(projectDir);

  if ('provider' in body) {
    settings.provider = body.provider ?? null;
  }
  if ('batchSize' in body) {
    settings.batchSize = body.batchSize ?? null;
  }

  writeSettings(projectDir, settings);

  return NextResponse.json({ ok: true, settings });
}
