'use client';

import { useEffect, useState } from 'react';
import { useGraphStore } from '@/store/graph-store';
import { LAYER_COLORS, LAYER_LABELS } from '@/components/canvas/layer-colors';
import { X, ArrowLeft, ExternalLink, Code, Eye, Link2, Sparkles, Loader2, Copy, Check } from 'lucide-react';
import type { ArchitecturalLayer } from '@codeview/shared';

export function DetailSidebar() {
  const {
    detailNodeId, detailNavStack, detailTab,
    closeDetail, goBackDetail, navigateDetail, setDetailTab,
    graphData, viewMode, theme,
    getNodeById, getDependencies, getDependents,
  } = useGraphStore();

  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [claudeExplanation, setClaudeExplanation] = useState<string | null>(null);
  const [claudeLoading, setClaudeLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const node = detailNodeId ? getNodeById(detailNodeId) : null;
  const isDark = theme === 'dark';

  // Fetch file content when code tab is active
  useEffect(() => {
    if (!node || detailTab !== 'code') return;
    setFileLoading(true);
    setFileContent(null);
    fetch(`/api/file-content?path=${encodeURIComponent(node.relativePath)}`)
      .then(r => r.json())
      .then(d => { setFileContent(d.content || d.error || 'Could not load file'); })
      .catch(() => setFileContent('Could not load file'))
      .finally(() => setFileLoading(false));
  }, [node?.relativePath, detailTab]);

  // Check for cached Claude descriptions
  useEffect(() => {
    if (!node) return;
    setClaudeExplanation(null);
    fetch('/api/ask-claude')
      .then(r => r.json())
      .then(d => {
        if (d.descriptions?.[node.relativePath]) {
          setClaudeExplanation(d.descriptions[node.relativePath]);
        }
      })
      .catch(() => {});
  }, [node?.relativePath]);

  if (!detailNodeId || !graphData || !node) return null;

  const colors = LAYER_COLORS[node.layer];
  const deps = getDependencies(detailNodeId);
  const dependents = getDependents(detailNodeId);
  const canGoBack = detailNavStack.length > 0;

  const askClaude = async () => {
    setClaudeLoading(true);
    try {
      const res = await fetch('/api/trigger-claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'explain', componentPath: node.relativePath }),
      });
      const data = await res.json();
      if (data.error) {
        setClaudeLoading(false);
        return;
      }
      // Poll for Claude's response in descriptions cache
      const poll = setInterval(async () => {
        try {
          const r = await fetch('/api/generate-descriptions');
          const d = await r.json();
          const comp = d.components?.find((c: any) => c.path === node.relativePath);
          if (comp?.hasDescription) {
            setClaudeExplanation(comp.description);
            setClaudeLoading(false);
            clearInterval(poll);
          }
        } catch { /* keep polling */ }
      }, 2000);
      setTimeout(() => { clearInterval(poll); setClaudeLoading(false); }, 60000);
    } catch {
      setClaudeLoading(false);
    }
  };

  const copyCode = async () => {
    if (fileContent) {
      await navigator.clipboard.writeText(fileContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className="fixed top-12 right-0 bottom-0 overflow-y-auto"
      style={{
        width: 'min(50vw, 580px)',
        minWidth: 420,
        background: isDark ? '#18181b' : '#ffffff',
        borderLeft: `1px solid ${isDark ? '#27272a' : '#e4e4e7'}`,
        boxShadow: isDark ? '-8px 0 32px rgba(0,0,0,0.4)' : '-8px 0 32px rgba(0,0,0,0.08)',
        zIndex: 50,
        animation: 'slideIn 0.2s ease-out',
      }}
    >
      <style>{`@keyframes slideIn { from { transform: translateX(30px); opacity: 0; } to { transform: none; opacity: 1; } }`}</style>

      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-2 px-4 py-3 border-b"
        style={{ background: isDark ? '#18181b' : '#ffffff', borderColor: isDark ? '#27272a' : '#e4e4e7' }}>
        {canGoBack && (
          <button onClick={goBackDetail}
            className="w-7 h-7 flex items-center justify-center rounded-md transition-colors"
            style={{ color: isDark ? '#71717a' : '#a1a1aa' }}
            onMouseEnter={e => e.currentTarget.style.background = isDark ? '#27272a' : '#f4f4f5'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <ArrowLeft size={16} />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold tracking-tight truncate"
            style={{ fontFamily: 'var(--font-display)', color: isDark ? '#fafafa' : '#09090b' }}>
            {node.label}
          </h2>
          <p className="text-[10px] font-mono truncate" style={{ color: isDark ? '#52525b' : '#a1a1aa' }}>
            {node.relativePath}
          </p>
        </div>
        <button onClick={closeDetail}
          className="w-7 h-7 flex items-center justify-center rounded-md transition-colors"
          style={{ color: isDark ? '#71717a' : '#a1a1aa' }}
          onMouseEnter={e => e.currentTarget.style.background = isDark ? '#27272a' : '#f4f4f5'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <X size={16} />
        </button>
      </div>

      {/* Tags */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-2">
        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-medium" style={{ backgroundColor: colors.soft, color: colors.color }}>
          {LAYER_LABELS[node.layer]}
        </span>
        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-medium"
          style={{ background: isDark ? '#27272a' : '#f4f4f5', color: isDark ? '#a1a1aa' : '#71717a' }}>
          {node.role}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 px-4 border-b" style={{ borderColor: isDark ? '#27272a' : '#e4e4e7' }}>
        {(['overview', 'connections', 'code'] as const).map((tab) => (
          <button key={tab} onClick={() => setDetailTab(tab)}
            className="px-3 py-2 text-xs font-medium capitalize border-b-2 transition-colors"
            style={{
              borderColor: detailTab === tab ? '#3b82f6' : 'transparent',
              color: detailTab === tab ? (isDark ? '#fafafa' : '#09090b') : (isDark ? '#52525b' : '#a1a1aa'),
            }}>
            {tab === 'overview' && <Eye size={12} className="inline mr-1.5 -mt-0.5" />}
            {tab === 'connections' && <Link2 size={12} className="inline mr-1.5 -mt-0.5" />}
            {tab === 'code' && <Code size={12} className="inline mr-1.5 -mt-0.5" />}
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* ─── OVERVIEW TAB ─── */}
        {detailTab === 'overview' && (
          <div className="space-y-4">
            <Section title="Description" isDark={isDark}>
              <p className="text-sm leading-relaxed" style={{ color: isDark ? '#d4d4d8' : '#3f3f46' }}>
                {node.description}
              </p>
            </Section>

            {/* Claude explanation */}
            <Section title="AI Explanation" isDark={isDark} icon={<Sparkles size={10} className="text-purple-400" />}>
              {claudeExplanation ? (
                <div className="p-3 rounded-lg border-l-2 border-purple-500 text-sm leading-relaxed"
                  style={{ background: isDark ? '#27272a' : '#f4f4f5', color: isDark ? '#d4d4d8' : '#3f3f46' }}>
                  {claudeExplanation}
                </div>
              ) : claudeLoading ? (
                <div className="flex items-center gap-2 p-3 rounded-lg text-sm"
                  style={{ background: 'rgba(168,85,247,0.05)', border: '1px solid rgba(168,85,247,0.2)', color: '#a855f7' }}>
                  <Loader2 size={14} className="animate-spin" />
                  Waiting for Claude to read the source code...
                </div>
              ) : (
                <button onClick={askClaude}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    background: isDark ? '#27272a' : '#f4f4f5',
                    color: '#a855f7',
                    border: '1px solid rgba(168,85,247,0.2)',
                  }}>
                  <Sparkles size={13} />
                  Ask Claude to explain this component
                </button>
              )}
            </Section>

            {/* Stats */}
            <Section title="Stats" isDark={isDark}>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Exports', value: node.metadata.exportCount },
                  { label: 'Imports', value: node.metadata.importCount },
                  { label: 'Connections', value: node.metadata.connectionCount },
                ].map((s) => (
                  <div key={s.label} className="p-2 rounded-lg" style={{ background: isDark ? '#27272a' : '#f4f4f5' }}>
                    <div className="text-lg font-bold" style={{ color: colors.color, fontFamily: 'var(--font-display)' }}>{s.value}</div>
                    <div className="text-[9px] uppercase tracking-wider" style={{ color: isDark ? '#52525b' : '#a1a1aa' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </Section>
          </div>
        )}

        {/* ─── CONNECTIONS TAB ─── */}
        {detailTab === 'connections' && (
          <div className="space-y-4">
            {deps.length > 0 && (
              <Section title={`Uses (${deps.length})`} isDark={isDark}>
                {deps.map(({ node: dep, type }) => (
                  <ConnectionChip key={dep.id} label={dep.label}
                    type={classifyRelationship(dep.layer)}
                    layer={dep.layer}
                    description={viewMode === 'descriptive' ? dep.description : dep.relativePath}
                    isDark={isDark} onClick={() => navigateDetail(dep.id)} />
                ))}
              </Section>
            )}
            {dependents.length > 0 && (
              <Section title={`Used By (${dependents.length})`} isDark={isDark}>
                {dependents.map(({ node: dep }) => (
                  <ConnectionChip key={dep.id} label={dep.label}
                    type={classifyRelationship(node.layer)}
                    layer={dep.layer}
                    description={viewMode === 'descriptive' ? dep.description : dep.relativePath}
                    isDark={isDark} onClick={() => navigateDetail(dep.id)} />
                ))}
              </Section>
            )}
            {deps.length === 0 && dependents.length === 0 && (
              <p className="text-sm text-center py-8" style={{ color: isDark ? '#52525b' : '#a1a1aa' }}>No connections found</p>
            )}
          </div>
        )}

        {/* ─── CODE TAB ─── */}
        {detailTab === 'code' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: isDark ? '#52525b' : '#a1a1aa' }}>
                Source Code
              </h3>
              <div className="flex items-center gap-2">
                {fileContent && (
                  <button onClick={copyCode}
                    className="text-[10px] font-medium flex items-center gap-1 transition-colors"
                    style={{ color: copied ? '#22c55e' : '#3b82f6' }}>
                    {copied ? <Check size={10} /> : <Copy size={10} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                )}
                <a href={`vscode://file/${node.filePath}`}
                  className="text-[10px] font-medium flex items-center gap-1"
                  style={{ color: '#3b82f6' }}>
                  <ExternalLink size={10} />
                  Open in VS Code
                </a>
              </div>
            </div>
            {fileLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={20} className="animate-spin" style={{ color: isDark ? '#52525b' : '#a1a1aa' }} />
              </div>
            ) : fileContent ? (
              <pre className="p-4 rounded-lg font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-words overflow-y-auto"
                style={{
                  background: isDark ? '#09090b' : '#fafafa',
                  color: isDark ? '#a1a1aa' : '#52525b',
                  border: `1px solid ${isDark ? '#27272a' : '#e4e4e7'}`,
                  maxHeight: '60vh',
                }}>
                {fileContent}
              </pre>
            ) : (
              <p className="text-sm text-center py-8" style={{ color: isDark ? '#52525b' : '#a1a1aa' }}>
                Could not load file content. Make sure CodeView was started with the CLI.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, isDark, icon, children }: {
  title: string; isDark: boolean; icon?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-[10px] font-semibold uppercase tracking-widest mb-2 flex items-center gap-1"
        style={{ color: isDark ? '#52525b' : '#a1a1aa' }}>
        {icon}{title}
      </h3>
      {children}
    </div>
  );
}

function ConnectionChip({ label, type, layer, description, isDark, onClick }: {
  label: string; type: string; layer: ArchitecturalLayer; description: string; isDark: boolean; onClick: () => void;
}) {
  const colors = LAYER_COLORS[layer];
  const typeColors: Record<string, string> = {
    renders: '#3b82f6', 'fetches from': '#22c55e', uses: '#71717a',
    'stores in': '#f59e0b', 'connects to': '#a855f7',
  };
  const tc = typeColors[type] || '#71717a';

  return (
    <button onClick={onClick} className="w-full flex items-start gap-2.5 p-2 rounded-lg text-left transition-colors"
      onMouseEnter={e => e.currentTarget.style.background = isDark ? '#27272a' : '#f4f4f5'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
      <span className="px-1.5 py-0.5 rounded text-[9px] font-medium shrink-0 mt-0.5"
        style={{ background: `${tc}15`, color: tc }}>{type}</span>
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-medium flex items-center gap-1.5"
          style={{ color: isDark ? '#fafafa' : '#18181b' }}>
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: colors.color }} />
          {label}
        </div>
        <div className="text-[10px] mt-0.5 truncate" style={{ color: isDark ? '#71717a' : '#a1a1aa' }}>{description}</div>
      </div>
      <ArrowLeft size={12} className="rotate-180 shrink-0 mt-1" style={{ color: isDark ? '#3f3f46' : '#d4d4d8' }} />
    </button>
  );
}

function classifyRelationship(targetLayer: ArchitecturalLayer): string {
  if (targetLayer === 'ui') return 'renders';
  if (targetLayer === 'api') return 'fetches from';
  if (targetLayer === 'data') return 'stores in';
  if (targetLayer === 'external') return 'connects to';
  return 'uses';
}
