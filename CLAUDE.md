# CodeView

Visual architecture companion for Claude Code — interactive code graph for non-technical product owners.

## Last Session
**Date:** 2026-04-12
**Status:** Feature complete. All Linear tickets done. Ready for public release prep.

## Tech Stack
- pnpm + Turborepo monorepo
- Next.js 15 (App Router) on port 4200
- React Flow (@xyflow/react) for canvas
- Tailwind CSS v4, Zustand, Radix UI
- MCP SDK for Claude Code integration
- TypeScript Compiler API for code analysis
- chokidar for file watching

## Key Architecture
- `apps/web` — Next.js frontend (canvas, detail panel, toolbar, generate panel)
- `apps/cli` — CLI entry point (`npx codeview`)
- `packages/analyzer` — file scanning, TS parser, framework detectors
- `packages/graph-engine` — graph builder, clustering, labeler, layout
- `packages/mcp-server` — MCP server with Claude integration tools
- `packages/prompt-builder` — context assembly for prompts
- `packages/watcher` — chokidar file watcher
- `packages/shared` — shared types

## Claude Integration
- `claude -p` spawned from Next.js API routes (no separate API keys)
- Descriptions cached in `.codeview/descriptions.json`
- MCP tools: get_architecture_overview, get_component_details, get_dependencies, trace_flow, etc.

## Tests
69 tests across 5 packages (analyzer: 25, graph-engine: 29, prompt-builder: 6, watcher: 5, mcp-server: 4)

## Linear
Project: CodeView (Stonekey team) — all tickets Done
