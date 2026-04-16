# CodeView

Visual architecture companion for AI-powered coding tools — interactive code graph for non-technical product owners.

## Current Phase
**v1 complete.** Feature set: multi-AI providers (Claude, Gemini, Ollama), runtime switching via settings gear, folder picker (native OS dialog + text input + recent projects), conversational AI chat with project-scoped session persistence, phantom-path validator on Overview. Ready for public release. Legacy code detection parked for v2 (STO-1721).

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
- **Providers** — auto-detects claude/gemini CLI + Ollama local models. Runtime switching via settings gear. Per-project preference in `.codeview/settings.json`
- **Ollama** — HTTP provider (`localhost:11434/api/generate`). Purely additive — CLI spawn logic untouched. Best for Explain (token saver). Overview may truncate on small-context models (pre-flight check warns user)

## Capability Lens
- Toggle on Architecture tab switches between layer view and capability view
- **Lens OFF**: standard layer flow (UI → Utils → API → External → Data)
- **Lens ON**: graph redraws with capability-based clusters in a grid layout; left panel shows capability groups with expand/collapse
- Expanding a capability in the left panel highlights its components on the graph (dims non-matching clusters)
- Capabilities stored in `overview.json` alongside features/flows/backend
- Every component must be in at least one capability (AI prompt enforces this)
- Layout engine detects `cap-` prefixed cluster IDs and uses grid arrangement (2-3 columns)

## Data (.codeview/ per project)
- analysis.json, enhancements.json, descriptions.json, overview.json, settings.json (provider preference)

## Palette
UI #4a90a4 | API #5a8a6e | Data #b08d57 | Utils #7c8594 | External #8b7a9e

## Tests: 69 across 5 packages

## Known Issues
- None blocking. Left panel resize handle works but is subtle (6px hit area inside overflow-hidden nav).
- Ollama Overview may truncate on large projects with small-context models — pre-flight check warns user and suggests switching to Claude/Gemini.

## Last Session
**Date:** 2026-04-16
**Who:** Claude session
**What was done:**
- Audit of SchoolSync overview + enhance quality — all 100 components enhanced, zero phantom titles, perfect capability coverage. Found 3 phantom paths invented by AI (gmail-server.ts, prompts.ts, UploadContext.tsx)
- STO-1727: Phantom path validator — `stripPhantomPaths()` in overview route filters invalid componentPaths across features/flows/backend/capabilities, logs dropped paths
- STO-1716: Folder picker — new `POST /api/project` runs analyzer on any folder at runtime. `ProjectPicker` component with native OS folder dialog (osascript on macOS, PowerShell on Windows, zenity on Linux) via new `GET /api/browse`, text input fallback, and recent-projects localStorage. Wired into empty state and settings gear "Change project..." option
- STO-1718/1720: Chat API endpoint with smart context at `POST /api/chat`. Base context: overview summary + features + flows + capabilities + full component index. Dynamic context: detects component/capability mentions, pulls descriptions and graph edges on demand. Token safety check for Ollama. Works with all providers
- STO-1719: Chat UI — floating `MessageCircle` bubble bottom-right (z-250), expandable panel (480×620 default, 720×full-height maximized), markdown rendering with custom `.chat-markdown` styles in globals.css, focused-component hint in header (soft wording), message count badge when closed
- Chat session persistence — `/api/chat/history` GET/POST/DELETE saves to `.codeview/chat-history.json` per project. Debounced auto-save on message change, loads on mount, trash icon clears with confirmation
- README overhaul — new Folder Picker and AI Chat sections, corrected Data & Privacy section (distinguishes CodeView-local vs provider-dependent source code privacy; Ollama is only true offline option)
- All code merged to main, feature branches deleted locally and on remote, 7 Linear tickets closed (STO-1715 through STO-1720, STO-1727)
- Debugged stale `.next` webpack cache causing `[object Event]` runtime error — fix: `rm -rf .next` and restart (gotcha already documented)
**What's next:**
- v1 is complete and ready for public release
- STO-1721 (v2): Legacy code detection + modernization suggestions — prompt engineering project, needs real legacy codebase testing
- Potential polish: chat response streaming, graph-click-to-chat quick action, export chat as markdown
**Branch:** main
**Blockers:** None

## Known Gotchas
- **Dev server shows stale UI after code changes** → Next.js hot reload sometimes fails silently → Kill server, `rm -rf apps/web/.next`, restart
- **Analysis API finds wrong project in dev mode** → `process.cwd()` crawls up to find `.codeview/` → Only reads from `CODEVIEW_PROJECT_DIR` when set, otherwise shows empty state
- **overflow-hidden clips absolutely positioned elements** → Resize handles inside overflow-hidden containers get clipped → Use real div elements (not ::after pseudo-elements) and keep within bounds
- **React Flow node memoization** → ClusterNode must NOT use memo() — React Flow's internal memoization prevents Zustand store changes from triggering re-renders. The GraphCanvas force-touches node data when capability state changes.
