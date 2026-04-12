# CodeView

Visual architecture companion for Claude Code — interactive code graph for non-technical product owners.

## Automate State
**Status:** In Progress
**Phase:** 2 of 7 (Implementation)
**Tickets:** STO-1639 (parent) + STO-1645 through STO-1656 (12 sub-tickets)
**Branch:** feat/automate-STO-1639-slice-1
**Completed:**
  - Phase 1: Pre-flight ✓
  - Phase 2: Implementation — 1/12 tickets done (STO-1645 scaffolding ✓)
**Next action:** Implement STO-1646 (Tree-sitter TypeScript/JavaScript parser)
**Pending decisions:** 0
**Hard stops:** 0

## Implementation Order
1. ~~STO-1645 — Scaffolding~~ ✓
2. STO-1646 — Tree-sitter parser (next)
3. STO-1647 — Framework detectors
4. STO-1648 — Graph engine (builder + clustering)
5. STO-1649 — ELK.js layout
6. STO-1650 — React Flow canvas
7. STO-1651 — Semantic zoom
8. STO-1652 — Component detail sidebar
9. STO-1653 — CLI entry point
10. STO-1654 — First-run onboarding
11. STO-1655 — Descriptive mode
12. STO-1656 — Keyboard navigation

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

## Linear
- Project: CodeView (Stonekey team)
- Plan: `.claude/plans/tranquil-knitting-planet.md`
