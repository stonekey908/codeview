'use client';

import { useState, useEffect, useRef } from 'react';
import { Sparkles, Loader2, X, Check, Square, CheckSquare } from 'lucide-react';
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
  const [components, setComponents] = useState<ComponentStatus[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState('');
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [loading, setLoading] = useState(true);
  const generatingRef = useRef(false);

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
    generatingRef.current = true;
    setProgress(`Analysing ${selected.size} components...`);

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

      setProgress('Reading source code...');

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
            generatingRef.current = false;
            setTimeout(() => setProgress(''), 2000);
          }
        } catch {}
      }, 3000);

      // Timeout after 3 minutes — use ref to avoid stale closure
      setTimeout(() => {
        clearInterval(poll);
        if (generatingRef.current) {
          setGenerating(false);
          generatingRef.current = false;
          setProgress('Timed out — some descriptions may still be generating');
        }
      }, 180000);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setProgress('Stopped');
      } else {
        setProgress('Failed to start analysis');
      }
      setGenerating(false);
      generatingRef.current = false;
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
      <div role="dialog" aria-label="Generate explanations" className="relative w-full max-w-lg rounded-xl shadow-2xl overflow-hidden bg-card border border-border">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-[#8b7a9e]" />
            <h2 className="text-sm font-bold">
              Generate Explanations
            </h2>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              {described}/{components.length} done
            </span>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-muted-foreground hover:text-foreground transition-colors"><X size={16} /></button>
        </div>

        {/* Selection controls */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border text-[11px]">
          <button onClick={selectAll} className="text-primary hover:text-primary/80">Select All</button>
          <span className="text-border">·</span>
          <button onClick={selectNone} className="text-primary hover:text-primary/80">None</button>
          <span className="text-border">·</span>
          <button onClick={selectUndescribed} className="text-primary hover:text-primary/80">
            Undescribed Only ({components.filter(c => !c.hasDescription).length})
          </button>
          <span className="ml-auto font-medium text-muted-foreground">
            {selected.size} selected
          </span>
        </div>

        {/* Component list */}
        <div className="max-h-[50vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={20} className="animate-spin text-muted-foreground" />
            </div>
          ) : (
            components.map((comp) => {
              const isSelected = selected.has(comp.path);
              const colors = LAYER_COLORS[comp.layer as keyof typeof LAYER_COLORS];
              return (
                <div key={comp.path}
                  onClick={() => !generating && toggleSelect(comp.path)}
                  className={`flex items-start gap-2.5 px-4 py-2 cursor-pointer transition-colors ${isSelected ? 'bg-primary/5' : 'hover:bg-accent/50'}`}
                >
                  <div className={`mt-0.5 ${isSelected ? 'text-primary' : 'text-muted-foreground/40'}`}>
                    {isSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: colors?.color || '#71717a' }} />
                      <span className="text-xs font-medium truncate text-foreground">
                        {comp.label}
                      </span>
                      {comp.hasDescription && (
                        <Check size={10} className="text-green-500 shrink-0" />
                      )}
                    </div>
                    <div className="text-[10px] truncate mt-0.5 text-muted-foreground">
                      {comp.path}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
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
