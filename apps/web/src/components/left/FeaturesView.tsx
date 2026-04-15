'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useGraphStore } from '@/store/graph-store';
import { LAYER_COLORS } from '@/components/canvas/layer-colors';
import type { ArchitecturalLayer } from '@codeview/shared';

interface OverviewFeature {
  icon: string;
  title: string;
  description: string;
  layer: string;
  componentPaths: string[];
}

interface OverviewFlow {
  title: string;
  description: string;
  steps: { title: string; description: string; layer: string; componentPaths: string[] }[];
}

interface OverviewCapability {
  icon: string;
  title: string;
  description: string;
  componentPaths: string[];
}

interface OverviewData {
  features: OverviewFeature[];
  flows: OverviewFlow[];
  backend: { icon: string; title: string; description: string; componentPaths: string[] }[];
  capabilities?: OverviewCapability[];
}

export function FeaturesView({ searchQuery = '' }: { searchQuery?: string }) {
  const { graphData, openDetail, detailNodeId, setLeftTab, setCapabilities } = useGraphStore();
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch('/api/overview').then(r => r.json()).then(d => {
      if (d.overview) {
        setOverview(d.overview);
        if (d.overview.capabilities) setCapabilities(d.overview.capabilities);
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, [setCapabilities]);

  const toggleGroup = (id: string) => {
    const next = new Set(expandedGroups);
    if (next.has(id)) next.delete(id); else next.add(id);
    setExpandedGroups(next);
  };

  const drillDown = (paths: string[], groupId?: string) => {
    if (!graphData) return;
    // Auto-expand the parent group
    if (groupId && !expandedGroups.has(groupId)) {
      setExpandedGroups(prev => new Set([...prev, groupId]));
    }
    for (const p of paths) {
      const node = graphData.nodes.find(n => n.relativePath === p || n.id === p);
      if (node) { openDetail(node.id); return; }
    }
  };

  const resolveNode = (paths: string[]) => {
    if (!graphData) return null;
    for (const p of paths) {
      const node = graphData.nodes.find(n => n.relativePath === p || n.id === p);
      if (node) return node;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="px-4 py-8 text-center">
        <span className="inline-block w-5 h-5 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin mb-2" />
        <p className="text-xs text-muted-foreground">Loading features...</p>
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-xs text-muted-foreground mb-3">Generate an Overview first to see features grouped by business function.</p>
        <button onClick={() => setLeftTab('overview')}
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
          📖 Go to Overview
        </button>
      </div>
    );
  }

  // Build feature groups from overview data: features + flows + backend
  const groups: { id: string; icon: string; title: string; description: string; items: { name: string; layer: string; paths: string[] }[] }[] = [];

  // Add features
  overview.features?.forEach((f, i) => {
    const flowMatch = overview.flows?.find(fl =>
      fl.steps.some(s => s.componentPaths.some(p => f.componentPaths.includes(p)))
    );

    const items: { name: string; layer: string; paths: string[] }[] = [];

    // If there's a matching flow, use its steps for ordering
    if (flowMatch) {
      for (const step of flowMatch.steps) {
        const node = resolveNode(step.componentPaths);
        items.push({
          name: node?.label || step.title,
          layer: step.layer,
          paths: step.componentPaths,
        });
      }
    }

    // Also add the feature's own component paths if not already included
    for (const p of f.componentPaths) {
      if (!items.some(item => item.paths.includes(p))) {
        const node = graphData?.nodes.find(n => n.relativePath === p || n.id === p);
        if (node) {
          items.push({ name: node.label, layer: node.layer, paths: [p] });
        }
      }
    }

    if (items.length > 0) {
      groups.push({ id: `feature-${i}`, icon: f.icon, title: f.title, description: f.description, items });
    }
  });

  // Add backend as a group
  if (overview.backend?.length > 0) {
    const backendItems = overview.backend.map(b => {
      const node = resolveNode(b.componentPaths);
      return { name: node?.label || b.title, layer: 'external', paths: b.componentPaths };
    });
    groups.push({ id: 'backend', icon: '⚙️', title: 'Behind the Scenes', description: 'Cloud functions and server-side services', items: backendItems });
  }

  return (
    <div className="px-2 py-1">
      {groups.map(group => {
        // Filter items by search query
        const filteredItems = searchQuery
          ? group.items.filter(item => {
              const node = resolveNode(item.paths);
              const label = node?.label || item.name;
              const path = node?.relativePath || item.paths[0] || '';
              return label.toLowerCase().includes(searchQuery.toLowerCase()) || path.toLowerCase().includes(searchQuery.toLowerCase());
            })
          : group.items;
        if (searchQuery && filteredItems.length === 0) return null;
        // Auto-expand if the active detail node is inside this group
        const containsActive = detailNodeId && group.items.some(item => {
          const node = resolveNode(item.paths);
          return node?.id === detailNodeId;
        });
        const isExpanded = expandedGroups.has(group.id) || !!containsActive || !!searchQuery;
        return (
          <div key={group.id} className="mb-1.5 bg-muted border border-border rounded-lg overflow-hidden">
            {/* Header */}
            <button onClick={() => toggleGroup(group.id)}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-accent/50">
              <span className="text-sm">{group.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-semibold text-foreground">{group.title}</div>
                <div className="text-[10px] text-muted-foreground leading-snug">{group.description}</div>
              </div>
              <span className="text-[9px] font-mono text-muted-foreground bg-card border border-border px-1.5 py-0.5 rounded">
                {filteredItems.length}
              </span>
              {isExpanded ? <ChevronDown size={12} className="text-muted-foreground shrink-0" /> : <ChevronRight size={12} className="text-muted-foreground shrink-0" />}
            </button>

            {/* Expanded items */}
            {isExpanded && (
              <div className="border-t border-border">
                {filteredItems.map((item, i) => {
                  const node = resolveNode(item.paths);
                  const layerColor = LAYER_COLORS[item.layer as ArchitecturalLayer]?.color || '#7c8594';
                  const isActive = node && detailNodeId === node.id;

                  return (
                    <div key={i}>
                      {i > 0 && (
                        <div className="flex pl-5"><div className="w-px h-2 bg-border" /></div>
                      )}
                      <button
                        onClick={() => item.paths.length > 0 && drillDown(item.paths, group.id)}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-left transition-all ${
                          isActive ? 'bg-primary/8 text-primary font-medium' : 'text-muted-foreground hover:bg-accent/30 hover:text-foreground'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: layerColor }} />
                        <span className="flex-1 truncate">{item.name}</span>
                        <span className="text-[8px] font-mono px-1 py-0.5 rounded" style={{ color: layerColor, background: `${layerColor}12` }}>
                          {item.layer}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
