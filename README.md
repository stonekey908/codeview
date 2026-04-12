# CodeView

**Visual architecture companion for Claude Code** — see your codebase as an interactive graph, ask Claude to explain any component in plain English.

![CodeView](https://img.shields.io/badge/status-beta-purple) ![Tests](https://img.shields.io/badge/tests-69%20passing-green) ![License](https://img.shields.io/badge/license-MIT-blue)

## What It Does

CodeView scans any TypeScript/JavaScript project and visualizes it as an interactive architecture graph. Non-technical product owners can understand what's being built without reading code.

- **See your architecture** — components organized by layer (UI, API, Data, Utils, External) with connection lines showing how they relate
- **Ask Claude** — click any component and Claude reads the actual source code, then explains what it does in plain English
- **No API keys needed** — uses your existing Claude Code installation. CodeView is just a visual layer on top of it
- **Works on any project** — point it at any folder. It scans, analyzes, and renders in seconds

## Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/stonekey908/codeview.git
cd codeview

# 2. Install dependencies
pnpm install

# 3. Point it at your project
npx tsx apps/cli/bin/codeview.mjs /path/to/your/project

# That's it. Opens http://localhost:4200 with your architecture graph.
```

## How It Works

```
Your Project          CodeView CLI          Browser (localhost:4200)
     │                     │                        │
     │  scans files        │                        │
     │  extracts imports   │                        │
     │  detects frameworks │                        │
     │─────────────────────►                        │
     │                     │  builds graph          │
     │                     │  computes layout       │
     │                     │  starts web server     │
     │                     │────────────────────────►
     │                     │                        │
     │                     │         interactive    │
     │                     │         architecture   │
     │                     │         graph          │
```

When you click "Ask Claude" on a component:
1. CodeView reads the source file
2. Spawns `claude -p` (non-interactive) to analyze it
3. Claude reads the code and writes a plain-English explanation
4. Explanation appears in the detail panel

**No separate API keys.** It uses your existing Claude Code auth.

## Features

### Architecture Graph
- Collapsible layer groups (UI, API, Data, Utils, External)
- Connection lines between groups with count labels
- Click to expand, double-click to focus
- Dark and light mode
- Snap-to-grid dragging

### Component Details
- 50% width detail panel with tabs (Overview, Connections, Code)
- Navigation stack with back button (like Linear)
- Typed connection chips: `[renders]`, `[fetches from]`, `[uses]`
- Real source code display with syntax highlighting
- "Open in VS Code" link

### AI Descriptions
- "Generate Descriptions" — select which components to describe
- Claude reads each file and writes plain-English explanations
- Descriptions cached in `.codeview/descriptions.json` — persist across sessions
- Markdown rendering with formatting
- "Regenerate" button to refresh individual descriptions

### Claude Code Integration (MCP)
- MCP server for bidirectional communication
- Claude Code can query the architecture: `get_architecture_overview`, `get_component_details`, `get_dependencies`
- Flow tracing: "show me the login flow"
- No additional API keys — piggybacks on Claude Code session

### Search & Navigation
- `Cmd+K` / `/` — fuzzy search across all components
- `Escape` — close panel, clear selection
- `Cmd+D` — toggle descriptive/technical mode
- `?` — keyboard shortcuts reference

## CLI Options

```
npx tsx apps/cli/bin/codeview.mjs [directory] [options]

Options:
  --port <number>   Port for the web server (default: 4200)
  --no-open         Don't open the browser automatically
  -h, --help        Show help

Examples:
  npx tsx apps/cli/bin/codeview.mjs .                    # Current directory
  npx tsx apps/cli/bin/codeview.mjs ~/projects/my-app    # Specific project
  npx tsx apps/cli/bin/codeview.mjs . --port 3000        # Custom port
```

## Setting Up Claude Code MCP

To give Claude Code architectural awareness of your project, add `.mcp.json` to your project root:

```json
{
  "mcpServers": {
    "codeview": {
      "command": "npx",
      "args": ["tsx", "/path/to/codeview/packages/mcp-server/src/stdio.ts", "--project", "."]
    }
  }
}
```

Then Claude Code can call tools like:
- `get_architecture_overview()` — full project structure
- `get_component_details("src/app/page.tsx")` — detailed info about a component
- `get_dependencies("src/api/auth/route.ts")` — what it imports and what imports it
- `trace_flow("authentication")` — identify components in a user flow

## What It Detects

| Framework | What's Detected |
|-----------|----------------|
| **React** | Components (JSX), hooks, contexts, forwardRef/memo |
| **Next.js** | Pages, layouts, API routes (App Router + Pages Router), middleware |
| **Database** | Prisma schemas, Drizzle tables, TypeORM entities |
| **General** | Utilities, configs, service clients, barrel files |

File types: `.ts`, `.tsx`, `.js`, `.jsx`, `.mts`, `.mjs`

## Project Structure

```
codeview/
  apps/
    web/              # Next.js 15 visualization app
    cli/              # CLI entry point (npx codeview)
  packages/
    analyzer/         # File scanning + TypeScript parser + framework detectors
    graph-engine/     # Graph builder + clustering + labeler + layout
    prompt-builder/   # Context assembly for Claude prompts
    watcher/          # File system watching (chokidar)
    mcp-server/       # MCP server for Claude Code integration
    shared/           # Shared TypeScript types
```

## Tech Stack

- **Monorepo:** pnpm + Turborepo
- **Web:** Next.js 15 (App Router), React Flow, Tailwind CSS v4, Zustand
- **Analysis:** TypeScript Compiler API, chokidar
- **Integration:** MCP SDK, Claude Code CLI
- **Design:** shadcn zinc palette, Instrument Sans + DM Sans + JetBrains Mono

## Development

```bash
# Install
pnpm install

# Dev server (with demo data)
pnpm dev

# Run tests
pnpm --filter @codeview/analyzer test
pnpm --filter @codeview/graph-engine test
pnpm --filter @codeview/prompt-builder test
pnpm --filter @codeview/watcher test
pnpm --filter @codeview/mcp-server test

# Build all
pnpm build
```

## Data & Privacy

- **Local only** — CodeView runs entirely on your machine. No data is sent anywhere.
- **No API keys** — uses your existing Claude Code auth for AI features
- **`.codeview/` folder** — analysis data and cached descriptions stored in your project directory. Add to `.gitignore` if you don't want it committed.
- **File reading** — CodeView reads your source files to analyze them. It does not modify any files in your project.

## License

MIT
