# Contributing to CodeView

Thanks for your interest in contributing to CodeView!

## Getting Started

1. Fork the repo
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/codeview.git`
3. Install dependencies: `pnpm install`
4. Create a branch: `git checkout -b feat/your-feature`

## Development

```bash
# Run the web app in dev mode (with demo data)
pnpm dev

# Run tests
pnpm --filter @codeview/analyzer test
pnpm --filter @codeview/graph-engine test

# Build everything
pnpm build

# Test on a real project
npx tsx apps/cli/bin/codeview.mjs /path/to/project
```

## Project Structure

- `apps/web/` — Next.js frontend (React Flow canvas, detail panel, toolbar)
- `apps/cli/` — CLI entry point
- `packages/analyzer/` — File scanning, TypeScript parsing, framework detection
- `packages/graph-engine/` — Graph building, clustering, layout, labeling
- `packages/prompt-builder/` — Context assembly for Claude prompts
- `packages/watcher/` — File system watching
- `packages/mcp-server/` — MCP server for Claude Code integration
- `packages/shared/` — Shared TypeScript types

## Conventions

- **Commits:** `feat(scope): description`, `fix(scope): description`, `docs: description`
- **Branches:** `feat/short-description`, `fix/short-description`
- **Tests:** Add tests for new functionality. Run all tests before submitting.
- **Types:** TypeScript strict mode. No `any` unless unavoidable.

## Adding a New Framework Detector

1. Create a new file in `packages/analyzer/src/detectors/`
2. Export a function matching the `Detector` type signature
3. Add it to the `detectors` array in `packages/analyzer/src/detectors/index.ts`
4. Add tests in `packages/analyzer/src/__tests__/detectors.test.ts`

## Adding a New MCP Tool

1. Add the tool in `packages/mcp-server/src/server.ts` using `server.tool()`
2. Update the `CodeViewServerOptions` interface if it needs new callbacks
3. Wire the callback in `packages/mcp-server/src/stdio.ts`
4. Add tests

## Pull Requests

- One feature per PR
- Include tests
- Update README if adding user-facing features
- All tests must pass
- Build must succeed (`pnpm build`)
