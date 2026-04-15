# CodeView

Visual architecture companion for AI-powered coding tools — interactive code graph for non-technical product owners.

## Current Phase
Feature complete and polished. Ready for public use. Capability lens, multi-AI provider support, clean empty state, and comprehensive README with screenshots.

## Architecture
- `apps/web` — Next.js 15 (4 nav tabs, detail panel, graph, overview, generate panel, help guide)
- `apps/web/src/lib/ai-provider.ts` — Multi-AI provider abstraction (Claude, Gemini, custom)
- `apps/cli` — CLI entry point
- `packages/analyzer` — file scanning, TS parser, framework detectors
- `packages/graph-engine` — graph builder, clustering, labeler, layout (layer + capability grid), snapshots, diff
- `packages/mcp-server` — MCP server with Claude tools
- `packages/prompt-builder` — context assembly
- `packages/watcher` — chokidar file watcher
- `packages/shared` — shared types

## Navigation
1. **Overview** — AI narrative (default landing)
2. **Features** — by business function (from overview data)
3. **Categories** — by technical layer
4. **Architecture** — graph canvas (only tab with graph) + capability lens toggle

## AI (multi-provider, no API keys)
- **Enhance** — batches of 30, all components, titles + layers + summaries
- **Explain** — structured markdown with emoji headings (What It Does, How It Works, Connections, Key Details)
- **Overview** — narrative with features, flows, backend, data types, capabilities
- **Capabilities** — reusable technical patterns (auth, uploads, payments, etc.) identified during Overview generation
- **Providers** — auto-detects claude/gemini CLI, configurable via CODEVIEW_AI_PROVIDER env var

## Capability Lens
- Toggle on Architecture tab switches between layer view and capability view
- **Lens OFF**: standard layer flow (UI → Utils → API → External → Data)
- **Lens ON**: graph redraws with capability-based clusters in a grid layout; left panel shows capability groups with expand/collapse
- Expanding a capability in the left panel highlights its components on the graph (dims non-matching clusters)
- Capabilities stored in `overview.json` alongside features/flows/backend
- Every component must be in at least one capability (AI prompt enforces this)
- Layout engine detects `cap-` prefixed cluster IDs and uses grid arrangement (2-3 columns)

## Data (.codeview/ per project)
- analysis.json, enhancements.json, descriptions.json, overview.json

## Palette
UI #4a90a4 | API #5a8a6e | Data #b08d57 | Utils #7c8594 | External #8b7a9e

## Tests: 69 across 5 packages

## Known Issues
- None blocking. Left panel resize handle works but is subtle (6px hit area inside overflow-hidden nav).

## Last Session
**Date:** 2026-04-15
**Who:** Claude session
**What was done:**
- Removed all demo/dummy data (demo-data/ directory, DEMO_FILES, demo banner, fallback logic)
- Added clean empty state with `npx codeview` instruction when no project loaded
- Added Capability Lens to Architecture tab — toggle switches graph between layer and capability views
- Capability-based clusters use grid layout (2-3 columns) instead of single row
- AI overview prompt extended to generate capabilities (reusable patterns) covering all components
- Capabilities stored in Zustand store, shared across OverviewPanel, FeaturesView, LeftPanel
- Graph canvas force-refreshes when capability state changes (node data touch pattern)
- Fixed expand button on Architecture tab (was hidden because showGraph was always true)
- Fixed description duplication (applyDescriptions was overwriting short summaries with full explanations)
- Added search filtering to Features and Architecture tabs (was only on Categories)
- Added expand/collapse to Architecture left panel layer sections
- Updated Linear with tickets STO-1676 and STO-1677
- Added capability screenshot to README
**What's next:**
- Test with more real projects to verify capability lens and AI provider switching
- Consider publishing as npm package for `npx codeview` usage
- MCP server integration for bidirectional Claude Code communication
- Real-time file watching for live updates
**Branch:** main
**Blockers:** None

## Known Gotchas
- **Dev server shows stale UI after code changes** → Next.js hot reload sometimes fails silently → Kill server, `rm -rf apps/web/.next`, restart
- **Analysis API finds wrong project in dev mode** → `process.cwd()` crawls up to find `.codeview/` → Only reads from `CODEVIEW_PROJECT_DIR` when set, otherwise shows empty state
- **overflow-hidden clips absolutely positioned elements** → Resize handles inside overflow-hidden containers get clipped → Use real div elements (not ::after pseudo-elements) and keep within bounds
- **React Flow node memoization** → ClusterNode must NOT use memo() — React Flow's internal memoization prevents Zustand store changes from triggering re-renders. The GraphCanvas force-touches node data when capability state changes.
