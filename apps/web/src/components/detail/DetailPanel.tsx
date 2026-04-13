'use client';

import { useEffect, useState } from 'react';
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
  renders: '#5b8af5', 'fetches from': '#3dd9a0', uses: '#7a7a90',
  'stores in': '#f7b955', 'connects to': '#b088f0',
};

export function DetailPanel({ fullWidth }: { fullWidth?: boolean }) {
  const {
    detailNodeId, detailNavStack, detailMode,
    closeDetail, goBackDetail, navigateDetail, expandDetail, shrinkDetail,
    graphData, viewMode, theme, getNodeById, getDependencies, getDependents, claudeExplanations,
  } = useGraphStore();

  const [fileContent, setFileContent] = useState<string | null>(null);
  const [highlightedHtml, setHighlightedHtml] = useState<string | null>(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [claudeLoading, setClaudeLoading] = useState(false);
  const [claudeExpl, setClaudeExpl] = useState<string | null>(null);
  const [tab, setTab] = useState<'overview' | 'connections' | 'code'>('overview');

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

  const askClaude = async () => {
    if (!node) return;
    const previousExpl = claudeExpl;
    setClaudeLoading(true);
    setClaudeExpl(null); // Clear old explanation to show loading state
    try {
      await fetch('/api/trigger-claude', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'explain', componentPath: node.relativePath }),
      });
      // Poll for new description (different from the previous one)
      const poll = setInterval(async () => {
        try {
          const r = await fetch(`/api/ask-claude`);
          const d = await r.json();
          const newDesc = d.descriptions?.[node.relativePath];
          if (newDesc && newDesc !== previousExpl) {
            setClaudeExpl(newDesc);
            setClaudeLoading(false);
            clearInterval(poll);
          }
        } catch {}
      }, 2000);
      setTimeout(() => { clearInterval(poll); setClaudeLoading(false); }, 60000);
    } catch { setClaudeLoading(false); }
  };

  if (!detailNodeId || !graphData || !node) return null;

  const colors = LAYER_COLORS[node.layer];
  const deps = getDependencies(detailNodeId);
  const dependents = getDependents(detailNodeId);
  const canGoBack = detailNavStack.length > 0;
  const isExpanded = detailMode === 'expanded';

  return (
    <div className="h-full overflow-y-auto" style={{
      background: isExpanded ? (isDark ? '#09090b' : '#fafbfc') : (isDark ? '#111114' : '#ffffff'),
      borderLeft: isExpanded ? 'none' : `1px solid ${isDark ? '#1e1e28' : '#e5e7eb'}`,
      animation: 'slideIn .2s ease',
    }}>
      <style>{`@keyframes slideIn{from{transform:translateX(20px);opacity:0}to{transform:none;opacity:1}}`}</style>

      <div className={isExpanded ? 'max-w-[860px] mx-auto' : ''}>
        {/* Header */}
        <div className="sticky top-0 z-10 px-5 py-3 border-b" style={{
          background: isExpanded ? (isDark ? '#09090b' : '#fafbfc') : (isDark ? '#111114' : '#ffffff'),
          borderColor: isDark ? '#1e1e28' : '#e5e7eb',
        }}>
          <div className="flex items-center justify-between mb-2">
            <button onClick={canGoBack ? goBackDetail : closeDetail}
              className="text-[11px] transition-colors" style={{ color: isDark ? '#505068' : '#9ca3af' }}
              onMouseEnter={e => e.currentTarget.style.color = isDark ? '#f4f4f8' : '#111827'}
              onMouseLeave={e => e.currentTarget.style.color = isDark ? '#505068' : '#9ca3af'}>
              ← {canGoBack ? 'Back' : 'Close'}
            </button>
            <button onClick={isExpanded ? shrinkDetail : expandDetail}
              className="text-[10px] px-2 py-1 rounded transition-colors"
              style={{ color: isDark ? '#505068' : '#9ca3af', border: `1px solid ${isDark ? '#1e1e28' : '#e5e7eb'}` }}
              onMouseEnter={e => { e.currentTarget.style.background = isDark ? '#1a1a1f' : '#f3f4f6'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
              {isExpanded ? '⛶ Shrink' : '⛶ Expand'}
            </button>
          </div>
          <h2 className="text-xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)', color: isDark ? '#f4f4f8' : '#111827' }}>{node.label}</h2>
          <p className="text-[10px] font-mono mt-0.5" style={{ color: isDark ? '#505068' : '#9ca3af' }}>{node.relativePath}</p>
          <div className="flex gap-1.5 mt-2.5">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-medium" style={{ background: `${colors.color}18`, color: colors.color }}>{LAYER_LABELS[node.layer]}</span>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-medium" style={{ background: isDark ? '#1a1a1f' : '#f3f4f6', color: isDark ? '#9090a8' : '#6b7280' }}>{node.role}</span>
          </div>
          <div className="flex gap-1.5 mt-3">
            <button onClick={() => { window.location.href = `vscode://file/${node.filePath}`; }}
              className="px-3 py-1 rounded-md text-[11px] font-medium flex items-center gap-1 transition-colors"
              style={{ border: `1px solid ${isDark ? '#1e1e28' : '#e5e7eb'}`, color: isDark ? '#9090a8' : '#6b7280', background: 'transparent', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>↗ VS Code</button>
            <button onClick={askClaude} className="px-3 py-1 rounded-md text-[11px] font-medium flex items-center gap-1"
              style={{ border: '1px solid rgba(176,136,240,.2)', color: '#b088f0' }}>✨ Ask Claude</button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-4 px-5 py-3 border-b" style={{ borderColor: isDark ? '#1e1e28' : '#e5e7eb' }}>
          {[{ v: node.metadata.exportCount, l: 'Exports' }, { v: node.metadata.importCount, l: 'Imports' }, { v: node.metadata.connectionCount, l: 'Connections' }].map(s => (
            <div key={s.l}>
              <div className="text-lg font-bold" style={{ color: colors.color, fontFamily: 'var(--font-display)' }}>{s.v}</div>
              <div className="text-[9px] uppercase tracking-wider" style={{ color: isDark ? '#505068' : '#9ca3af' }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex border-b px-5" style={{ borderColor: isDark ? '#1e1e28' : '#e5e7eb' }}>
          {(['overview', 'connections', 'code'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="px-3 py-2 text-[11px] font-medium capitalize border-b-2 transition-colors"
              style={{ borderColor: tab === t ? '#5b8af5' : 'transparent', color: tab === t ? (isDark ? '#f4f4f8' : '#111827') : (isDark ? '#505068' : '#9ca3af') }}>
              {t}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-5">
          {tab === 'overview' && (
            <div className="space-y-5">
              <Section title="Description" isDark={isDark}>
                <p className="text-[13px] leading-relaxed" style={{ color: isDark ? '#9090a8' : '#6b7280' }}>{node.description}</p>
              </Section>

              <Section title="AI Explanation" isDark={isDark} icon="✨" iconColor="#b088f0"
                action={claudeExpl ? <button onClick={askClaude} className="text-[10px] font-medium" style={{ color: '#b088f0' }}>↻ Regenerate</button> : null}>
                {claudeExpl ? (
                  <div className="p-3.5 rounded-lg border-l-3 text-[13px] leading-relaxed" style={{ background: isDark ? '#1a1a1f' : '#f3f4f6', borderLeft: '3px solid #b088f0', color: isDark ? '#9090a8' : '#6b7280' }}>
                    <ReactMarkdown components={{
                      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                      strong: ({ children }) => <strong style={{ color: isDark ? '#f4f4f8' : '#111827', fontWeight: 600 }}>{children}</strong>,
                      ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-2">{children}</ul>,
                      code: ({ children }) => <code className="text-[11px] font-mono px-1 py-0.5 rounded" style={{ background: isDark ? '#111114' : '#e5e7eb' }}>{children}</code>,
                    }}>{claudeExpl}</ReactMarkdown>
                  </div>
                ) : claudeLoading ? (
                  <div className="p-3 rounded-lg text-[13px] flex items-center gap-2" style={{ background: 'rgba(176,136,240,.05)', border: '1px solid rgba(176,136,240,.15)', color: '#b088f0' }}>
                    <span className="animate-spin">⏳</span> Claude is reading the source code...
                  </div>
                ) : (
                  <button onClick={askClaude} className="w-full p-3 rounded-lg text-[13px] font-medium text-center transition-colors"
                    style={{ background: isDark ? '#1a1a1f' : '#f3f4f6', color: '#b088f0', border: '1px solid rgba(176,136,240,.15)' }}>
                    ✨ Ask Claude to explain this component
                  </button>
                )}
              </Section>
            </div>
          )}

          {tab === 'connections' && (
            <div className="space-y-5">
              {deps.length > 0 && (
                <Section title={`Uses (${deps.length})`} isDark={isDark}>
                  <div className="grid grid-cols-2 gap-2">
                    {deps.map(({ node: dep, type }) => (
                      <ConnCard key={dep.id} name={dep.label} type={classifyRelation(dep.layer)} layer={dep.layer}
                        desc={dep.description} isDark={isDark} onClick={() => navigateDetail(dep.id)} />
                    ))}
                  </div>
                </Section>
              )}
              {dependents.length > 0 && (
                <Section title={`Used By (${dependents.length})`} isDark={isDark}>
                  <div className="grid grid-cols-2 gap-2">
                    {dependents.map(({ node: dep }) => (
                      <ConnCard key={dep.id} name={dep.label} type={classifyRelation(node.layer)} layer={dep.layer}
                        desc={dep.description} isDark={isDark} onClick={() => navigateDetail(dep.id)} />
                    ))}
                  </div>
                </Section>
              )}
              {deps.length === 0 && dependents.length === 0 && (
                <p className="text-[13px] text-center py-10" style={{ color: isDark ? '#505068' : '#9ca3af' }}>No connections found</p>
              )}
            </div>
          )}

          {tab === 'code' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: isDark ? '#505068' : '#9ca3af' }}>Source Code</span>
                <div className="flex items-center gap-3">
                  <button onClick={() => { if (fileContent) navigator.clipboard.writeText(fileContent); }}
                    className="text-[10px] font-medium flex items-center gap-1" style={{ color: isDark ? '#505068' : '#9ca3af', background: 'none', border: 'none', cursor: 'pointer' }}>
                    📋 Copy
                  </button>
                  <button onClick={() => {
                    // Use window.location for VS Code URL scheme — avoids Safari blocking <a> links
                    window.location.href = `vscode://file/${node.filePath}`;
                  }} className="text-[10px] font-medium flex items-center gap-1" style={{ color: '#5b8af5', background: 'none', border: 'none', cursor: 'pointer' }}>
                    ↗ Open in VS Code
                  </button>
                </div>
              </div>
              {fileLoading ? (
                <div className="flex items-center justify-center py-12"><span className="animate-spin text-lg">⏳</span></div>
              ) : highlightedHtml ? (
                <div className="rounded-lg overflow-hidden overflow-y-auto"
                  style={{ maxHeight: '60vh', border: `1px solid ${isDark ? '#1e1e28' : '#e5e7eb'}` }}
                  dangerouslySetInnerHTML={{ __html: highlightedHtml }} />
              ) : fileContent ? (
                <pre className="p-4 rounded-lg font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-words overflow-y-auto"
                  style={{ background: isDark ? '#0a0a0c' : '#fafbfc', color: isDark ? '#9090a8' : '#6b7280', border: `1px solid ${isDark ? '#1e1e28' : '#e5e7eb'}`, maxHeight: '60vh' }}>
                  {fileContent}
                </pre>
              ) : (
                <p className="text-[13px] text-center py-10" style={{ color: isDark ? '#505068' : '#9ca3af' }}>Start CodeView with the CLI to see source code</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, isDark, icon, iconColor, action, children }: {
  title: string; isDark: boolean; icon?: string; iconColor?: string; action?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1"
          style={{ color: isDark ? '#505068' : '#9ca3af' }}>
          {icon && <span style={{ color: iconColor }}>{icon}</span>}{title}
        </h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function ConnCard({ name, type, layer, desc, isDark, onClick }: {
  name: string; type: string; layer: ArchitecturalLayer; desc: string; isDark: boolean; onClick: () => void;
}) {
  const colors = LAYER_COLORS[layer];
  const tc = RELATION_COLORS[type] || '#7a7a90';
  return (
    <button onClick={onClick} className="w-full text-left p-2.5 rounded-lg transition-all"
      style={{ background: isDark ? '#1a1a1f' : '#f3f4f6', border: `1px solid ${isDark ? '#1e1e28' : '#e5e7eb'}` }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = isDark ? '#2a2a38' : '#d1d5db'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = isDark ? '#1e1e28' : '#e5e7eb'; e.currentTarget.style.transform = 'none'; }}>
      <span className="text-[8px] font-medium px-1.5 py-0.5 rounded" style={{ background: `${tc}15`, color: tc }}>{type}</span>
      <div className="text-xs font-semibold mt-1.5 flex items-center gap-1" style={{ color: isDark ? '#f4f4f8' : '#111827' }}>
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: colors.color }} />{name}
      </div>
      <div className="text-[10px] mt-0.5 line-clamp-2" style={{ color: isDark ? '#505068' : '#9ca3af' }}>{desc}</div>
    </button>
  );
}
