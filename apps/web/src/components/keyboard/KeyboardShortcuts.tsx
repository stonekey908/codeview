'use client';

import { useEffect, useState } from 'react';
import { useGraphStore } from '@/store/graph-store';

export function KeyboardShortcuts() {
  const [helpOpen, setHelpOpen] = useState(false);
  const { detailNodeId, closeDetail, selectedNodeIds, clearSelection, focusedNodeId, setFocusedNode, graphData, toggleNodeSelection } = useGraphStore();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isInput = document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement;
      if (e.key === '?' && !isInput) { e.preventDefault(); setHelpOpen(v => !v); return; }
      if (e.key === 'Escape') {
        if (helpOpen) { setHelpOpen(false); return; }
        if (focusedNodeId) { setFocusedNode(null); return; }
        if (detailNodeId) { closeDetail(); return; }
        if (selectedNodeIds.size > 0) { clearSelection(); return; }
      }
      if (e.metaKey && e.key === 'a' && !isInput) { e.preventDefault(); graphData?.nodes.forEach(n => { if (!selectedNodeIds.has(n.id)) toggleNodeSelection(n.id); }); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [helpOpen, detailNodeId, closeDetail, selectedNodeIds, clearSelection, graphData, toggleNodeSelection, focusedNodeId, setFocusedNode]);

  if (!helpOpen) return null;
  return (
    <div className="fixed inset-0 z-[350] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setHelpOpen(false)} />
      <div className="relative w-full max-w-xs bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-5">
        <h2 className="text-sm font-bold mb-4" style={{ fontFamily: 'var(--font-display)' }}>Keyboard Shortcuts</h2>
        {[['/', 'Search'], ['Esc', 'Close / Back'], ['⌘A', 'Select all'], ['?', 'This help']].map(([k, d]) => (
          <div key={k} className="flex items-center justify-between py-1">
            <span className="text-xs text-zinc-400">{d}</span>
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-zinc-800 border border-zinc-700 rounded text-zinc-400">{k}</kbd>
          </div>
        ))}
      </div>
    </div>
  );
}
