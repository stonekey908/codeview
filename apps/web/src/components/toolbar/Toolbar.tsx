'use client';

import { useState } from 'react';
import { useGraphStore } from '@/store/graph-store';
import { GeneratePanel } from '@/components/generate/GeneratePanel';

export function Toolbar() {
  const { viewMode, setViewMode, theme, setTheme, graphData, expandAllClusters, collapseAllClusters, expandedClusterIds, focusedNodeId, setFocusedNode } = useGraphStore();
  const [showGenerate, setShowGenerate] = useState(false);
  const [enhancing, setEnhancing] = useState(false);

  const total = graphData?.nodes.length ?? 0;
  const conns = graphData?.edges.length ?? 0;
  const allExpanded = expandedClusterIds.size === (graphData?.clusters.length ?? 0);

  const runEnhance = async () => {
    setEnhancing(true);
    try {
      await fetch('/api/enhance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const poll = setInterval(async () => {
        const r = await fetch('/api/enhance');
        const d = await r.json();
        if (d.status === 'done') { clearInterval(poll); setEnhancing(false); window.location.reload(); }
      }, 3000);
      setTimeout(() => { clearInterval(poll); setEnhancing(false); }, 120000);
    } catch { setEnhancing(false); }
  };

  return (
    <>
    <header className="flex items-center justify-between px-4 h-12 bg-zinc-900 border-b border-zinc-800">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-[22px] h-[22px] rounded bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center text-[9px] text-white font-bold">CV</div>
          <span className="text-sm font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>CodeView</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-800 border border-zinc-700 rounded-xl text-[10px] font-mono text-zinc-400">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          {total > 0 ? `${total} components · ${conns} connections` : 'No project loaded'}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button onClick={() => allExpanded ? collapseAllClusters() : expandAllClusters()}
          className="px-3 py-1 text-[11px] font-medium rounded-lg border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-all">
          {allExpanded ? '↕ Collapse' : '↕ Expand'}
        </button>
        <button onClick={runEnhance} disabled={enhancing}
          className={`px-3 py-1 text-[11px] font-medium rounded-lg border transition-all ${enhancing ? 'border-amber-500/30 text-amber-400 bg-amber-500/10' : 'border-amber-500/20 text-amber-400 hover:bg-amber-500/10'}`}>
          {enhancing ? '⚡ Enhancing...' : '⚡ Enhance'}
        </button>
        {viewMode === 'descriptive' && (
          <button onClick={() => setShowGenerate(true)}
            className="px-3 py-1 text-[11px] font-medium rounded-lg border border-purple-500/20 text-purple-400 hover:bg-purple-500/10 transition-all">
            ✨ Describe
          </button>
        )}
        {focusedNodeId && (
          <button onClick={() => setFocusedNode(null)} className="px-3 py-1 text-[11px] font-medium rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400">Exit Focus</button>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <button onClick={() => setViewMode(viewMode === 'descriptive' ? 'technical' : 'descriptive')}
          className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${viewMode === 'technical' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'border-zinc-700 text-zinc-400 hover:text-zinc-200'}`}>
          👁 Technical
        </button>
        <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="w-7 h-7 flex items-center justify-center rounded-md border border-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors">
          ◐
        </button>
      </div>
    </header>
    {showGenerate && <GeneratePanel onClose={() => setShowGenerate(false)} />}
    </>
  );
}
