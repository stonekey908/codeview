#!/usr/bin/env node

/**
 * CodeView MCP Server — stdio entry point
 *
 * Usage in .mcp.json:
 * {
 *   "mcpServers": {
 *     "codeview": {
 *       "command": "npx",
 *       "args": ["tsx", "/path/to/codeview/packages/mcp-server/src/stdio.ts", "--project", "."]
 *     }
 *   }
 * }
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createCodeViewServer } from './server';
import { analyzeProject } from '@codeview/analyzer';
import { buildGraph } from '@codeview/graph-engine';
import type { GraphData } from '@codeview/shared';

const args = process.argv.slice(2);
let projectDir = '.';
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--project' && args[i + 1]) {
    projectDir = args[i + 1];
    break;
  }
}

let graphData: GraphData | null = null;
let selectedNodeIds: string[] = [];

// Analyze on startup
async function init() {
  try {
    const analysis = await analyzeProject(projectDir);
    graphData = buildGraph(analysis);
    console.error(`[codeview-mcp] Analyzed ${graphData.nodes.length} components`);
  } catch (err) {
    console.error(`[codeview-mcp] Analysis error: ${err}`);
  }
}

const server = createCodeViewServer({
  getGraphData: () => graphData,
  getSelectedNodeIds: () => selectedNodeIds,
  highlightNodes: (ids) => {
    console.error(`[codeview-mcp] Highlight request: ${ids.join(', ')}`);
  },
});

async function main() {
  await init();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[codeview-mcp] Server running on stdio');
}

main().catch((err) => {
  console.error(`[codeview-mcp] Fatal: ${err}`);
  process.exit(1);
});
