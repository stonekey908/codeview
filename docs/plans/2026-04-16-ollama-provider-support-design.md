# Ollama Provider Support — Design Document

**Date:** 2026-04-16
**Tickets:** STO-1710, STO-1711, STO-1712, STO-1713

## Problem

CodeView's AI features (Enhance, Overview, Explain) currently require cloud-based CLI tools (Claude Code, Gemini CLI). Users who want to use local models via Ollama — to save tokens or for privacy — have no path to do so. Additionally, there's no way to switch providers at runtime without restarting the server.

## Design Principles

1. **Purely additive** — existing CLI spawn logic for Claude/Gemini is never modified
2. **No silent truncation** — either send the full prompt or tell the user it won't fit
3. **Per-project persistence** — provider choice saved in `.codeview/settings.json`, remembered across sessions
4. **Default behavior unchanged** — without settings, auto-detect picks Claude then Gemini, same as today

## Architecture

### Provider Types

**CLI providers (existing, untouched):**
- Claude Code: `spawn('claude', ['-p', prompt, '--output-format', 'text'])`
- Gemini CLI: `spawn('gemini', ['-p', prompt])`

**HTTP provider (new, additive):**
- Ollama: `fetch('http://localhost:11434/api/generate', { model, prompt, stream: false, options: { temperature: 0.3 } })`

### Execution Path

Each API route (`enhance`, `overview`, `trigger-claude`) gets a simple if/else:

```
if (provider.type === 'http') {
  runViaHttp(provider, prompt, onComplete);
} else {
  // existing spawn code — untouched
  const child = spawn(provider.bin, ...);
}
```

The existing spawn code is not refactored, moved, or abstracted. `runViaHttp` is a single shared utility that calls the Ollama HTTP API and invokes the same `onComplete(output)` callback.

### Settings Resolution Priority

1. `.codeview/settings.json` — project-level user choice
2. `CODEVIEW_AI_PROVIDER` env var — machine-level override
3. Auto-detect: Claude → Gemini (current behavior)

### Settings File

`.codeview/settings.json`:
```json
{
  "provider": "ollama:qwen2.5-coder:7b",
  "batchSize": null
}
```

- `provider: null` or missing = auto-detect
- `batchSize: null` = auto (derived from provider context window)

## API Endpoints

### GET /api/providers

Returns available providers by scanning the machine:
- `which claude`, `which gemini` for CLI tools
- `localhost:11434/api/tags` for Ollama models (2s timeout)
- Context window from `localhost:11434/api/show` per model

Response:
```json
{
  "active": "claude",
  "setting": null,
  "providers": [
    { "id": "claude", "name": "Claude Code", "type": "cli", "available": true, "contextWindow": 200000 },
    { "id": "ollama:qwen2.5-coder:7b", "name": "Ollama — qwen2.5-coder:7b", "type": "http", "available": true, "contextWindow": 131072 }
  ]
}
```

### POST /api/providers

Saves preference: `{ "provider": "ollama:qwen2.5-coder:7b" }` or `{ "provider": null }` to reset.

## Settings Gear UI

Small gear icon in the top bar (right side). Opens a compact popover:

- **Provider dropdown** — populated from GET /api/providers, updates on each open
- **Batch size** — shows auto value (30 for Claude, 5 for small Ollama), overridable
- **Regenerate** — two buttons: "Regenerate All" (clears then re-runs) and "Update New Only" (current merge)

## Token Safety

### Enhance (batchable)
Auto batch size: `Math.floor((contextWindow - promptTemplateTokens) / avgTokensPerComponent)`
- Claude/Gemini: 30 (unchanged)
- Ollama: 5-15 depending on model context window
- Batch of 1 doesn't fit → error with suggestion to use larger model

### Overview (single prompt)
Pre-flight check: `prompt.length / 4` vs 80% of context window.
- Exceeds → block with clear message, suggest larger model or Claude/Gemini
- Fits → proceed normally

### Explain (single file)
Almost always fits. Only warn for extremely large files.

**Rule: never silently drop information.**

## Recommended Ollama Models (16GB M2 MacBook Pro)

| Model | RAM | Context | Best for |
|-------|-----|---------|----------|
| qwen2.5-coder:7b | ~6GB | 128K | Best overall pick |
| llama3.1:8b | ~6GB | 128K | Good general alternative |
| mistral:7b | ~5GB | 32K | Fast, reliable |
| deepseek-coder-v2:16b | ~12GB | 128K | Higher quality, tight fit |

## Implementation Order

1. **STO-1710** — Ollama HTTP execution + provider type (backend foundation)
2. **STO-1711** — Provider detection endpoint + settings.json (blocked by 1710)
3. **STO-1713** — Token safety + adaptive batching (blocked by 1710)
4. **STO-1712** — Settings gear UI (blocked by 1711)

## What Does NOT Change

- All existing CLI spawn logic
- Auto-detect behavior when no settings exist
- Prompt templates
- `.codeview/*.json` data formats
- Every existing UI component
