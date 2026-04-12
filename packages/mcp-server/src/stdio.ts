#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createCodeViewServer } from './server';
import { analyzeProject } from '@codeview/analyzer';
import { buildGraph } from '@codeview/graph-engine';
import type { GraphData } from '@codeview/shared';
import * as fs from 'fs';
import * as path from 'path';

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
let pendingQuestion: { nodeId: string; question: string } | null = null;
const explanations: Record<string, string> = {};

// Load cached descriptions
const descPath = path.join(projectDir, '.codeview', 'descriptions.json');
let cachedDescriptions: Record<string, string> = {};
try {
  if (fs.existsSync(descPath)) {
    cachedDescriptions = JSON.parse(fs.readFileSync(descPath, 'utf-8'));
    console.error(`[codeview-mcp] Loaded ${Object.keys(cachedDescriptions).length} cached descriptions`);
  }
} catch { /* ignore */ }

async function init() {
  try {
    const analysis = await analyzeProject(projectDir);
    graphData = buildGraph(analysis);
    // Apply cached descriptions
    for (const node of graphData.nodes) {
      if (cachedDescriptions[node.relativePath]) {
        node.description = cachedDescriptions[node.relativePath];
      }
    }
    console.error(`[codeview-mcp] Analyzed ${graphData.nodes.length} components, ${graphData.edges.length} connections`);
  } catch (err) {
    console.error(`[codeview-mcp] Analysis error: ${err}`);
  }
}

const server = createCodeViewServer({
  getGraphData: () => graphData,
  getSelectedNodeIds: () => selectedNodeIds,
  highlightNodes: (ids) => {
    console.error(`[codeview-mcp] Highlight: ${ids.join(', ')}`);
  },
  getPendingQuestion: () => {
    const q = pendingQuestion;
    pendingQuestion = null; // consume it
    return q;
  },
  saveExplanation: (nodeId, explanation) => {
    explanations[nodeId] = explanation;
    // Also save to descriptions cache
    cachedDescriptions[nodeId] = explanation;
    const dir = path.join(projectDir, '.codeview');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(descPath, JSON.stringify(cachedDescriptions, null, 2));
    console.error(`[codeview-mcp] Explanation saved for ${nodeId}`);
  },
  saveDescriptions: (descriptions) => {
    Object.assign(cachedDescriptions, descriptions);
    const dir = path.join(projectDir, '.codeview');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(descPath, JSON.stringify(cachedDescriptions, null, 2));
    // Update graph nodes
    if (graphData) {
      for (const node of graphData.nodes) {
        if (descriptions[node.relativePath]) {
          node.description = descriptions[node.relativePath];
        }
      }
    }
    console.error(`[codeview-mcp] Saved ${Object.keys(descriptions).length} descriptions`);
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
