'use client';

import { useEffect, useState } from 'react';
import { useGraphStore } from '@/store/graph-store';
import { LAYER_COLORS } from '@/components/canvas/layer-colors';
import type { ArchitecturalLayer } from '@codeview/shared';

interface OverviewData {
  appName: string;
  summary: string;
  stats: { screens: number; cloudFunctions: number; aiFeatures: number; dataTypes: number };
  features: { icon: string; title: string; description: string; layer: string; componentPaths: string[] }[];
  flows: { title: string; description: string; steps: { title: string; description: string; layer: string; componentPaths: string[] }[] }[];
  backend: { icon: string; title: string; description: string; componentPaths: string[] }[];
  dataTypes: { name: string; description: string }[];
  generatedAt: string;
  componentCount: number;
}

export function OverviewPanel() {
  const { openDetail, graphData, setLeftTab } = useGraphStore();

  const drillDown = (nodeId: string) => {
    setLeftTab('features');
    openDetail(nodeId);
  };
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetch('/api/overview').then(r => r.json()).then(d => {
      if (d.overview) setOverview(d.overview);
      if (d.status === 'running') setGenerating(true);
    }).catch(() => {});
  }, []);

  // Poll while generating
  useEffect(() => {
    if (!generating) return;
    const poll = setInterval(async () => {
      const r = await fetch('/api/overview');
      const d = await r.json();
      if (d.status === 'done' && d.overview) {
        setOverview(d.overview);
        setGenerating(false);
        clearInterval(poll);
      } else if (d.status === 'error') {
        setGenerating(false);
        clearInterval(poll);
      }
    }, 2000);
    return () => clearInterval(poll);
  }, [generating]);

  const generate = async () => {
    setGenerating(true);
    try {
      await fetch('/api/overview', { method: 'POST' });
    } catch { setGenerating(false); }
  };

  const findNodeByPath = (paths: string[]) => {
    if (!graphData) return null;
    for (const p of paths) {
      const node = graphData.nodes.find(n => n.relativePath === p || n.id === p);
      if (node) return node;
    }
    return null;
  };

  const CompMention = ({ paths, label }: { paths: string[]; label: string }) => {
    const node = findNodeByPath(paths);
    const layer = node?.layer as ArchitecturalLayer | undefined;
    const color = layer ? LAYER_COLORS[layer].color : '#7c8594';
    return (
      <button onClick={() => node && drillDown(node.id)}
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium transition-colors hover:opacity-80"
        style={{ background: `${color}12`, color }}>
        <span className="w-1 h-1 rounded-full" style={{ background: color }} />
        {label}
      </button>
    );
  };

  // Empty state — no overview yet
  if (!overview && !generating) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="text-center max-w-md">
          <div className="text-4xl mb-4">📖</div>
          <h2 className="text-lg font-bold mb-2 text-foreground">Generate Project Overview</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Create an interactive narrative that explains what this app does, its key features, and how everything connects — written for non-technical stakeholders.
          </p>
          <button onClick={generate}
            className="px-5 py-2.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
            📖 Generate Overview
          </button>
        </div>
      </div>
    );
  }

  // Generating state
  if (generating && !overview) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="text-center">
          <span className="inline-block w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm text-muted-foreground">Claude is reading your codebase and writing the overview...</p>
          <p className="text-xs text-muted-foreground mt-1">This takes 30-60 seconds</p>
        </div>
      </div>
    );
  }

  if (!overview) return null;

  const timeAgo = overview.generatedAt ? formatTimeAgo(overview.generatedAt) : 'unknown';

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="max-w-[780px] mx-auto px-10 py-8 pb-16">
        {/* Regenerate banner */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-card border border-border rounded-lg mb-8">
          <div className="text-xs text-muted-foreground">
            <strong className="text-foreground">Last generated:</strong> {timeAgo} · Based on {overview.componentCount || '?'} components
          </div>
          <button onClick={generate} disabled={generating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            {generating ? <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> : '↻'}
            {generating ? 'Generating...' : 'Regenerate'}
          </button>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">{overview.appName}</h1>
          <p className="text-[15px] text-muted-foreground leading-relaxed">{overview.summary}</p>

          <div className="grid grid-cols-4 gap-3 mt-5">
            {[
              { val: overview.stats.screens, label: 'Screens', color: LAYER_COLORS.ui.color },
              { val: overview.stats.cloudFunctions, label: 'Cloud Functions', color: LAYER_COLORS.external.color },
              { val: overview.stats.aiFeatures, label: 'AI Features', color: LAYER_COLORS.external.color },
              { val: overview.stats.dataTypes, label: 'Data Types', color: LAYER_COLORS.data.color },
            ].map(s => (
              <div key={s.label} className="bg-card border border-border rounded-lg p-3.5 text-center">
                <div className="text-2xl font-bold" style={{ color: s.color }}>{s.val}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Features */}
        {overview.features?.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-bold tracking-tight text-foreground mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ background: LAYER_COLORS.ui.color }} />
              Key Features
            </h2>
            <p className="text-sm text-muted-foreground mb-3">The main things users can do with this app:</p>
            <div className="grid grid-cols-2 gap-2.5">
              {overview.features.map((f, i) => {
                const layerColor = LAYER_COLORS[f.layer as ArchitecturalLayer]?.color || '#7c8594';
                return (
                  <button key={i} onClick={() => { const n = findNodeByPath(f.componentPaths); if (n) drillDown(n.id); }}
                    className="text-left bg-card border border-border rounded-lg p-3.5 transition-all hover:border-primary/30 hover:-translate-y-0.5 hover:shadow-sm">
                    <h3 className="text-[13px] font-semibold mb-1 flex items-center gap-1.5">
                      <span>{f.icon}</span> {f.title}
                      <span className="text-[9px] font-medium px-1.5 py-0.5 rounded" style={{ background: `${layerColor}12`, color: layerColor }}>{f.layer}</span>
                    </h3>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{f.description}</p>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Flows */}
        {overview.flows?.length > 0 && overview.flows.map((flow, fi) => (
          <section key={fi} className="mb-8">
            <h2 className="text-lg font-bold tracking-tight text-foreground mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ background: LAYER_COLORS.api.color }} />
              {flow.title}
            </h2>
            <p className="text-sm text-muted-foreground mb-3">{flow.description}</p>
            <div className="bg-card border border-border rounded-xl p-5">
              {flow.steps.map((step, si) => {
                const stepColor = LAYER_COLORS[step.layer as ArchitecturalLayer]?.color || '#7c8594';
                return (
                  <div key={si}>
                    {si > 0 && <div className="flex justify-start pl-3"><div className="w-px h-3 bg-border" /></div>}
                    <div className="flex items-start gap-3 py-1.5 px-2 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                      onClick={() => { const n = findNodeByPath(step.componentPaths); if (n) drillDown(n.id); }}>
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5"
                        style={{ background: stepColor }}>{si + 1}</div>
                      <div>
                        <div className="text-[13px] font-semibold text-foreground">{step.title}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">{step.description}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        {/* Backend */}
        {overview.backend?.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-bold tracking-tight text-foreground mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ background: LAYER_COLORS.external.color }} />
              Behind the Scenes
            </h2>
            <div className="grid grid-cols-2 gap-2.5">
              {overview.backend.map((b, i) => {
                const node = findNodeByPath(b.componentPaths);
                return (
                  <button key={i} onClick={() => node && drillDown(node.id)}
                    className="text-left bg-card border border-border rounded-lg p-3.5 transition-all hover:border-primary/30 hover:-translate-y-0.5 hover:shadow-sm">
                    <h3 className="text-[13px] font-semibold mb-1">{b.icon} {b.title}</h3>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{b.description}</p>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Data Types */}
        {overview.dataTypes?.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-bold tracking-tight text-foreground mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ background: LAYER_COLORS.data.color }} />
              What Data is Stored
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {overview.dataTypes.map((d, i) => (
                <div key={i} className="bg-card border border-border rounded-lg p-3 text-center">
                  <div className="text-[13px] font-semibold text-foreground">{d.name}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{d.description}</div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function formatTimeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} minute${mins > 1 ? 's' : ''} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}
