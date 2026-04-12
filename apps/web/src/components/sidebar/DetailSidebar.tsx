'use client';

import { useGraphStore } from '@/store/graph-store';
import { LAYER_COLORS, LAYER_LABELS } from '@/components/canvas/layer-colors';
import { X, ArrowLeft, ExternalLink, Code, Eye, Link2, Sparkles, Loader2 } from 'lucide-react';
import type { ArchitecturalLayer } from '@codeview/shared';

export function DetailSidebar() {
  const {
    detailNodeId, detailNavStack, detailTab,
    closeDetail, goBackDetail, navigateDetail, setDetailTab,
    graphData, viewMode, theme,
    getNodeById, getDependencies, getDependents,
    claudeExplanations, pendingExplanation, requestExplanation, claudeConnected,
  } = useGraphStore();

  if (!detailNodeId || !graphData) return null;

  const node = getNodeById(detailNodeId);
  if (!node) return null;

  const colors = LAYER_COLORS[node.layer];
  const isDark = theme === 'dark';
  const deps = getDependencies(detailNodeId);
  const dependents = getDependents(detailNodeId);
  const explanation = claudeExplanations[detailNodeId];
  const isPending = pendingExplanation === detailNodeId;

  const vscodeUrl = `vscode://file${node.filePath}`;
  const canGoBack = detailNavStack.length > 0;

  return (
    <div
      className="fixed top-12 right-0 bottom-0 bg-zinc-900 border-l border-zinc-800 z-50 overflow-y-auto"
      style={{
        width: 'min(50vw, 560px)',
        minWidth: 400,
        boxShadow: '-8px 0 32px rgba(0,0,0,0.4)',
        animation: 'slideIn 0.25s ease-out',
      }}
    >
      <style>{`@keyframes slideIn { from { transform: translateX(40px); opacity: 0; } to { transform: none; opacity: 1; } }`}</style>

      {/* Header with back button + close */}
      <div className="sticky top-0 z-10 flex items-center gap-2 px-4 py-3 bg-zinc-900 border-b border-zinc-800">
        {canGoBack && (
          <button onClick={goBackDetail}
            className="w-7 h-7 flex items-center justify-center rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors">
            <ArrowLeft size={16} />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold tracking-tight truncate" style={{ fontFamily: 'var(--font-display)' }}>
            {node.label}
          </h2>
          <p className="text-[10px] font-mono text-zinc-500 truncate">{node.relativePath}</p>
        </div>
        <a href={vscodeUrl} className="w-7 h-7 flex items-center justify-center rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors" title="Open in IDE">
          <ExternalLink size={14} />
        </a>
        <button onClick={closeDetail}
          className="w-7 h-7 flex items-center justify-center rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors">
          <X size={16} />
        </button>
      </div>

      {/* Layer + role tags */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-2">
        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-medium" style={{ backgroundColor: colors.soft, color: colors.color }}>
          {LAYER_LABELS[node.layer]}
        </span>
        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-medium" style={{ background: isDark ? '#27272a' : '#f4f4f5', color: isDark ? '#a1a1aa' : '#71717a' }}>
          {node.role}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 px-4 border-b border-zinc-800">
        {(['overview', 'connections', 'code'] as const).map((tab) => (
          <button key={tab} onClick={() => setDetailTab(tab)}
            className={`px-3 py-2 text-xs font-medium capitalize border-b-2 transition-colors ${
              detailTab === tab
                ? 'border-blue-500 text-zinc-100'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}>
            {tab === 'overview' && <Eye size={12} className="inline mr-1.5 -mt-0.5" />}
            {tab === 'connections' && <Link2 size={12} className="inline mr-1.5 -mt-0.5" />}
            {tab === 'code' && <Code size={12} className="inline mr-1.5 -mt-0.5" />}
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-4">
        {detailTab === 'overview' && (
          <div className="space-y-4">
            {/* Description */}
            <div>
              <h3 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-2">Description</h3>
              <p className="text-sm leading-relaxed" style={{ color: isDark ? '#d4d4d8' : '#3f3f46' }}>
                {node.description}
              </p>
            </div>

            {/* Claude explanation */}
            {claudeConnected && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                    <Sparkles size={10} className="text-purple-400" />
                    AI Explanation
                  </h3>
                  {!explanation && !isPending && (
                    <button onClick={() => requestExplanation(detailNodeId)}
                      className="text-[10px] text-purple-400 hover:text-purple-300 font-medium">
                      Ask Claude
                    </button>
                  )}
                </div>
                {isPending && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-purple-500/5 border border-purple-500/20 text-sm text-purple-300">
                    <Loader2 size={14} className="animate-spin" />
                    Claude is reading the source code...
                  </div>
                )}
                {explanation && (
                  <div className="p-3 rounded-lg border-l-2 border-purple-500 text-sm leading-relaxed"
                    style={{ background: isDark ? '#27272a' : '#f4f4f5', color: isDark ? '#d4d4d8' : '#3f3f46' }}>
                    {explanation}
                  </div>
                )}
              </div>
            )}

            {/* Stats */}
            <div>
              <h3 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-2">Stats</h3>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Exports', value: node.metadata.exportCount },
                  { label: 'Imports', value: node.metadata.importCount },
                  { label: 'Connections', value: node.metadata.connectionCount },
                ].map((stat) => (
                  <div key={stat.label} className="p-2 rounded-lg" style={{ background: isDark ? '#27272a' : '#f4f4f5' }}>
                    <div className="text-lg font-bold" style={{ color: colors.color, fontFamily: 'var(--font-display)' }}>{stat.value}</div>
                    <div className="text-[9px] uppercase tracking-wider" style={{ color: isDark ? '#52525b' : '#a1a1aa' }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {detailTab === 'connections' && (
          <div className="space-y-4">
            {/* Dependencies (what this uses) */}
            {deps.length > 0 && (
              <div>
                <h3 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-2">
                  Uses ({deps.length})
                </h3>
                <div className="space-y-1">
                  {deps.map(({ node: dep, type }) => (
                    <ConnectionChip
                      key={dep.id}
                      label={dep.label}
                      type={classifyRelationship(type, dep.role, dep.layer)}
                      layer={dep.layer}
                      description={viewMode === 'descriptive' ? dep.description : dep.relativePath}
                      isDark={isDark}
                      onClick={() => navigateDetail(dep.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Dependents (what uses this) */}
            {dependents.length > 0 && (
              <div>
                <h3 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-2">
                  Used By ({dependents.length})
                </h3>
                <div className="space-y-1">
                  {dependents.map(({ node: dep, type }) => (
                    <ConnectionChip
                      key={dep.id}
                      label={dep.label}
                      type={classifyRelationship(type, node.role, node.layer)}
                      layer={dep.layer}
                      description={viewMode === 'descriptive' ? dep.description : dep.relativePath}
                      isDark={isDark}
                      onClick={() => navigateDetail(dep.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {deps.length === 0 && dependents.length === 0 && (
              <p className="text-sm text-zinc-500 text-center py-8">No connections found</p>
            )}
          </div>
        )}

        {detailTab === 'code' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Source Code</h3>
              <a href={vscodeUrl} className="text-[10px] text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1">
                <ExternalLink size={10} />
                Open in IDE
              </a>
            </div>
            <div className="p-3 rounded-lg font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-words max-h-[60vh] overflow-y-auto"
              style={{ background: isDark ? '#09090b' : '#fafafa', color: isDark ? '#a1a1aa' : '#71717a', border: `1px solid ${isDark ? '#27272a' : '#e4e4e7'}` }}>
              {`// ${node.relativePath}\n// Preview loads from actual file when running CLI\n\n`}
              {`// This component has:\n//   ${node.metadata.exportCount} export(s): ${
                graphData.nodes.find(n => n.id === detailNodeId) ? 'see connections tab' : ''
              }\n//   ${node.metadata.importCount} import(s)\n//   ${node.metadata.connectionCount} connection(s)`}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Typed connection chip with relationship label
function ConnectionChip({
  label, type, layer, description, isDark, onClick,
}: {
  label: string; type: string; layer: ArchitecturalLayer;
  description: string; isDark: boolean; onClick: () => void;
}) {
  const colors = LAYER_COLORS[layer];
  const typeColors: Record<string, string> = {
    renders: '#3b82f6', 'fetches from': '#22c55e', 'uses': '#71717a',
    'provides data to': '#f59e0b', 'connects to': '#a855f7',
  };
  const typeColor = typeColors[type] || '#71717a';

  return (
    <button onClick={onClick}
      className="w-full flex items-start gap-2.5 p-2 rounded-lg text-left transition-colors"
      style={{ background: 'transparent' }}
      onMouseEnter={(e) => (e.currentTarget.style.background = isDark ? '#27272a' : '#f4f4f5')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <span className="px-1.5 py-0.5 rounded text-[9px] font-medium shrink-0 mt-0.5"
        style={{ background: `${typeColor}15`, color: typeColor }}>
        {type}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-medium flex items-center gap-1.5"
          style={{ color: isDark ? '#fafafa' : '#18181b' }}>
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: colors.color }} />
          {label}
        </div>
        <div className="text-[10px] mt-0.5 truncate" style={{ color: isDark ? '#71717a' : '#a1a1aa' }}>
          {description}
        </div>
      </div>
      <ArrowLeft size={12} className="rotate-180 shrink-0 mt-1" style={{ color: isDark ? '#3f3f46' : '#d4d4d8' }} />
    </button>
  );
}

// Classify import relationships into human-readable types
function classifyRelationship(
  edgeType: string,
  targetRole: string,
  targetLayer: ArchitecturalLayer
): string {
  if (targetLayer === 'ui') return 'renders';
  if (targetLayer === 'api') return 'fetches from';
  if (targetLayer === 'data') return 'provides data to';
  if (targetLayer === 'external') return 'connects to';
  return 'uses';
}
