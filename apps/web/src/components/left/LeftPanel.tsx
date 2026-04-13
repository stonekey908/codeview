'use client';

import { useGraphStore } from '@/store/graph-store';
import { LAYER_COLORS, LAYER_LABELS } from '@/components/canvas/layer-colors';
import type { ArchitecturalLayer } from '@codeview/shared';

const LAYER_FLOW_ORDER: ArchitecturalLayer[] = ['ui', 'utils', 'api', 'external', 'data'];
const FLOW_LABELS: Record<ArchitecturalLayer, string> = {
  ui: 'What Users See', utils: 'Data Hub', api: 'API Endpoints',
  external: 'AI & External', data: 'Static Datasets',
};
const FLOW_ARROWS: Record<string, string> = {
  'ui→utils': 'request data via',
  'utils→api': 'which calls',
  'api→external': 'which ask',
  'external→data': 'falls back to',
};

const ROLE_ICONS: Record<string, string> = {
  page: '📄', component: '🧩', layout: '📐', 'api-route': '⚡',
  middleware: '🔒', model: '💾', schema: '📋', utility: '🔧',
  hook: '🪝', context: '🔧', service: '🔗', config: '⚙️', unknown: '📄',
};

export function LeftPanel() {
  const {
    graphData, leftTab, setLeftTab, theme, viewMode,
    openDetail, detailNodeId, expandedClusterIds, toggleCluster,
  } = useGraphStore();
  const isDark = theme === 'dark';

  if (!graphData) return <div className="border-r" style={{ borderColor: isDark ? '#1e1e28' : '#e5e7eb', background: isDark ? '#111114' : '#ffffff' }} />;

  return (
    <nav className="flex flex-col overflow-hidden" style={{ background: isDark ? '#111114' : '#ffffff', borderRight: `1px solid ${isDark ? '#1e1e28' : '#e5e7eb'}` }}>
      {/* Tabs */}
      <div className="flex border-b" style={{ borderColor: isDark ? '#1e1e28' : '#e5e7eb' }}>
        {(['categories', 'architecture'] as const).map((tab) => (
          <button key={tab} onClick={() => setLeftTab(tab)}
            className="flex-1 py-2.5 text-[11px] font-semibold text-center capitalize transition-all border-b-2"
            style={{
              borderColor: leftTab === tab ? '#5b8af5' : 'transparent',
              color: leftTab === tab ? (isDark ? '#f4f4f8' : '#111827') : (isDark ? '#505068' : '#9ca3af'),
            }}>
            {tab}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="mx-2.5 my-2.5 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs"
        style={{ background: isDark ? '#1a1a1f' : '#f3f4f6', border: `1px solid ${isDark ? '#1e1e28' : '#e5e7eb'}` }}>
        <span style={{ color: isDark ? '#505068' : '#9ca3af' }}>🔍</span>
        <input placeholder="Search..." className="flex-1 bg-transparent border-none outline-none text-xs"
          style={{ color: isDark ? '#f4f4f8' : '#111827', fontFamily: 'var(--font-body)' }} />
        <kbd className="text-[9px] px-1 py-px rounded" style={{ background: isDark ? '#252530' : '#e5e7eb', color: isDark ? '#505068' : '#9ca3af', border: `1px solid ${isDark ? '#2a2a38' : '#d1d5db'}` }}>/</kbd>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-4">
        {leftTab === 'categories' && (
          <CategoriesView graphData={graphData} isDark={isDark} viewMode={viewMode}
            detailNodeId={detailNodeId} openDetail={openDetail}
            expandedClusterIds={expandedClusterIds} toggleCluster={toggleCluster} />
        )}
        {leftTab === 'architecture' && (
          <ArchitectureView graphData={graphData} isDark={isDark} openDetail={openDetail} detailNodeId={detailNodeId} />
        )}
      </div>
    </nav>
  );
}

function CategoriesView({ graphData, isDark, viewMode, detailNodeId, openDetail, expandedClusterIds, toggleCluster }: any) {
  return (
    <>
      {graphData.clusters.map((cluster: any) => {
        const colors = LAYER_COLORS[cluster.layer as ArchitecturalLayer];
        const nodes = cluster.nodeIds.map((id: string) => graphData.nodes.find((n: any) => n.id === id)).filter(Boolean);
        const isExpanded = expandedClusterIds.has(cluster.id);

        return (
          <div key={cluster.id}>
            <button onClick={() => toggleCluster(cluster.id)}
              className="w-full flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold transition-colors"
              style={{ color: isDark ? '#9090a8' : '#6b7280' }}
              onMouseEnter={e => e.currentTarget.style.background = isDark ? '#1a1a1f' : '#f3f4f6'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <span className="text-[8px]" style={{ color: isDark ? '#505068' : '#9ca3af' }}>{isExpanded ? '▼' : '▶'}</span>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: colors.color }} />
              {cluster.label}
              <span className="ml-auto text-[9px] font-mono px-1.5 py-px rounded"
                style={{ background: isDark ? '#1a1a1f' : '#f3f4f6', color: isDark ? '#505068' : '#9ca3af' }}>
                {cluster.nodeIds.length}
              </span>
            </button>
            {isExpanded && nodes.map((node: any) => (
              <button key={node.id} onClick={() => openDetail(node.id)}
                className="w-full flex items-center gap-1.5 text-left text-xs transition-all"
                style={{
                  padding: '4px 12px 4px 28px',
                  color: detailNodeId === node.id ? '#5b8af5' : (isDark ? '#9090a8' : '#6b7280'),
                  background: detailNodeId === node.id ? (isDark ? 'rgba(91,138,245,.08)' : 'rgba(59,130,246,.05)') : 'transparent',
                  fontWeight: detailNodeId === node.id ? 500 : 400,
                  borderRight: detailNodeId === node.id ? '2px solid #5b8af5' : '2px solid transparent',
                }}
                onMouseEnter={e => { if (detailNodeId !== node.id) e.currentTarget.style.background = isDark ? '#1a1a1f' : '#f3f4f6'; }}
                onMouseLeave={e => { if (detailNodeId !== node.id) e.currentTarget.style.background = 'transparent'; }}>
                <span className="text-[10px] w-3.5 text-center">{ROLE_ICONS[node.role] || '📄'}</span>
                <span className="flex-1 truncate">{node.label}</span>
                {node.metadata.connectionCount > 0 && (
                  <span className="text-[9px] font-mono" style={{ color: isDark ? '#505068' : '#9ca3af' }}>{node.metadata.connectionCount}</span>
                )}
              </button>
            ))}
          </div>
        );
      })}
    </>
  );
}

function ArchitectureView({ graphData, isDark, openDetail, detailNodeId }: any) {
  return (
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
                <div className="w-px h-2.5" style={{ background: isDark ? '#2a2a38' : '#d1d5db' }} />
                <span className="text-[8px] font-mono px-1.5 py-px rounded my-0.5"
                  style={{ background: isDark ? '#111114' : '#ffffff', border: `1px solid ${isDark ? '#1e1e28' : '#e5e7eb'}`, color: isDark ? '#505068' : '#9ca3af' }}>
                  {FLOW_ARROWS[arrowKey]}
                </span>
                <div className="w-px h-2.5" style={{ background: isDark ? '#2a2a38' : '#d1d5db' }} />
              </div>
            )}
            <div className="rounded-lg overflow-hidden mb-1"
              style={{ background: isDark ? '#1a1a1f' : '#f3f4f6', border: `1px solid ${isDark ? '#1e1e28' : '#e5e7eb'}` }}>
              <div className="flex items-center gap-2 px-3 py-2">
                <span className="w-2 h-2 rounded-full" style={{ background: colors.color }} />
                <span className="text-xs font-semibold" style={{ color: colors.color }}>{FLOW_LABELS[layer]}</span>
                <span className="ml-auto text-[9px] font-mono" style={{ color: isDark ? '#505068' : '#9ca3af' }}>{nodes.length}</span>
              </div>
              <div style={{ borderTop: `1px solid ${isDark ? '#1e1e28' : '#e5e7eb'}` }}>
                {nodes.map((node: any) => (
                  <button key={node.id} onClick={() => openDetail(node.id)}
                    className="w-full flex items-center gap-1.5 px-3 py-1.5 text-[11px] text-left transition-all"
                    style={{
                      color: detailNodeId === node.id ? '#5b8af5' : (isDark ? '#9090a8' : '#6b7280'),
                      background: detailNodeId === node.id ? (isDark ? 'rgba(91,138,245,.06)' : 'rgba(59,130,246,.04)') : 'transparent',
                      fontWeight: detailNodeId === node.id ? 500 : 400,
                    }}
                    onMouseEnter={e => { if (detailNodeId !== node.id) e.currentTarget.style.background = isDark ? 'rgba(255,255,255,.02)' : 'rgba(0,0,0,.02)'; }}
                    onMouseLeave={e => { if (detailNodeId !== node.id) e.currentTarget.style.background = 'transparent'; }}>
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
  );
}
