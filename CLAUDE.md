# CodeView

Visual architecture companion for Claude Code — interactive code graph for non-technical product owners.

## Last Session
**Date:** 2026-04-12
**What was done:** All 5 slices complete. Full implementation from concept to working product.
**Branch:** main (all merged)
**Tests:** 69 passing across 5 packages
**Status:** MVP complete — ready for real-world testing

## Completed Slices
1. **Slice 1 (STO-1639):** Analyze + Visualize — CLI, parser, detectors, graph engine, layout, React Flow UI, onboarding, search, keyboard shortcuts
2. **Slice 2 (STO-1640):** Component Selection + Prompting — prompt builder, preview panel, clipboard copy
3. **Slice 3 (STO-1641):** Real-Time Updates — chokidar watcher, debounced batching, Claude Code hooks
4. **Slice 4 (STO-1642):** MCP Server — 6 tools, stdio transport, Claude Code integration
5. **Slice 5 (STO-1643):** Architecture Timeline — snapshots, diff engine

## Design
- Mockup: `design/mockup.html` (source of truth for all visual decisions)
- Palette: shadcn zinc (#09090B → #FAFAFA)
- Layer colors: blue (UI), green (API), amber (Data), zinc (Utils), purple (External)
- Fonts: Instrument Sans (display), DM Sans (body), JetBrains Mono (code)

## Tech Stack
- pnpm + Turborepo monorepo
- Next.js 15 (App Router) on port 4200
- React Flow (@xyflow/react) for canvas
- Tailwind CSS v4
- Zustand for state
- Radix UI primitives
- MCP SDK for Claude Code integration
- chokidar for file watching

## Linear
- Project: CodeView (Stonekey team)
- All slice tickets: Done
