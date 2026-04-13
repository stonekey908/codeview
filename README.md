# CodeView

**Visual architecture companion for AI-powered coding tools** — see your codebase as an interactive graph, select components, and get plain-English explanations.

![CodeView](https://img.shields.io/badge/status-beta-purple) ![Tests](https://img.shields.io/badge/tests-69%20passing-green) ![License](https://img.shields.io/badge/license-MIT-blue)

## What It Does

CodeView scans any TypeScript/JavaScript project and turns it into an interactive architecture map. Non-technical product owners can see what's being built, understand how components connect, and get AI-powered explanations — all without reading a line of code.

- **Overview** — auto-generated narrative explaining what the app does, its features, data flows, and backend services
- **Features view** — components grouped by business function across all layers
- **Categories view** — components grouped by technical layer (UI, API, Data, Utils, External)
- **Architecture view** — interactive graph showing how layers connect
- **Explain** — click any component and AI reads the source code, then explains it in plain English
- **Enhance** — AI categorises and titles every component in your project
- **No separate API keys** — uses your existing AI terminal subscription (see [How AI Features Work](#how-ai-features-work))
- **Local and private** — runs entirely on your machine, no data leaves your computer

## Prerequisites

- **Node.js 20+**
- **pnpm** — install with `npm install -g pnpm` if you don't have it
- **An AI coding CLI** — currently requires [Claude Code](https://docs.anthropic.com/en/docs/claude-code) (`claude` command available in your terminal). See [How AI Features Work](#how-ai-features-work) for details.

## Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/stonekey908/codeview.git
cd codeview

# 2. Install dependencies
pnpm install

# 3. Build all packages
pnpm build

# 4. Analyse your project (replace with your project path)
npx tsx apps/cli/bin/codeview.mjs /path/to/your/project

# Opens http://localhost:4200 with your architecture map
```

### Example: Analyse a Next.js project

```bash
npx tsx apps/cli/bin/codeview.mjs ~/projects/my-nextjs-app
```

### Example: Analyse the current directory

```bash
cd ~/projects/my-app
npx tsx apps/cli/bin/codeview.mjs .
```

### Example: Use a custom port

```bash
npx tsx apps/cli/bin/codeview.mjs ~/projects/my-app --port 3500
```

### Development mode (with demo data)

If you just want to explore CodeView itself without pointing it at a project:

```bash
pnpm dev
# Opens http://localhost:4200 with sample demo data
```

## How AI Features Work

CodeView's AI features (Enhance, Explain, Overview) work by calling an AI CLI tool installed on your machine. **You don't need a separate API key** — it uses whatever AI subscription you already have set up in your terminal.

### Current implementation

CodeView currently uses `claude -p` (Claude Code's non-interactive mode) to power its AI features. This means:

- You need [Claude Code](https://docs.anthropic.com/en/docs/claude-code) installed and authenticated
- It uses your existing Claude subscription (Pro, Team, or Enterprise)
- All processing happens locally — your code is sent to the AI model via your own authenticated session, the same as if you asked Claude Code a question in the terminal

### What about other AI tools?

The core visualisation (scanning, graphing, navigation) works with **zero AI** — you get a fully interactive architecture map with no AI subscription at all.

The AI features (Enhance, Explain, Overview) currently call `claude -p` specifically. The architecture is designed so this could be swapped for other AI CLI tools (GitHub Copilot CLI, Gemini CLI, Cursor, etc.) — the integration point is a single API route (`/api/trigger-claude`) that spawns a CLI process with a prompt and reads the text output. Any CLI tool that accepts a prompt on stdin and returns text could be wired in.

If there's demand for other AI backends, this is a straightforward extension. Contributions welcome.

### What each AI feature does

| Feature | What it does | Time |
|---------|-------------|------|
| **Enhance** | Reads every file (batches of 30), generates better titles, correct layer categorisation, and one-sentence descriptions | 30-90s depending on project size |
| **Explain** | Reads a single component's full source code, writes a detailed plain-English explanation | 5-15s per component |
| **Overview** | Reads the entire architecture, generates a narrative with features, data flows, backend services, and data types | 30-60s |

## Navigation

CodeView has four views, accessible via tabs in the left panel:

| Tab | What It Shows | Best For |
|-----|--------------|----------|
| **Overview** | Narrative landing page — app summary, features, data flows | First-time understanding of a project |
| **Features** | Components grouped by business function (cross-layer) | Seeing how a feature works end-to-end |
| **Categories** | Components grouped by technical layer | Understanding the technical structure |
| **Architecture** | Interactive graph with connections between layers | Visualising data flow and dependencies |

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
    web/              # Next.js 15 visualisation app
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
- **AI:** CLI-based (currently Claude Code), Shiki syntax highlighting
- **Design:** shadcn Mist theme, Inter + JetBrains Mono, professional muted palette
- **Integration:** MCP SDK for bidirectional communication

## Data & Privacy

- **Local only** — runs entirely on your machine. No telemetry, no data sent anywhere.
- **No API keys** — AI features use your existing terminal AI subscription.
- **`.codeview/` folder** — analysis results cached in your project directory. Add to `.gitignore` if preferred.
- **Read-only** — CodeView reads source files but never modifies your project.

## Development

```bash
pnpm install          # Install dependencies
pnpm dev              # Dev server with demo data
pnpm build            # Build all packages
pnpm test             # Run all 69 tests

# Run tests for specific packages
pnpm --filter @codeview/analyzer test       # 25 tests
pnpm --filter @codeview/graph-engine test   # 29 tests
pnpm --filter @codeview/prompt-builder test # 6 tests
pnpm --filter @codeview/watcher test        # 5 tests
pnpm --filter @codeview/mcp-server test     # 4 tests
```

## Troubleshooting

### "Claude CLI not found"
Make sure `claude` is in your PATH. Run `which claude` in your terminal. If it's not found, install Claude Code first: https://docs.anthropic.com/en/docs/claude-code

### AI features don't work but the graph loads fine
The graph/visualisation doesn't need AI. If the Enhance/Explain/Overview buttons fail, check that `claude -p "hello"` works in your terminal.

### No files found
CodeView scans for `.ts`, `.tsx`, `.js`, `.jsx` files. Make sure you're pointing it at a directory that contains source code (not the root of a monorepo — point it at the specific app, e.g. `apps/web`).

### Port already in use
Use `--port` to pick a different port: `npx tsx apps/cli/bin/codeview.mjs . --port 3500`

## License

MIT
