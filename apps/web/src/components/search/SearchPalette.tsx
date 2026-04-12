'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { useGraphStore } from '@/store/graph-store';
import { LAYER_COLORS } from '@/components/canvas/layer-colors';

export function SearchPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { graphData, selectNode, openDetail } = useGraphStore();

  // Cmd+K or / to open
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey && e.key === 'k') || (e.key === '/' && !isInputFocused())) {
        e.preventDefault();
        setOpen(true);
        setQuery('');
        setSelectedIndex(0);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const results = query.length > 0
    ? (graphData?.nodes ?? []).filter((n) =>
        n.label.toLowerCase().includes(query.toLowerCase()) ||
        n.relativePath.toLowerCase().includes(query.toLowerCase()) ||
        n.layer.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8)
    : [];

  const handleSelect = useCallback((nodeId: string) => {
    selectNode(nodeId);
    openDetail(nodeId);
    setOpen(false);
    setQuery('');
  }, [selectNode, openDetail]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      handleSelect(results[selectedIndex].id);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-start justify-center pt-[20vh]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />

      {/* Palette */}
      <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Input */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800">
          <Search size={16} className="text-zinc-500 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Search components..."
            className="flex-1 bg-transparent text-sm text-zinc-100 placeholder-zinc-500 outline-none"
          />
          <kbd className="text-[9px] px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-zinc-500 font-mono">
            ESC
          </kbd>
        </div>

        {/* Results */}
        {query.length > 0 && (
          <div className="max-h-64 overflow-y-auto py-1">
            {results.length === 0 ? (
              <p className="px-4 py-6 text-sm text-zinc-500 text-center">
                No components matching &ldquo;{query}&rdquo;
              </p>
            ) : (
              results.map((node, i) => {
                const colors = LAYER_COLORS[node.layer];
                return (
                  <button
                    key={node.id}
                    onClick={() => handleSelect(node.id)}
                    className={`w-full flex items-center gap-2.5 px-4 py-2 text-left transition-colors ${
                      i === selectedIndex ? 'bg-zinc-800' : 'hover:bg-zinc-800/50'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: colors.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-zinc-200 truncate">
                        {node.label}
                      </div>
                      <div className="text-[10px] font-mono text-zinc-500 truncate">
                        {node.relativePath}
                      </div>
                    </div>
                    <span className="text-[10px] text-zinc-600 shrink-0">
                      {node.layer}
                    </span>
                  </button>
                );
              })
            )}
            {results.length > 0 && (
              <div className="px-4 py-2 border-t border-zinc-800 text-[10px] text-zinc-600">
                {results.length} result{results.length !== 1 ? 's' : ''} &middot; ↑↓ navigate &middot; ↵ select
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function isInputFocused(): boolean {
  const el = document.activeElement;
  return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;
}
