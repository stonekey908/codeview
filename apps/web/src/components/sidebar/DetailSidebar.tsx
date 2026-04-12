'use client';

import { useGraphStore } from '@/store/graph-store';
import { LAYER_COLORS, LAYER_LABELS } from '@/components/canvas/layer-colors';
import { X, ExternalLink, Code, ChevronDown, GitCommit } from 'lucide-react';
import { useState } from 'react';
import type { ArchitecturalLayer } from '@codeview/shared';

export function DetailSidebar() {
  const {
    sidebarNodeId,
    setSidebarNode,
    graphData,
    viewMode,
    getNodeById,
    getConnectedNodeIds,
  } = useGraphStore();

  const [codeOpen, setCodeOpen] = useState(false);

  if (!sidebarNodeId || !graphData) return null;

  const node = getNodeById(sidebarNodeId);
  if (!node) return null;

  const colors = LAYER_COLORS[node.layer];

  // Dependencies: edges where this node is the source
  const dependsOn = graphData.edges
    .filter((e) => e.source === node.id)
    .map((e) => graphData.nodes.find((n) => n.id === e.target))
    .filter(Boolean);

  // Dependents: edges where this node is the target
  const dependedOnBy = graphData.edges
    .filter((e) => e.target === node.id)
    .map((e) => graphData.nodes.find((n) => n.id === e.source))
    .filter(Boolean);

  const vscodeUrl = `vscode://file${node.filePath}`;

  return (
    <div className="fixed top-12 right-0 bottom-0 w-[360px] bg-zinc-900 border-l border-zinc-800 z-50 overflow-y-auto shadow-[-4px_0_24px_rgba(0,0,0,0.4)] animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-zinc-900 border-b border-zinc-800">
        <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest" style={{ fontFamily: 'var(--font-display)' }}>
          Component Detail
        </span>
        <button
          onClick={() => setSidebarNode(null)}
          className="w-5 h-5 flex items-center justify-center rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* Hero */}
      <div className="px-4 py-3.5 border-b border-zinc-800">
        <div className="flex items-start gap-2.5 mb-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: colors.soft, color: colors.color }}
          >
            <Code size={16} />
          </div>
          <div>
            <h2 className="text-base font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
              {node.label}
            </h2>
            <p className="text-[10.5px] font-mono text-zinc-500 mt-0.5">
              {node.relativePath}
            </p>
          </div>
        </div>
        <div className="flex gap-1">
          <span className="px-2 py-0.5 rounded-md text-[10px] font-medium" style={{ backgroundColor: colors.soft, color: colors.color }}>
            {LAYER_LABELS[node.layer]}
          </span>
          <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-zinc-800 text-zinc-400">
            {node.role}
          </span>
        </div>

        {/* Descriptive mode: plain English explanation */}
        {viewMode === 'descriptive' && (
          <div className="mt-2.5 p-2.5 bg-zinc-800 rounded-lg text-xs text-zinc-300 leading-relaxed border-l-2" style={{ borderLeftColor: colors.color }}>
            <strong className="text-zinc-200">In plain English:</strong> {node.description}
          </div>
        )}
      </div>

      {/* Depends On */}
      {dependsOn.length > 0 && (
        <Section title={`Depends On (${dependsOn.length})`}>
          {dependsOn.map((dep) => (
            <ConnectionItem
              key={dep!.id}
              name={dep!.label}
              role={dep!.role}
              layer={dep!.layer}
              description={viewMode === 'descriptive' ? dep!.description : undefined}
              onClick={() => setSidebarNode(dep!.id)}
            />
          ))}
        </Section>
      )}

      {/* Depended On By */}
      {dependedOnBy.length > 0 && (
        <Section title={`Depended On By (${dependedOnBy.length})`}>
          {dependedOnBy.map((dep) => (
            <ConnectionItem
              key={dep!.id}
              name={dep!.label}
              role={dep!.role}
              layer={dep!.layer}
              description={viewMode === 'descriptive' ? dep!.description : undefined}
              onClick={() => setSidebarNode(dep!.id)}
            />
          ))}
        </Section>
      )}

      {/* Source Code */}
      <Section title="Source Code">
        <div className="flex gap-2">
          <button
            onClick={() => setCodeOpen(!codeOpen)}
            className="flex-1 flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-[11px] font-medium text-zinc-400 hover:border-zinc-600 hover:bg-zinc-700/50 transition-colors"
          >
            <Code size={12} />
            Preview
            <ChevronDown size={10} className={`ml-auto transition-transform ${codeOpen ? 'rotate-180' : ''}`} />
          </button>
          <a
            href={vscodeUrl}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-[11px] font-medium text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 hover:bg-zinc-700/50 transition-colors no-underline"
          >
            <ExternalLink size={12} />
            Open in IDE
          </a>
        </div>
        {codeOpen && (
          <div className="mt-2 p-2.5 bg-zinc-950 border border-zinc-800 rounded-lg font-mono text-[11px] text-zinc-400 leading-relaxed whitespace-pre-wrap break-words max-h-60 overflow-y-auto">
            {`// ${node.relativePath}\n// Code preview will load from the actual file\n// when running with the CLI (npx codeview)\n\n// For now, this component has:\n//   ${node.metadata.exportCount} export(s)\n//   ${node.metadata.importCount} import(s)\n//   ${node.metadata.connectionCount} connection(s)`}
          </div>
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-4 py-3 border-b border-zinc-800">
      <h3 className="text-[9.5px] font-semibold text-zinc-500 uppercase tracking-widest mb-2">
        {title}
      </h3>
      {children}
    </div>
  );
}

function ConnectionItem({
  name,
  role,
  layer,
  description,
  onClick,
}: {
  name: string;
  role: string;
  layer: ArchitecturalLayer;
  description?: string;
  onClick: () => void;
}) {
  const colors = LAYER_COLORS[layer];
  return (
    <div>
      <button
        onClick={onClick}
        className="w-full flex items-center gap-1.5 px-1.5 py-1 rounded text-left hover:bg-zinc-800/50 transition-colors"
      >
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: colors.color }} />
        <span className="text-xs font-medium text-zinc-200 flex-1">{name}</span>
        <span className="text-[10px] font-mono text-zinc-500">{role}</span>
      </button>
      {description && (
        <p className="text-[10px] text-zinc-500 ml-3 mb-1">{description}</p>
      )}
    </div>
  );
}
