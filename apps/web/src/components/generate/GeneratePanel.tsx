'use client';

import { useState, useEffect } from 'react';
import { Sparkles, Loader2, X, Check, Square, CheckSquare } from 'lucide-react';
import { useGraphStore } from '@/store/graph-store';
import { LAYER_COLORS } from '@/components/canvas/layer-colors';

interface ComponentStatus {
  path: string;
  label: string;
  role: string;
  layer: string;
  hasDescription: boolean;
  description: string;
}

export function GeneratePanel({ onClose }: { onClose: () => void }) {
  const { theme } = useGraphStore();
  const isDark = theme === 'dark';

  const [components, setComponents] = useState<ComponentStatus[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState('');
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [loading, setLoading] = useState(true);

  // Load component list
  useEffect(() => {
    fetch('/api/generate-descriptions')
      .then(r => r.json())
      .then(d => {
        setComponents(d.components || []);
        // Pre-select components without descriptions
        const needsDesc = (d.components || [])
          .filter((c: ComponentStatus) => !c.hasDescription)
          .map((c: ComponentStatus) => c.path);
        setSelected(new Set(needsDesc));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const toggleSelect = (path: string) => {
    const next = new Set(selected);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    setSelected(next);
  };

  const selectAll = () => setSelected(new Set(components.map(c => c.path)));
  const selectNone = () => setSelected(new Set());
  const selectUndescribed = () => {
    setSelected(new Set(components.filter(c => !c.hasDescription).map(c => c.path)));
  };

  const generate = async () => {
    if (selected.size === 0) return;
    setGenerating(true);
    setProgress(`Starting Claude for ${selected.size} components...`);

    const controller = new AbortController();
    setAbortController(controller);

    try {
      await fetch('/api/trigger-claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate-all',
          componentPaths: Array.from(selected),
        }),
        signal: controller.signal,
      });

      setProgress('Claude is reading your code...');

      // Poll for completion
      const startCount = components.filter(c => c.hasDescription).length;
      const poll = setInterval(async () => {
        if (controller.signal.aborted) { clearInterval(poll); return; }
        try {
          const r = await fetch('/api/generate-descriptions');
          const d = await r.json();
          const newCount = d.described || 0;
          const generated = newCount - startCount;
          setProgress(`${generated}/${selected.size} descriptions generated`);
          setComponents(d.components || []);

          if (generated >= selected.size) {
            clearInterval(poll);
            setProgress('Done!');
            setGenerating(false);
            setTimeout(() => setProgress(''), 2000);
          }
        } catch {}
      }, 3000);

      // Timeout after 3 minutes
      setTimeout(() => {
        clearInterval(poll);
        if (generating) {
          setGenerating(false);
          setProgress('Timed out — some descriptions may still be generating');
        }
      }, 180000);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setProgress('Stopped');
      } else {
        setProgress('Failed to start Claude');
      }
      setGenerating(false);
      setTimeout(() => setProgress(''), 2000);
    }
  };

  const stop = () => {
    abortController?.abort();
    setGenerating(false);
    setProgress('Stopped');
    setTimeout(() => setProgress(''), 2000);
  };

  const described = components.filter(c => c.hasDescription).length;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-xl shadow-2xl overflow-hidden"
        style={{ background: isDark ? '#18181b' : '#ffffff', border: `1px solid ${isDark ? '#27272a' : '#e4e4e7'}` }}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: isDark ? '#27272a' : '#e4e4e7' }}>
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-purple-400" />
            <h2 className="text-sm font-bold" style={{ fontFamily: 'var(--font-display)' }}>
              Generate Explanations
            </h2>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded"
              style={{ background: isDark ? '#27272a' : '#f4f4f5', color: isDark ? '#71717a' : '#a1a1aa' }}>
              {described}/{components.length} done
            </span>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300"><X size={16} /></button>
        </div>

        {/* Selection controls */}
        <div className="flex items-center gap-2 px-4 py-2 border-b text-[11px]"
          style={{ borderColor: isDark ? '#27272a' : '#e4e4e7' }}>
          <button onClick={selectAll} className="text-blue-400 hover:text-blue-300">Select All</button>
          <span style={{ color: isDark ? '#3f3f46' : '#d4d4d8' }}>·</span>
          <button onClick={selectNone} className="text-blue-400 hover:text-blue-300">None</button>
          <span style={{ color: isDark ? '#3f3f46' : '#d4d4d8' }}>·</span>
          <button onClick={selectUndescribed} className="text-blue-400 hover:text-blue-300">
            Undescribed Only ({components.filter(c => !c.hasDescription).length})
          </button>
          <span className="ml-auto font-medium" style={{ color: isDark ? '#a1a1aa' : '#71717a' }}>
            {selected.size} selected
          </span>
        </div>

        {/* Component list */}
        <div className="max-h-[50vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={20} className="animate-spin" style={{ color: isDark ? '#52525b' : '#a1a1aa' }} />
            </div>
          ) : (
            components.map((comp) => {
              const isSelected = selected.has(comp.path);
              const colors = LAYER_COLORS[comp.layer as keyof typeof LAYER_COLORS];
              return (
                <div key={comp.path}
                  onClick={() => !generating && toggleSelect(comp.path)}
                  className="flex items-start gap-2.5 px-4 py-2 cursor-pointer transition-colors"
                  style={{ background: isSelected ? (isDark ? 'rgba(59,130,246,0.05)' : 'rgba(59,130,246,0.03)') : 'transparent' }}
                >
                  <div className="mt-0.5" style={{ color: isSelected ? '#3b82f6' : (isDark ? '#3f3f46' : '#d4d4d8') }}>
                    {isSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: colors?.color || '#71717a' }} />
                      <span className="text-xs font-medium truncate" style={{ color: isDark ? '#fafafa' : '#18181b' }}>
                        {comp.label}
                      </span>
                      {comp.hasDescription && (
                        <Check size={10} className="text-green-500 shrink-0" />
                      )}
                    </div>
                    <div className="text-[10px] truncate mt-0.5" style={{ color: isDark ? '#52525b' : '#a1a1aa' }}>
                      {comp.path}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t"
          style={{ borderColor: isDark ? '#27272a' : '#e4e4e7' }}>
          {progress && (
            <span className="text-xs flex items-center gap-1.5" style={{ color: '#8b7a9e' }}>
              {generating && <span className="inline-block w-3 h-3 border-2 border-[#8b7a9e] border-t-transparent rounded-full animate-spin" />}
              {progress}
            </span>
          )}
          {!progress && <span />}
          <div className="flex items-center gap-2">
            {generating ? (
              <button onClick={stop}
                className="px-4 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors">
                Stop
              </button>
            ) : (
              <button onClick={generate} disabled={selected.size === 0}
                className="px-4 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 disabled:opacity-40"
                style={{ background: '#a855f7', color: '#fff' }}>
                <Sparkles size={12} />
                Generate ({selected.size})
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
