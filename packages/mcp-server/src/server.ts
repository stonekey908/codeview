import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { GraphData, GraphNode, ArchitecturalLayer } from '@codeview/shared';

export interface CodeViewServerOptions {
  getGraphData: () => GraphData | null;
  getSelectedNodeIds: () => string[];
  highlightNodes: (nodeIds: string[]) => void;
  // Claude integration
  getPendingQuestion: () => { nodeId: string; question: string } | null;
  saveExplanation: (nodeId: string, explanation: string) => void;
  saveDescriptions: (descriptions: Record<string, string>) => void;
}

export function createCodeViewServer(options: CodeViewServerOptions): McpServer {
  const { getGraphData, getSelectedNodeIds, highlightNodes, getPendingQuestion, saveExplanation, saveDescriptions } = options;

  const server = new McpServer({
    name: 'codeview',
    version: '0.0.1',
  });

  // ─── TOOLS ───

  server.tool(
    'get_architecture_overview',
    'Get a high-level overview of the project architecture — layers, component counts, key relationships',
    {},
    async () => {
      const graph = getGraphData();
      if (!graph) return { content: [{ type: 'text' as const, text: 'No project loaded in CodeView.' }] };

      const overview = {
        totalComponents: graph.nodes.length,
        totalConnections: graph.edges.length,
        layers: graph.clusters.map((c) => ({
          name: c.label,
          layer: c.layer,
          description: c.description,
          componentCount: c.metadata.componentCount,
          connectionCount: c.metadata.connectionCount,
          components: c.nodeIds.map((id) => {
            const node = graph.nodes.find((n) => n.id === id);
            return node ? { label: node.label, path: node.relativePath, role: node.role } : null;
          }).filter(Boolean),
        })),
      };

      return { content: [{ type: 'text' as const, text: JSON.stringify(overview, null, 2) }] };
    }
  );

  server.tool(
    'get_component_details',
    'Get detailed information about a specific component by file path',
    { filePath: z.string().describe('Relative file path of the component') },
    async ({ filePath }) => {
      const graph = getGraphData();
      if (!graph) return { content: [{ type: 'text' as const, text: 'No project loaded.' }] };

      const node = graph.nodes.find((n) => n.relativePath === filePath || n.id === filePath);
      if (!node) return { content: [{ type: 'text' as const, text: `Component not found: ${filePath}` }] };

      const deps = graph.edges
        .filter((e) => e.source === node.id)
        .map((e) => graph.nodes.find((n) => n.id === e.target))
        .filter(Boolean)
        .map((n) => ({ label: n!.label, path: n!.relativePath, role: n!.role, layer: n!.layer }));

      const dependents = graph.edges
        .filter((e) => e.target === node.id)
        .map((e) => graph.nodes.find((n) => n.id === e.source))
        .filter(Boolean)
        .map((n) => ({ label: n!.label, path: n!.relativePath, role: n!.role, layer: n!.layer }));

      const detail = {
        label: node.label,
        description: node.description,
        filePath: node.relativePath,
        layer: node.layer,
        role: node.role,
        framework: node.metadata.framework,
        dependsOn: deps,
        dependedOnBy: dependents,
        metadata: node.metadata,
      };

      return { content: [{ type: 'text' as const, text: JSON.stringify(detail, null, 2) }] };
    }
  );

  server.tool(
    'get_dependencies',
    'Get all dependencies of a component and what depends on it',
    { filePath: z.string().describe('Relative file path of the component') },
    async ({ filePath }) => {
      const graph = getGraphData();
      if (!graph) return { content: [{ type: 'text' as const, text: 'No project loaded.' }] };

      const node = graph.nodes.find((n) => n.relativePath === filePath || n.id === filePath);
      if (!node) return { content: [{ type: 'text' as const, text: `Component not found: ${filePath}` }] };

      const imports = graph.edges
        .filter((e) => e.source === node.id)
        .map((e) => {
          const target = graph.nodes.find((n) => n.id === e.target);
          return target ? { label: target.label, path: target.relativePath, type: e.type } : null;
        })
        .filter(Boolean);

      const importedBy = graph.edges
        .filter((e) => e.target === node.id)
        .map((e) => {
          const source = graph.nodes.find((n) => n.id === e.source);
          return source ? { label: source.label, path: source.relativePath, type: e.type } : null;
        })
        .filter(Boolean);

      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ component: node.label, imports, importedBy }, null, 2) }],
      };
    }
  );

  server.tool(
    'get_layer_components',
    'Get all components in a specific architectural layer',
    { layer: z.enum(['ui', 'api', 'data', 'utils', 'external']).describe('The architectural layer') },
    async ({ layer }) => {
      const graph = getGraphData();
      if (!graph) return { content: [{ type: 'text' as const, text: 'No project loaded.' }] };

      const components = graph.nodes
        .filter((n) => n.layer === layer)
        .map((n) => ({
          label: n.label,
          path: n.relativePath,
          role: n.role,
          description: n.description,
          connectionCount: n.metadata.connectionCount,
        }));

      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ layer, count: components.length, components }, null, 2) }],
      };
    }
  );

  server.tool(
    'highlight_components',
    'Highlight specific components in the CodeView visualization for the user to see',
    {
      filePaths: z.array(z.string()).describe('Array of relative file paths to highlight'),
      label: z.string().optional().describe('Optional label to show with the highlight'),
    },
    async ({ filePaths, label }) => {
      highlightNodes(filePaths);
      return {
        content: [{ type: 'text' as const, text: `Highlighted ${filePaths.length} component(s) in CodeView${label ? `: ${label}` : ''}` }],
      };
    }
  );

  server.tool(
    'get_user_selection',
    'Get the components currently selected by the user in the CodeView UI',
    {},
    async () => {
      const graph = getGraphData();
      const selectedIds = getSelectedNodeIds();

      if (!graph || selectedIds.length === 0) {
        return { content: [{ type: 'text' as const, text: 'No components currently selected in CodeView.' }] };
      }

      const selected = graph.nodes
        .filter((n) => selectedIds.includes(n.id))
        .map((n) => ({
          label: n.label,
          path: n.relativePath,
          role: n.role,
          layer: n.layer,
          description: n.description,
        }));

      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ selectedCount: selected.length, components: selected }, null, 2) }],
      };
    }
  );

  // ─── CLAUDE INTEGRATION TOOLS ───

  server.tool(
    'get_pending_question',
    'Check if the CodeView user has asked a question about a component that needs Claude to answer. Call this periodically or when triggered by a hook.',
    {},
    async () => {
      const pending = getPendingQuestion();
      if (!pending) {
        return { content: [{ type: 'text' as const, text: 'No pending questions from CodeView.' }] };
      }

      const graph = getGraphData();
      const node = graph?.nodes.find((n) => n.id === pending.nodeId);

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            action: 'explain_component',
            componentPath: node?.relativePath || pending.nodeId,
            componentLabel: node?.label || pending.nodeId,
            question: pending.question || 'Explain what this component does, how it works, what data it processes, and what it calls. Write for a non-technical product owner.',
            instructions: 'Read the actual source file, understand the code, then call save_explanation with your explanation.',
          }, null, 2),
        }],
      };
    }
  );

  server.tool(
    'save_explanation',
    'Save a Claude-generated explanation for a component. Called after Claude reads and understands the source code.',
    {
      componentPath: z.string().describe('Relative file path of the component'),
      explanation: z.string().describe('Natural language explanation of what the component does'),
    },
    async ({ componentPath, explanation }) => {
      saveExplanation(componentPath, explanation);
      return {
        content: [{ type: 'text' as const, text: `Explanation saved for ${componentPath}. It will appear in the CodeView detail panel.` }],
      };
    }
  );

  server.tool(
    'generate_descriptions',
    'Get the list of all components that need descriptions. Claude should read each file and generate a human-readable description.',
    {},
    async () => {
      const graph = getGraphData();
      if (!graph) return { content: [{ type: 'text' as const, text: 'No project loaded.' }] };

      const components = graph.nodes.map((n) => ({
        path: n.relativePath,
        label: n.label,
        role: n.role,
        layer: n.layer,
        currentDescription: n.description,
      }));

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            action: 'generate_descriptions',
            totalComponents: components.length,
            components,
            instructions: 'For each component, read the source file and write a 1-2 sentence description explaining what it does in plain English. Then call save_descriptions with all descriptions.',
          }, null, 2),
        }],
      };
    }
  );

  server.tool(
    'save_descriptions',
    'Save Claude-generated descriptions for components. Called after Claude reads the source files.',
    {
      descriptions: z.record(z.string(), z.string()).describe('Map of relative file path → description'),
    },
    async ({ descriptions }) => {
      saveDescriptions(descriptions as Record<string, string>);
      return {
        content: [{
          type: 'text' as const,
          text: `Saved descriptions for ${Object.keys(descriptions).length} components. They will appear in CodeView.`,
        }],
      };
    }
  );

  server.tool(
    'trace_flow',
    'Identify all components involved in a specific user flow and their execution order. Claude should analyze the code to determine the flow.',
    {
      flowName: z.string().describe('Name of the flow to trace, e.g. "login", "checkout", "data refresh"'),
    },
    async ({ flowName }) => {
      const graph = getGraphData();
      if (!graph) return { content: [{ type: 'text' as const, text: 'No project loaded.' }] };

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            action: 'trace_flow',
            flowName,
            availableComponents: graph.nodes.map((n) => ({ label: n.label, path: n.relativePath, role: n.role, layer: n.layer })),
            availableConnections: graph.edges.map((e) => ({ from: e.source, to: e.target })),
            instructions: `Analyze the code to identify all components involved in the "${flowName}" flow. Return an ordered list of components with an explanation of each step. Call highlight_components with the file paths to show the flow in CodeView.`,
          }, null, 2),
        }],
      };
    }
  );

  return server;
}
