'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useGraphStore } from '@/store/graph-store';
import { LAYER_COLORS, LAYER_LABELS } from '@/components/canvas/layer-colors';
import type { ArchitecturalLayer } from '@codeview/shared';
import ReactMarkdown from 'react-markdown';

function classifyRelation(layer: ArchitecturalLayer): string {
  if (layer === 'ui') return 'renders';
  if (layer === 'api') return 'fetches from';
  if (layer === 'data') return 'stores in';
  if (layer === 'external') return 'connects to';
  return 'uses';
}

const RELATION_COLORS: Record<string, string> = {
  renders: '#4a90a4', 'fetches from': '#5a8a6e', uses: '#7c8594',
  'stores in': '#b08d57', 'connects to': '#8b7a9e',
};

export function DetailPanel({ fullWidth }: { fullWidth?: boolean }) {
  const {
    detailNodeId, detailNavStack, detailMode,
    closeDetail, goBackDetail, navigateDetail, expandDetail, shrinkDetail,
    graphData, viewMode, theme, getNodeById, getDependencies, getDependents, claudeExplanations,
    detailWidth, setDetailWidth,
  } = useGraphStore();

  const [fileContent, setFileContent] = useState<string | null>(null);
  const [highlightedHtml, setHighlightedHtml] = useState<string | null>(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [claudeLoading, setClaudeLoading] = useState(false);
  const [claudeExpl, setClaudeExpl] = useState<string | null>(null);
  const [tab, setTab] = useState<'overview' | 'connections' | 'code'>('overview');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingPathRef = useRef<string | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      pendingPathRef.current = null;
    };
  }, []);

  const node = detailNodeId ? getNodeById(detailNodeId) : null;
  const isDark = theme === 'dark';

  // Load file content + syntax highlighting for code tab
  useEffect(() => {
    if (!node || tab !== 'code') return;
    setFileLoading(true);
    setHighlightedHtml(null);
    fetch(`/api/file-content?path=${encodeURIComponent(node.relativePath)}`)
      .then(r => r.json())
      .then(async (d) => {
        const code = d.content || 'Could not load file';
        setFileContent(code);
        if (d.content) {
          // Detect language from extension
          const ext = node.relativePath.split('.').pop() || 'tsx';
          const langMap: Record<string, string> = {
            ts: 'typescript', tsx: 'tsx', js: 'javascript', jsx: 'jsx',
            mjs: 'javascript', mts: 'typescript', json: 'json', css: 'css',
          };
          try {
            const hRes = await fetch('/api/highlight', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ code: d.content, lang: langMap[ext] || 'tsx' }),
            });
            const hData = await hRes.json();
            if (hData.html) setHighlightedHtml(hData.html);
          } catch {}
        }
      })
      .catch(() => setFileContent('Could not load file'))
      .finally(() => setFileLoading(false));
  }, [node?.relativePath, tab]);

  // Check cached descriptions
  useEffect(() => {
    if (!node) return;
    setClaudeExpl(claudeExplanations[node.id] || null);
    fetch('/api/ask-claude').then(r => r.json()).then(d => {
      if (d.descriptions?.[node.relativePath]) setClaudeExpl(d.descriptions[node.relativePath]);
    }).catch(() => {});
  }, [node?.relativePath, node?.id, claudeExplanations]);

  // Persistent polling that survives re-renders and navigation
  useEffect(() => {
    // If we come back to a node that has a pending request, show loading
    if (node && pendingPathRef.current === node.relativePath) {
      setClaudeLoading(true);
    }
    return () => {}; // Don't clear poll on unmount — it's in a ref
  }, [node?.relativePath]);

  // Check for completed requests on every render
  useEffect(() => {
    if (!pendingPathRef.current) return;
    const checkResult = async () => {
      try {
        const r = await fetch('/api/ask-claude');
        const d = await r.json();
        const path = pendingPathRef.current;
        if (path && d.descriptions?.[path]) {
          if (node?.relativePath === path) {
            setClaudeExpl(d.descriptions[path]);
            setClaudeLoading(false);
          }
          pendingPathRef.current = null;
          if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
        }
      } catch {}
    };
    checkResult();
  }, [node?.relativePath]);

  const askClaude = async () => {
    if (!node) return;
    const targetPath = node.relativePath;
    const previousExpl = claudeExpl;
    setClaudeLoading(true);
    setClaudeExpl(null);
    pendingPathRef.current = targetPath;

    // Clear any existing poll
    if (pollRef.current) clearInterval(pollRef.current);

    try {
      await fetch('/api/trigger-claude', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'explain', componentPath: targetPath }),
      });
      // Poll using ref — survives navigation and re-renders
      pollRef.current = setInterval(async () => {
        try {
          const r = await fetch('/api/ask-claude');
          const d = await r.json();
          const newDesc = d.descriptions?.[targetPath];
          if (newDesc && newDesc !== previousExpl) {
            // Update if we're still on the same node
            const currentNode = useGraphStore.getState().getNodeById(useGraphStore.getState().detailNodeId || '');
            if (currentNode?.relativePath === targetPath) {
              setClaudeExpl(newDesc);
              setClaudeLoading(false);
            }
            pendingPathRef.current = null;
            if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
          }
        } catch {}
      }, 2500);
      setTimeout(() => {
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
        pendingPathRef.current = null;
        setClaudeLoading(false);
      }, 90000);
    } catch { setClaudeLoading(false); pendingPathRef.current = null; }
  };

  if (!detailNodeId || !graphData || !node) return null;

  const colors = LAYER_COLORS[node.layer];
  const deps = getDependencies(detailNodeId);
  const dependents = getDependents(detailNodeId);
  const canGoBack = detailNavStack.length > 0;
  const isExpanded = detailMode === 'expanded';

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = detailWidth;
    const onMove = (me: MouseEvent) => {
      const diff = startX - me.clientX;
      setDetailWidth(startWidth + diff);
    };
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
  }, [detailWidth, setDetailWidth]);

  return (
    <div className={`h-full overflow-y-auto animate-in slide-in-from-right-4 duration-200 relative ${isExpanded ? 'bg-background' : 'bg-card border-l border-border'}`}>
      {/* Resize handle */}
      {!isExpanded && (
        <div onMouseDown={handleResizeStart}
          className="resize-handle absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-primary/20 active:bg-primary/30 transition-colors z-20" />
      )}
      <div className={isExpanded ? 'max-w-[860px] mx-auto' : ''}>
        {/* Header */}
        <div className={`sticky top-0 z-10 px-5 py-3 border-b border-border ${isExpanded ? 'bg-background' : 'bg-card'}`}>
          <div className="flex items-center justify-between mb-2">
            <button onClick={canGoBack ? goBackDetail : closeDetail}
              className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">
              ← {canGoBack ? 'Back' : 'Close'}
            </button>
            <button onClick={isExpanded ? shrinkDetail : expandDetail}
              className="text-[10px] px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
              {isExpanded ? '⛶ Shrink' : '⛶ Expand'}
            </button>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">{node.label}</h2>
          <p className="text-[10px] font-mono mt-0.5 text-muted-foreground">{node.relativePath}</p>
          <div className="flex gap-1.5 mt-2.5">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-medium" style={{ background: `${colors.color}18`, color: colors.color }}>{LAYER_LABELS[node.layer]}</span>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-muted text-muted-foreground">{node.role}</span>
          </div>
          <div className="flex gap-1.5 mt-3">
            <button onClick={askClaude}
              className="px-3 py-1.5 rounded-md text-[11px] font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
              ✨ Explain
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-4 px-5 py-3 border-b border-border">
          {[{ v: node.metadata.exportCount, l: 'Exports' }, { v: node.metadata.importCount, l: 'Imports' }, { v: node.metadata.connectionCount, l: 'Connections' }].map(s => (
            <div key={s.l}>
              <div className="text-lg font-bold" style={{ color: colors.color }}>{s.v}</div>
              <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{s.l}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border px-5" role="tablist" aria-label="Component detail views">
          {(['overview', 'connections', 'code'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} role="tab" aria-selected={tab === t}
              className={`px-3 py-2 text-[11px] font-medium capitalize border-b-2 transition-colors ${
                tab === t ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}>
              {t}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-5">
          {tab === 'overview' && (
            <div className="space-y-5">
              <Section title="Description">
                <p className="text-[13px] leading-relaxed text-muted-foreground">{node.description}</p>
              </Section>

              <Section title="Explanation" icon="✨" iconColor="#8b7a9e"
                action={claudeExpl ? <button onClick={askClaude} className="text-[10px] font-medium" style={{ color: '#8b7a9e' }}>↻ Regenerate</button> : null}>
                {claudeExpl ? (
                  <div className="p-3.5 rounded-lg text-[13px] leading-relaxed bg-muted text-muted-foreground" style={{ borderLeft: '3px solid #8b7a9e' }}>
                    <ReactMarkdown components={{
                      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                      strong: ({ children }) => <strong className="text-foreground font-semibold">{children}</strong>,
                      ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-2">{children}</ul>,
                      code: ({ children }) => <code className="text-[11px] font-mono px-1 py-0.5 rounded bg-accent">{children}</code>,
                    }}>{claudeExpl}</ReactMarkdown>
                  </div>
                ) : claudeLoading ? (
                  <div className="p-3 rounded-lg text-[13px] flex items-center gap-2 bg-[#8b7a9e]/5 border border-[#8b7a9e]/15 text-[#8b7a9e]">
                    <span className="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"></span> Claude is reading the source code...
                  </div>
                ) : (
                  <button onClick={askClaude} className="w-full p-3 rounded-lg text-[13px] font-medium text-center transition-colors bg-muted text-[#8b7a9e] border border-[#8b7a9e]/15 hover:bg-[#8b7a9e]/10">
                    ✨ Click to explain this component
                  </button>
                )}
              </Section>
            </div>
          )}

          {tab === 'connections' && (
            <div className="space-y-5">
              {deps.length > 0 && (
                <Section title={`Uses (${deps.length})`}>
                  <div className="grid grid-cols-2 gap-2">
                    {deps.map(({ node: dep, type }) => (
                      <ConnCard key={dep.id} name={dep.label} type={classifyRelation(dep.layer)} layer={dep.layer}
                        desc={dep.description} onClick={() => navigateDetail(dep.id)} />
                    ))}
                  </div>
                </Section>
              )}
              {dependents.length > 0 && (
                <Section title={`Used By (${dependents.length})`}>
                  <div className="grid grid-cols-2 gap-2">
                    {dependents.map(({ node: dep }) => (
                      <ConnCard key={dep.id} name={dep.label} type={classifyRelation(node.layer)} layer={dep.layer}
                        desc={dep.description} onClick={() => navigateDetail(dep.id)} />
                    ))}
                  </div>
                </Section>
              )}
              {deps.length === 0 && dependents.length === 0 && (
                <p className="text-[13px] text-center py-10 text-muted-foreground">No connections found</p>
              )}
            </div>
          )}

          {tab === 'code' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Source Code</span>
                <div className="flex items-center gap-3">
                  <button onClick={async () => {
                    if (fileContent) {
                      await navigator.clipboard.writeText(fileContent);
                      const btn = document.getElementById('copy-code-btn');
                      if (btn) { btn.textContent = '✓ Copied'; setTimeout(() => { btn.textContent = '📋 Copy'; }, 2000); }
                    }
                  }} id="copy-code-btn"
                    className="text-[10px] font-medium flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                    📋 Copy
                  </button>
                </div>
              </div>
              {fileLoading ? (
                <div className="flex items-center justify-center py-12"><span className="inline-block w-5 h-5 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin"></span></div>
              ) : highlightedHtml ? (
                <div className="rounded-lg overflow-hidden overflow-y-auto border border-border"
                  style={{ maxHeight: '60vh' }}
                  dangerouslySetInnerHTML={{ __html: highlightedHtml }} />
              ) : fileContent ? (
                <pre className="p-4 rounded-lg font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-words overflow-y-auto bg-muted text-muted-foreground border border-border"
                  style={{ maxHeight: '60vh' }}>
                  {fileContent}
                </pre>
              ) : (
                <p className="text-[13px] text-center py-10 text-muted-foreground">Start CodeView with the CLI to see source code</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, icon, iconColor, action, children }: {
  title: string; isDark?: boolean; icon?: string; iconColor?: string; action?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1 text-muted-foreground">
          {icon && <span style={{ color: iconColor }}>{icon}</span>}{title}
        </h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function ConnCard({ name, type, layer, desc, onClick }: {
  name: string; type: string; layer: ArchitecturalLayer; desc: string; isDark?: boolean; onClick: () => void;
}) {
  const colors = LAYER_COLORS[layer];
  const tc = RELATION_COLORS[type] || '#7a7a90';
  return (
    <button onClick={onClick} className="w-full text-left p-2.5 rounded-lg transition-all bg-muted border border-border hover:border-muted-foreground/30 hover:-translate-y-0.5">
      <span className="text-[8px] font-medium px-1.5 py-0.5 rounded" style={{ background: `${tc}15`, color: tc }}>{type}</span>
      <div className="text-xs font-semibold mt-1.5 flex items-center gap-1 text-foreground">
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: colors.color }} />{name}
      </div>
      <div className="text-[10px] mt-0.5 line-clamp-2 text-muted-foreground">{desc}</div>
    </button>
  );
}
