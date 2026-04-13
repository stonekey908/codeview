# CodeView

Visual architecture companion for AI-powered coding tools — interactive code graph for non-technical product owners.

## Current Phase
Feature complete and polished. Ready for public use. All UX audit issues resolved, multi-AI provider support, comprehensive demo mode, help guide, and clean README with AI-friendly install prompts.

## Architecture
- `apps/web` — Next.js 15 (4 nav tabs, detail panel, graph, overview, generate panel, help guide)
- `apps/web/demo-data/` — Pre-generated demo data (enhancements, descriptions, overview) for Taskflow demo
- `apps/web/src/lib/ai-provider.ts` — Multi-AI provider abstraction (Claude, Gemini, custom)
- `apps/cli` — CLI entry point
- `packages/analyzer` — file scanning, TS parser, framework detectors
- `packages/graph-engine` — graph builder, clustering, labeler, layout, snapshots, diff
- `packages/mcp-server` — MCP server with Claude tools
- `packages/prompt-builder` — context assembly
- `packages/watcher` — chokidar file watcher
- `packages/shared` — shared types

## Navigation
1. **Overview** — AI narrative (default landing)
2. **Features** — by business function (from overview data)
3. **Categories** — by technical layer
4. **Architecture** — graph canvas (only tab with graph)

## AI (multi-provider, no API keys)
- **Enhance** — batches of 30, all components, titles + layers + summaries
- **Explain** — structured markdown with emoji headings (What It Does, How It Works, Connections, Key Details)
- **Overview** — narrative with features, flows, backend, data types
- **Providers** — auto-detects claude/gemini CLI, configurable via CODEVIEW_AI_PROVIDER env var

## Data (.codeview/ per project)
- analysis.json, enhancements.json, descriptions.json, overview.json

## Palette
UI #4a90a4 | API #5a8a6e | Data #b08d57 | Utils #7c8594 | External #8b7a9e

## Tests: 69 across 5 packages

## Known Issues
- None blocking. Left panel resize handle works but is subtle (6px hit area inside overflow-hidden nav).

## Last Session
**Date:** 2026-04-13
**Who:** Claude session
**What was done:**
- Fixed all 50 UX audit issues (Critical, High, Medium, Low)
- Fixed panel leak when switching from Architecture slide-out to Overview
- Added multi-AI provider support (Claude Code, Gemini CLI, custom binary)
- Replaced all Claude-specific UI messaging with generic "Analysing..."
- Built rich 33-component Taskflow demo with pre-generated enhancements, descriptions, and overview
- Added demo mode banner with CLI instructions
- Added in-app Help Guide (? button in toolbar)
- Rewrote README with AI-friendly install prompts, multi-provider docs, troubleshooting
- Improved Explain output: structured markdown with emoji headings, no "Insight" appendix
- Removed redundant Explain button from component cards
- Fixed Overview drilldown to navigate to Features tab (not Categories)
- Auto-expand feature groups and clusters when selecting components
- Added ARIA roles, focus-visible outlines, semantic CSS classes throughout
- Replaced hardcoded colors with semantic CSS variables
- Fixed search palette (20 results, semantic classes), GeneratePanel stale closure
- Consistent Lucide chevron icons for expand/collapse
**What's next:**
- Test with more real projects to verify AI provider switching
- Consider publishing as npm package for `npx codeview` usage
- MCP server integration (Slice 4) for bidirectional Claude Code communication
- Real-time file watching (Slice 3) for live updates
**Branch:** main
**Blockers:** None

## Known Gotchas
- **Dev server shows stale UI after code changes** → Next.js hot reload sometimes fails silently → Kill server, `rm -rf apps/web/.next`, restart
- **Analysis API finds wrong project in dev mode** → `process.cwd()` crawls up to find `.codeview/` → Only reads from `CODEVIEW_PROJECT_DIR` when set, otherwise serves demo data
- **overflow-hidden clips absolutely positioned elements** → Resize handles inside overflow-hidden containers get clipped → Use real div elements (not ::after pseudo-elements) and keep within bounds
