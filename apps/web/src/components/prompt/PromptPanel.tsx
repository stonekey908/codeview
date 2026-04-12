'use client';

import { useState } from 'react';
import { Copy, X } from 'lucide-react';
import { useGraphStore } from '@/store/graph-store';
import { LAYER_COLORS } from '@/components/canvas/layer-colors';

export function PromptPanel() {
  const { selectedNodeIds, graphData, toggleNodeSelection, clearSelection } = useGraphStore();
  const [question, setQuestion] = useState('');

  if (selectedNodeIds.size === 0) return null;

  const selectedNodes = graphData?.nodes.filter((n) => selectedNodeIds.has(n.id)) ?? [];

  const assembleContext = () => {
    const lines = ['I\'m asking about these components in the architecture:\n'];
    selectedNodes.forEach((node, i) => {
      const deps = graphData?.edges.filter((e) => e.source === node.id) ?? [];
      const depNames = deps
        .map((d) => graphData?.nodes.find((n) => n.id === d.target)?.label)
        .filter(Boolean);
      lines.push(`${i + 1}. ${node.label} (${node.relativePath})`);
      lines.push(`   - ${node.description}`);
      lines.push(`   - Layer: ${node.layer}`);
      if (depNames.length > 0) lines.push(`   - Depends on: ${depNames.join(', ')}`);
      lines.push('');
    });
    if (question.trim()) {
      lines.push(`Question: ${question.trim()}`);
    }
    return lines.join('\n');
  };

  const handleCopy = async () => {
    const text = assembleContext();
    await navigator.clipboard.writeText(text);
  };

  return (
    <div className="bg-zinc-900 border-t border-zinc-800 animate-in slide-in-from-bottom-2 duration-200">
      {/* Selection chips */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-zinc-800 overflow-x-auto">
        <span className="text-[9px] font-semibold text-zinc-500 uppercase tracking-wide shrink-0">
          Selected
        </span>
        {selectedNodes.map((node) => {
          const colors = LAYER_COLORS[node.layer];
          return (
            <div
              key={node.id}
              className="flex items-center gap-1 px-2 py-0.5 bg-blue-500/10 border border-blue-500/25 rounded-full text-[11px] font-medium text-blue-400 shrink-0"
            >
              <span className="w-1 h-1 rounded-full" style={{ backgroundColor: colors.color }} />
              {node.label}
              <button
                onClick={() => toggleNodeSelection(node.id)}
                className="w-3 h-3 flex items-center justify-center rounded-full opacity-50 hover:opacity-100"
              >
                <X size={8} />
              </button>
            </div>
          );
        })}
        <button
          onClick={clearSelection}
          className="text-[10px] text-zinc-500 hover:text-zinc-300 ml-auto shrink-0"
        >
          Clear all
        </button>
      </div>

      {/* Input row */}
      <div className="flex items-center gap-2 px-3 py-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask Claude about these components..."
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-colors"
        />
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-500 text-white rounded-lg text-xs font-semibold hover:bg-blue-600 transition-colors shrink-0"
        >
          <Copy size={13} />
          Copy to Clipboard
        </button>
      </div>
    </div>
  );
}
