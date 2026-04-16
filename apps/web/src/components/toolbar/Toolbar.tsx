'use client';

import { useState, useCallback, useRef } from 'react';
import { useGraphStore } from '@/store/graph-store';
import { GeneratePanel } from '@/components/generate/GeneratePanel';
import { HelpGuide } from '@/components/help/HelpGuide';
import { SettingsGear } from '@/components/settings/SettingsGear';
import { buildRfNodes } from '@/lib/build-rf-nodes';
import { computeLayout } from '@codeview/graph-engine';

export function Toolbar() {
  const { theme, setTheme, graphData, expandAllClusters, collapseAllClusters, expandedClusterIds, focusedNodeId, setFocusedNode, setGraphData, setRfNodes, setRfEdges } = useGraphStore();
  const [showGenerate, setShowGenerate] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Enhance state
  const [enhancing, setEnhancing] = useState(false);
  const [enhanceStatus, setEnhanceStatus] = useState('');
  const enhancePollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Explain state (tracks GeneratePanel progress)
  const [explaining, setExplaining] = useState(false);
  const [explainStatus, setExplainStatus] = useState('');

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

  const stopEnhance = () => {
    if (enhancePollRef.current) clearInterval(enhancePollRef.current);
    enhancePollRef.current = null;
    // Write stopped status server-side
    fetch('/api/enhance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stop: true }) });
    setEnhanceStatus('Stopped');
    setTimeout(() => { setEnhancing(false); setEnhanceStatus(''); }, 1500);
  };

  const startEnhancePoll = () => {
    setEnhancing(true);
    setEnhanceStatus('Starting...');
    enhancePollRef.current = setInterval(async () => {
      try {
        const r = await fetch('/api/enhance');
        const d = await r.json();
        if (d.status === 'done') {
          setEnhanceStatus(`Done — ${d.count} enhanced`);
          if (enhancePollRef.current) clearInterval(enhancePollRef.current);
          enhancePollRef.current = null;
          await refetchData();
          setTimeout(() => { setEnhancing(false); setEnhanceStatus(''); }, 2000);
        } else if (d.status === 'running') {
          const batchInfo = d.batches > 1 ? ` (batch ${d.batch}/${d.batches})` : '';
          setEnhanceStatus(`${d.done}/${d.total}${batchInfo}`);
        } else if (d.status === 'error' || d.status === 'stopped') {
          setEnhanceStatus(d.status === 'stopped' ? 'Stopped' : 'Failed');
          if (enhancePollRef.current) clearInterval(enhancePollRef.current);
          enhancePollRef.current = null;
          setTimeout(() => { setEnhancing(false); setEnhanceStatus(''); }, 2000);
        }
      } catch {}
    }, 2500);
    setTimeout(() => {
      if (enhancePollRef.current) { clearInterval(enhancePollRef.current); enhancePollRef.current = null; }
      setEnhancing(false); setEnhanceStatus('');
    }, 300000);
  };

  const runEnhance = async () => {
    try {
      const res = await fetch('/api/enhance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const data = await res.json();
      if (data.error) { setEnhancing(true); setEnhanceStatus(`Error: ${data.error}`); setTimeout(() => { setEnhancing(false); setEnhanceStatus(''); }, 3000); return; }
      startEnhancePoll();
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

        {/* Enhance button with stop */}
        {enhancing ? (
          <div className="flex items-center gap-1">
            <span className="px-3 py-1 text-[11px] font-medium rounded-lg border border-[#b08d57]/30 text-[#b08d57] bg-[#b08d57]/10 flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 border-2 border-[#b08d57] border-t-transparent rounded-full animate-spin" />
              {enhanceStatus}
            </span>
            <button onClick={stopEnhance}
              className="px-2 py-1 text-[10px] font-medium rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors">
              Stop
            </button>
          </div>
        ) : (
          <button onClick={runEnhance}
            className="px-3 py-1 text-[11px] font-medium rounded-lg border border-[#b08d57]/20 text-[#b08d57] hover:bg-[#b08d57]/10 transition-all">
            ⚡ Enhance
          </button>
        )}

        {/* Explain button with progress */}
        {explaining ? (
          <span className="px-3 py-1 text-[11px] font-medium rounded-lg border border-[#8b7a9e]/30 text-[#8b7a9e] bg-[#8b7a9e]/10 flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 border-2 border-[#8b7a9e] border-t-transparent rounded-full animate-spin" />
            {explainStatus}
          </span>
        ) : (
          <button onClick={() => setShowGenerate(true)}
            className="px-3 py-1 text-[11px] font-medium rounded-lg border border-[#8b7a9e]/20 text-[#8b7a9e] hover:bg-[#8b7a9e]/10 transition-all">
            ✨ Explain
          </button>
        )}

        {focusedNodeId && (
          <button onClick={() => setFocusedNode(null)} className="px-3 py-1 text-[11px] font-medium rounded-lg bg-primary/10 border border-primary/30 text-primary">Exit Focus</button>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <SettingsGear
          onRegenerate={(mode) => {
            if (mode === 'all') {
              fetch('/api/enhance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clear: true }) });
            } else {
              fetch('/api/enhance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
            }
            startEnhancePoll();
          }}
          onProjectLoaded={() => {
            // Force full reload to re-init the whole app with the new project
            window.location.reload();
          }}
        />
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
    {showGenerate && (
      <GeneratePanel
        onClose={() => setShowGenerate(false)}
        onProgressChange={(generating, status) => {
          setExplaining(generating);
          setExplainStatus(status);
        }}
      />
    )}
    {showHelp && <HelpGuide onClose={() => setShowHelp(false)} />}
    </>
  );
}
