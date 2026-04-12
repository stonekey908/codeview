'use client';

import { useEffect, useState } from 'react';
import { useGraphStore } from '@/store/graph-store';
import { X } from 'lucide-react';

const SHORTCUTS = [
  { keys: ['/', '⌘K'], description: 'Search components' },
  { keys: ['Esc'], description: 'Close sidebar / clear selection' },
  { keys: ['⌘D'], description: 'Toggle Technical mode' },
  { keys: ['⌘A'], description: 'Select all components' },
  { keys: ['?'], description: 'Show keyboard shortcuts' },
];

export function KeyboardShortcuts() {
  const [helpOpen, setHelpOpen] = useState(false);
  const {
    sidebarNodeId,
    setSidebarNode,
    selectedNodeIds,
    clearSelection,
    viewMode,
    setViewMode,
    graphData,
    toggleNodeSelection,
  } = useGraphStore();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isInput = document.activeElement instanceof HTMLInputElement ||
                      document.activeElement instanceof HTMLTextAreaElement;

      // ? — show help (not when typing)
      if (e.key === '?' && !isInput) {
        e.preventDefault();
        setHelpOpen((v) => !v);
        return;
      }

      // Escape — cascade: close help → close sidebar → clear selection
      if (e.key === 'Escape') {
        if (helpOpen) { setHelpOpen(false); return; }
        if (sidebarNodeId) { setSidebarNode(null); return; }
        if (selectedNodeIds.size > 0) { clearSelection(); return; }
      }

      // Cmd+D — toggle descriptive/technical
      if (e.metaKey && e.key === 'd') {
        e.preventDefault();
        setViewMode(viewMode === 'descriptive' ? 'technical' : 'descriptive');
      }

      // Cmd+A — select all
      if (e.metaKey && e.key === 'a' && !isInput) {
        e.preventDefault();
        graphData?.nodes.forEach((n) => {
          if (!selectedNodeIds.has(n.id)) toggleNodeSelection(n.id);
        });
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [helpOpen, sidebarNodeId, setSidebarNode, selectedNodeIds, clearSelection, viewMode, setViewMode, graphData, toggleNodeSelection]);

  if (!helpOpen) return null;

  return (
    <div className="fixed inset-0 z-[350] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setHelpOpen(false)} />
      <div className="relative w-full max-w-xs bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-5 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold" style={{ fontFamily: 'var(--font-display)' }}>
            Keyboard Shortcuts
          </h2>
          <button onClick={() => setHelpOpen(false)} className="text-zinc-500 hover:text-zinc-300">
            <X size={14} />
          </button>
        </div>
        <div className="space-y-2">
          {SHORTCUTS.map((s) => (
            <div key={s.description} className="flex items-center justify-between">
              <span className="text-xs text-zinc-400">{s.description}</span>
              <div className="flex gap-1">
                {s.keys.map((k) => (
                  <kbd key={k} className="px-1.5 py-0.5 text-[10px] font-mono bg-zinc-800 border border-zinc-700 rounded text-zinc-400">
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
