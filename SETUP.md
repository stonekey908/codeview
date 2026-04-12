# CodeView Setup

## Quick Start (Just Run It)

1. Open your terminal
2. Run `cd /path/to/codeview`
3. Run `pnpm install` — wait for it to finish
4. Run `pnpm dev` — you should see "Ready on http://localhost:4200"
5. Open http://localhost:4200 — the app shows a demo architecture graph

## Using CodeView on Your Own Project

1. Open a terminal in any TypeScript/JavaScript project folder
2. Run `npx tsx /path/to/codeview/apps/cli/bin/codeview.mjs .`
3. CodeView scans your project, builds the architecture graph, and opens the browser
4. You should see your project's components organized by layer (UI, API, Data, Utils, External)

### What It Scans
- `.ts`, `.tsx`, `.js`, `.jsx`, `.mts`, `.mjs` files
- Respects your `.gitignore` (skips `node_modules`, `dist`, etc.)

### What It Detects
- **React components** — JSX return, hooks, contexts, forwardRef/memo
- **Next.js** — pages, layouts, API routes (App Router + Pages Router), middleware
- **Database** — Prisma schemas, Drizzle tables, TypeORM entities
- **Utilities** — helpers, config files, service clients

## CLI Options

```
npx codeview [directory] [options]

Options:
  --port <number>   Port for the web server (default: 4200)
  --no-open         Don't open the browser automatically
  -h, --help        Show help
```

## Development

### Every Time You Pull
```
pnpm install
pnpm build
```

### Running Tests
```
pnpm --filter @codeview/analyzer test
pnpm --filter @codeview/graph-engine test
```

### Project Structure
```
apps/
  web/          Next.js 15 visualization app (port 4200)
  cli/          CLI entry point (npx codeview)
packages/
  analyzer/     File scanning + TypeScript parser + framework detectors
  graph-engine/ Graph builder + clustering + labeler + ELK.js layout
  shared/       Shared TypeScript types
  mcp-server/   (Slice 4 — not yet implemented)
  prompt-builder/ (Slice 2 — not yet implemented)
  watcher/      (Slice 3 — not yet implemented)
```

## External Dependencies

**None.** CodeView is fully standalone — no API keys, no database, no cloud services needed. It reads your local filesystem only.
