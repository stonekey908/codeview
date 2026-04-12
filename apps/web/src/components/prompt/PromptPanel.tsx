'use client';

import { useState, useMemo } from 'react';
import { Copy, X, ChevronDown, Check } from 'lucide-react';
import { useGraphStore } from '@/store/graph-store';
import { LAYER_COLORS } from '@/components/canvas/layer-colors';
import { assembleContext } from '@codeview/prompt-builder';

export function PromptPanel() {
  const { selectedNodeIds, graphData, toggleNodeSelection, clearSelection } = useGraphStore();
  const [question, setQuestion] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  if (selectedNodeIds.size === 0 || !graphData) return null;

  const selectedNodes = graphData.nodes.filter((n) => selectedNodeIds.has(n.id));

  const contextText = useMemo(() => {
    return assembleContext({
      selectedNodeIds: Array.from(selectedNodeIds),
      question: question.trim() || undefined,
      graphData,
    });
  }, [selectedNodeIds, question, graphData]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(contextText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-zinc-900 border-t border-zinc-800 animate-in slide-in-from-bottom-2 duration-200">
      {/* Selection chips */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-zinc-800 overflow-x-auto">
        <span className="text-[9px] font-semibold text-zinc-500 uppercase tracking-wide shrink-0">
          Selected ({selectedNodes.length})
        </span>
        {selectedNodes.slice(0, 10).map((node) => {
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
        {selectedNodes.length > 10 && (
          <span className="text-[10px] text-zinc-500 shrink-0">
            +{selectedNodes.length - 10} more
          </span>
        )}
        <button
          onClick={clearSelection}
          className="text-[10px] text-zinc-500 hover:text-zinc-300 ml-auto shrink-0"
        >
          Clear all
        </button>
      </div>

      {/* Preview Context — collapsible */}
      <div className="border-b border-zinc-800">
        <button
          onClick={() => setPreviewOpen(!previewOpen)}
          className="w-full flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <ChevronDown size={10} className={`transition-transform ${previewOpen ? 'rotate-180' : ''}`} />
          Preview what Claude will see
        </button>
        {previewOpen && (
          <div className="px-3 pb-2 animate-in fade-in slide-in-from-top-1 duration-150">
            <pre className="p-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-[10.5px] font-mono text-zinc-400 leading-relaxed whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
              {contextText}
            </pre>
          </div>
        )}
      </div>

      {/* Input row */}
      <div className="flex items-center gap-2 px-3 py-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleCopy(); }}
          placeholder="Ask Claude about these components... (Enter to copy)"
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-colors"
        />
        <button
          onClick={handleCopy}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all shrink-0 ${
            copied
              ? 'bg-green-500 text-white'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? 'Copied!' : 'Copy to Clipboard'}
        </button>
      </div>
    </div>
  );
}
