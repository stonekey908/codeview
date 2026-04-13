'use client';

import { useState } from 'react';
import { useGraphStore } from '@/store/graph-store';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { LAYER_COLORS, LAYER_LABELS } from '@/components/canvas/layer-colors';
import { FeaturesView } from './FeaturesView';
import type { ArchitecturalLayer } from '@codeview/shared';

const LAYER_FLOW_ORDER: ArchitecturalLayer[] = ['ui', 'utils', 'api', 'external', 'data'];
const FLOW_LABELS: Record<ArchitecturalLayer, string> = {
  ui: 'What Users See', utils: 'Data Hub', api: 'API Endpoints',
  external: 'AI & External', data: 'Static Datasets',
};
const FLOW_ARROWS: Record<string, string> = {
  'ui→utils': 'request data via', 'utils→api': 'which calls',
  'api→external': 'which ask', 'external→data': 'falls back to',
};
const ROLE_ICONS: Record<string, string> = {
  page: '📄', component: '🧩', layout: '📐', 'api-route': '⚡',
  middleware: '🔒', model: '💾', schema: '📋', utility: '🔧',
  hook: '🪝', context: '🔧', service: '🔗', config: '⚙️', unknown: '📄',
};

export function LeftPanel() {
  const { graphData, leftTab, setLeftTab, openDetail, detailNodeId, expandedClusterIds, toggleCluster, leftWidth, setLeftWidth } = useGraphStore();
  const [searchQuery, setSearchQuery] = useState('');

  if (!graphData) return (
    <div className="border-r border-border bg-card flex items-center justify-center">
      <div className="text-center px-6">
        <span className="inline-block w-6 h-6 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs text-muted-foreground">Loading architecture...</p>
      </div>
    </div>
  );

  const handleResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = leftWidth;
    const onMove = (me: MouseEvent) => setLeftWidth(startWidth + (me.clientX - startX));
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  return (
    <nav className="flex flex-col overflow-hidden bg-card border-r border-border relative">
      {/* Resize handle */}
      <div onMouseDown={handleResize}
        className="resize-handle absolute -right-1.5 top-0 bottom-0 w-3 cursor-col-resize hover:bg-primary/20 active:bg-primary/30 transition-colors z-20" />
      <div className="flex border-b border-border" role="tablist" aria-label="Navigation views">
        {(['overview', 'features', 'categories', 'architecture'] as const).map(tab => (
          <button key={tab} onClick={() => setLeftTab(tab)} role="tab" aria-selected={leftTab === tab}
            className={`flex-1 py-2.5 text-[9px] font-semibold text-center capitalize border-b-2 transition-all ${
              leftTab === tab ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}>{tab}</button>
        ))}
      </div>

      <div className="mx-2.5 my-2.5 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted border border-border text-xs">
        <span className="text-muted-foreground">🔍</span>
        <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          placeholder="Filter components..." aria-label="Filter components"
          className="flex-1 bg-transparent border-none outline-none text-xs text-foreground placeholder:text-muted-foreground" />
        {searchQuery && <button onClick={() => setSearchQuery('')} className="text-muted-foreground hover:text-foreground text-[10px]">✕</button>}
      </div>

      <div className="flex-1 overflow-y-auto pb-4">
        {leftTab === 'overview' && (
          <div className="px-3 py-2">
            <div className="mb-4">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">Contents</div>
              {['What This App Does', 'Key Features', 'How Data Flows', 'Behind the Scenes', 'Data & Storage'].map((item, i) => (
                <button key={item} className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors">
                  <span className="text-[9px] font-mono text-muted-foreground w-4">{i + 1}</span>{item}
                </button>
              ))}
            </div>
            <div>
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">At a Glance</div>
              {graphData.clusters.map((c: any) => {
                const colors = LAYER_COLORS[c.layer as ArchitecturalLayer];
                return (
                  <div key={c.id} className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: colors.color }} />
                    {c.nodeIds.length} {c.label}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {leftTab === 'features' && <FeaturesView />}

        {leftTab === 'categories' && graphData.clusters.map((cluster: any) => {
          const colors = LAYER_COLORS[cluster.layer as ArchitecturalLayer];
          const allNodes = cluster.nodeIds.map((id: string) => graphData.nodes.find((n: any) => n.id === id)).filter(Boolean);
          const nodes = searchQuery
            ? allNodes.filter((n: any) => n.label.toLowerCase().includes(searchQuery.toLowerCase()) || n.relativePath.toLowerCase().includes(searchQuery.toLowerCase()))
            : allNodes;
          if (searchQuery && nodes.length === 0) return null;
          const isExpanded = expandedClusterIds.has(cluster.id);
          return (
            <div key={cluster.id}>
              <button onClick={() => toggleCluster(cluster.id)}
                className="w-full flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-muted-foreground hover:bg-accent transition-colors">
                {isExpanded ? <ChevronDown size={12} className="text-muted-foreground shrink-0" /> : <ChevronRight size={12} className="text-muted-foreground shrink-0" />}
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: colors.color }} />
                {cluster.label}
                <span className="ml-auto text-[9px] font-mono px-1.5 py-px rounded bg-muted text-muted-foreground">{cluster.nodeIds.length}</span>
              </button>
              {isExpanded && nodes.map((node: any) => (
                <button key={node.id} onClick={() => openDetail(node.id)}
                  className={`w-full flex items-center gap-1.5 text-left text-xs transition-all pl-7 pr-3 py-1 ${
                    detailNodeId === node.id
                      ? 'bg-primary/10 text-primary font-medium border-r-2 border-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground border-r-2 border-transparent'
                  }`}>
                  <span className="text-[10px] w-3.5 text-center">{ROLE_ICONS[node.role] || '📄'}</span>
                  <span className="flex-1 truncate">{node.label}</span>
                  {node.metadata.connectionCount > 0 && <span className="text-[9px] font-mono text-muted-foreground">{node.metadata.connectionCount}</span>}
                </button>
              ))}
            </div>
          );
        })}

        {leftTab === 'architecture' && (
          <div className="px-2.5">
            {LAYER_FLOW_ORDER.map((layer, i) => {
              const cluster = graphData.clusters.find((c: any) => c.layer === layer);
              if (!cluster) return null;
              const colors = LAYER_COLORS[layer];
              const nodes = cluster.nodeIds.map((id: string) => graphData.nodes.find((n: any) => n.id === id)).filter(Boolean);
              const prevLayer = LAYER_FLOW_ORDER[i - 1];
              const arrowKey = prevLayer ? `${prevLayer}→${layer}` : null;
              return (
                <div key={layer}>
                  {arrowKey && FLOW_ARROWS[arrowKey] && (
                    <div className="flex flex-col items-center py-0.5">
                      <div className="w-px h-2.5 bg-border" />
                      <span className="text-[8px] font-mono px-1.5 py-px rounded my-0.5 bg-card border border-border text-muted-foreground">{FLOW_ARROWS[arrowKey]}</span>
                      <div className="w-px h-2.5 bg-border" />
                    </div>
                  )}
                  <div className="rounded-lg overflow-hidden mb-1 bg-muted border border-border">
                    <div className="flex items-center gap-2 px-3 py-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: colors.color }} />
                      <span className="text-xs font-semibold" style={{ color: colors.color }}>{FLOW_LABELS[layer]}</span>
                      <span className="ml-auto text-[9px] font-mono text-muted-foreground">{nodes.length}</span>
                    </div>
                    <div className="border-t border-border">
                      {nodes.map((node: any) => (
                        <button key={node.id} onClick={() => openDetail(node.id)}
                          className={`w-full flex items-center gap-1.5 px-3 py-1.5 text-[11px] text-left transition-all ${
                            detailNodeId === node.id ? 'bg-primary/5 text-primary font-medium' : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                          }`}>
                          <span className="text-[9px] w-3.5 text-center">{ROLE_ICONS[node.role] || '📄'}</span>
                          <span className="truncate">{node.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );
}
