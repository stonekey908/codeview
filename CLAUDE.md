# CodeView

Visual architecture companion for Claude Code — interactive code graph for non-technical product owners.

## Last Session
**Date:** 2026-04-13
**Status:** Feature complete. Overview, Features, Categories, Architecture views. AI Enhance/Explain/Overview. Muted palette. Resizable panels. Syntax highlighting.

## Architecture
- `apps/web` — Next.js 15 (4 nav tabs, detail panel, graph, overview, generate panel)
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

## AI (claude -p, no API keys)
- **Enhance** — batches of 30, all components, titles + layers + summaries
- **Explain** — deep per-component, markdown rendering
- **Overview** — narrative with features, flows, backend, data types

## Data (.codeview/ per project)
- analysis.json, enhancements.json, descriptions.json, overview.json

## Palette
UI #4a90a4 | API #5a8a6e | Data #b08d57 | Utils #7c8594 | External #8b7a9e

## Tests: 69 across 5 packages
