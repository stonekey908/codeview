# CodeView

Visual architecture companion for Claude Code — interactive code graph for non-technical product owners.

## Last Session
**Date:** 2026-04-12
**What was done:** Slice 1 (STO-1639) complete — all 12 sub-tickets implemented. Full pipeline working: CLI → analyzer → graph → layout → React Flow UI with onboarding, search, keyboard shortcuts, descriptive mode.
**Branch:** feat/automate-STO-1639-slice-1 (ready for merge to main)
**Tests:** 48 passing (25 analyzer, 23 graph-engine)
**Next steps:** Merge to main, then start Slice 2 (STO-1640 — component selection + prompt builder)

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
