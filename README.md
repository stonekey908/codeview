# CodeView

**Visual architecture companion for Claude Code** — see your codebase as an interactive graph, ask AI to explain any component in plain English.

![CodeView](https://img.shields.io/badge/status-beta-purple) ![Tests](https://img.shields.io/badge/tests-69%20passing-green) ![License](https://img.shields.io/badge/license-MIT-blue)

## What It Does

CodeView scans any TypeScript/JavaScript project and visualizes it as an interactive architecture map. Non-technical product owners can understand what's being built without reading code.

- **Overview** — auto-generated narrative explaining what the app does, key features, data flows, and backend services
- **Features view** — components grouped by business function (Document Upload, Calendar, AI Chat) across all layers
- **Architecture view** — interactive graph showing how layers connect with straight-line edges
- **Explain** — click any component and AI reads the actual source code, then explains what it does
- **No API keys needed** — uses your existing Claude Code installation
- **Works on any project** — point it at any folder, scans in seconds

## Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/stonekey908/codeview.git
cd codeview

# 2. Install dependencies
pnpm install

# 3. Point it at your project
npx tsx apps/cli/bin/codeview.mjs /path/to/your/project

# Opens http://localhost:4200 with your architecture
```

## Navigation

CodeView has four views, accessible via tabs in the left panel:

| Tab | What It Shows | Middle Area |
|-----|--------------|-------------|
| **Overview** | Narrative landing page — app summary, features, data flows, backend | Full-width narrative |
| **Features** | Components grouped by business function (cross-layer) | Full-width component detail |
| **Categories** | Components grouped by technical layer (UI, API, Data, Utils, External) | Full-width component detail |
| **Architecture** | Data flow view with collapsible layers | Interactive graph + slide-out detail |

## AI Features

### Enhance (quick skim)
Click **⚡ Enhance** — AI reads every file (in batches of 30) and generates:
- Better titles ("Daily Summary Scheduler" not "daily-summary.ts")
- Correct layer categorization
- One-sentence descriptions

### Explain (deep analysis)
Click **✨ Explain** — select specific components, AI reads the full source code and writes a detailed plain-English explanation covering what it does, how it works, what data it processes, and what it connects to.

### Overview (narrative)
Click **📖 Generate Overview** — AI reads the entire architecture and generates an interactive narrative: app summary, key features, data flow diagrams, backend services, data types.

All AI features use `claude -p` (non-interactive mode) — no separate API keys needed.

## CLI Options

```
npx tsx apps/cli/bin/codeview.mjs [directory] [options]

Options:
  --port <number>   Port for the web server (default: 4200)
  --no-open         Don't open the browser automatically
  -h, --help        Show help
```

## What It Detects

| Framework | What's Detected |
|-----------|----------------|
| **React** | Components (JSX), hooks, contexts, forwardRef/memo |
| **Next.js** | Pages, layouts, API routes (App Router + Pages Router), middleware |
| **Database** | Prisma schemas, Drizzle tables, TypeORM entities |
| **Cloud Functions** | Firebase Functions, serverless handlers |
| **General** | Utilities, configs, service clients, constants, type definitions |

## Project Structure

```
codeview/
  apps/
    web/              # Next.js 15 visualization app
    cli/              # CLI entry point
  packages/
    analyzer/         # File scanning + TypeScript parser + framework detectors
    graph-engine/     # Graph builder + clustering + labeler + layout
    prompt-builder/   # Context assembly for prompts
    watcher/          # File system watching (chokidar)
    mcp-server/       # MCP server for Claude Code integration
    shared/           # Shared TypeScript types
```

## Tech Stack

- **Monorepo:** pnpm + Turborepo
- **Web:** Next.js 15 (App Router), React Flow, Tailwind CSS v4, Zustand
- **Analysis:** TypeScript Compiler API, chokidar
- **AI:** Claude Code CLI (`claude -p`), Shiki syntax highlighting
- **Design:** shadcn Mist theme, Inter + JetBrains Mono, muted professional palette
- **Integration:** MCP SDK for bidirectional Claude Code communication

## Data & Privacy

- **Local only** — runs entirely on your machine. No data sent anywhere.
- **No API keys** — uses your existing Claude Code auth for AI features.
- **`.codeview/` folder** — analysis, descriptions, and overview cached in your project.
- **Read-only** — CodeView reads source files but never modifies your project.

## Development

```bash
pnpm install          # Install dependencies
pnpm dev              # Dev server with demo data
pnpm build            # Build all packages
pnpm --filter @codeview/analyzer test       # 25 tests
pnpm --filter @codeview/graph-engine test   # 29 tests
pnpm --filter @codeview/prompt-builder test # 6 tests
pnpm --filter @codeview/watcher test        # 5 tests
pnpm --filter @codeview/mcp-server test     # 4 tests
```

## License

MIT
