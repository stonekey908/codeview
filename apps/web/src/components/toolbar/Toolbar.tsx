'use client';

import { useState, useCallback } from 'react';
import { useGraphStore } from '@/store/graph-store';
import { GeneratePanel } from '@/components/generate/GeneratePanel';
import { HelpGuide } from '@/components/help/HelpGuide';
import { buildRfNodes } from '@/lib/build-rf-nodes';
import { computeLayout } from '@codeview/graph-engine';

export function Toolbar() {
  const { theme, setTheme, graphData, expandAllClusters, collapseAllClusters, expandedClusterIds, focusedNodeId, setFocusedNode, setGraphData, setRfNodes, setRfEdges } = useGraphStore();
  const [showGenerate, setShowGenerate] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [enhanceStatus, setEnhanceStatus] = useState('');

  const total = graphData?.nodes.length ?? 0;
  const conns = graphData?.edges.length ?? 0;
  const allExpanded = expandedClusterIds.size === (graphData?.clusters.length ?? 0);

  // Refetch data from API without page reload
  const refetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/analysis');
      if (res.ok) {
        const data = await res.json();
        if (data.graph) {
          setGraphData(data.graph);
          const layout = await computeLayout(data.graph);
          const { nodes, edges } = buildRfNodes(data.graph, layout, theme);
          setRfNodes(nodes);
          setRfEdges(edges);
        }
      }
    } catch {}
  }, [theme, setGraphData, setRfNodes, setRfEdges]);

  const runEnhance = async () => {
    setEnhancing(true);
    setEnhanceStatus('Starting...');
    try {
      const res = await fetch('/api/enhance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const data = await res.json();
      if (data.error) { setEnhanceStatus(`Error: ${data.error}`); setTimeout(() => { setEnhancing(false); setEnhanceStatus(''); }, 3000); return; }
      setEnhanceStatus(`Analysing ${data.total || total} components...`);

      const poll = setInterval(async () => {
        try {
          const r = await fetch('/api/enhance');
          const d = await r.json();
          if (d.status === 'done') {
            setEnhanceStatus(`Done — ${d.count} enhanced`);
            clearInterval(poll);
            // Refetch data instead of page reload — preserves all state
            await refetchData();
            setTimeout(() => { setEnhancing(false); setEnhanceStatus(''); }, 2000);
          } else if (d.status === 'running') {
            const batchInfo = d.batches > 1 ? ` (batch ${d.batch}/${d.batches})` : '';
            setEnhanceStatus(`${d.done}/${d.total}${batchInfo}`);
          } else if (d.status === 'error') {
            setEnhanceStatus('Failed');
            clearInterval(poll);
            setTimeout(() => { setEnhancing(false); setEnhanceStatus(''); }, 3000);
          }
        } catch {}
      }, 2500);
      setTimeout(() => { clearInterval(poll); setEnhancing(false); setEnhanceStatus(''); }, 300000);
    } catch { setEnhancing(false); setEnhanceStatus(''); }
  };

  return (
    <>
    <header className="flex items-center justify-between px-4 h-12 border-b border-border bg-card">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-[22px] h-[22px] rounded-md bg-gradient-to-br from-primary to-green-500 flex items-center justify-center text-[9px] text-primary-foreground font-bold">CV</div>
          <span className="text-sm font-bold tracking-tight">CodeView</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-muted border border-border rounded-xl text-[10px] font-mono text-muted-foreground">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          {total > 0 ? `${total} components · ${conns} connections` : 'No project loaded'}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button onClick={() => allExpanded ? collapseAllClusters() : expandAllClusters()}
          aria-label={allExpanded ? 'Collapse all groups' : 'Expand all groups'}
          className="px-3 py-1 text-[11px] font-medium rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-all">
          {allExpanded ? '↕ Collapse' : '↕ Expand'}
        </button>
        <button onClick={runEnhance} disabled={enhancing}
          className={`px-3 py-1 text-[11px] font-medium rounded-lg border transition-all flex items-center gap-1.5 ${enhancing ? 'border-[#b08d57]/30 text-[#b08d57] bg-[#b08d57]/10' : 'border-[#b08d57]/20 text-[#b08d57] hover:bg-[#b08d57]/10'}`}>
          {enhancing && <span className="inline-block w-3 h-3 border-2 border-[#b08d57] border-t-transparent rounded-full animate-spin" />}
          {enhancing ? enhanceStatus : '⚡ Enhance'}
        </button>
        <button onClick={() => setShowGenerate(true)}
          className="px-3 py-1 text-[11px] font-medium rounded-lg border border-[#8b7a9e]/20 text-[#8b7a9e] hover:bg-[#8b7a9e]/10 transition-all">
          ✨ Explain
        </button>
        {focusedNodeId && (
          <button onClick={() => setFocusedNode(null)} className="px-3 py-1 text-[11px] font-medium rounded-lg bg-primary/10 border border-primary/30 text-primary">Exit Focus</button>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <button onClick={() => setShowHelp(true)}
          aria-label="Help guide"
          className="w-7 h-7 flex items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors text-xs font-bold">
          ?
        </button>
        <button onClick={() => {
          const next = theme === 'dark' ? 'light' : 'dark';
          setTheme(next);
          document.documentElement.classList.toggle('dark', next === 'dark');
          try { localStorage.setItem('codeview-theme', next); } catch {}
        }}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          className="w-7 h-7 flex items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
          ◐
        </button>
      </div>
    </header>
    {showGenerate && <GeneratePanel onClose={() => setShowGenerate(false)} />}
    {showHelp && <HelpGuide onClose={() => setShowHelp(false)} />}
    </>
  );
}
