'use client';

import { useGraphStore } from '@/store/graph-store';

export function Breadcrumb() {
  const { detailNodeId, detailNavStack, getNodeById, goBackDetail } = useGraphStore();

  if (!detailNodeId && detailNavStack.length === 0) return null;

  const currentNode = detailNodeId ? getNodeById(detailNodeId) : null;

  return (
    <div className="absolute top-3 left-3 z-10 flex items-center gap-1 text-[11px]">
      <span className="px-2 py-1 rounded bg-zinc-800/60 backdrop-blur-sm border border-zinc-700 text-zinc-400">
        Architecture
      </span>
      {currentNode && (
        <>
          <span className="text-zinc-600">›</span>
          <span className="px-2 py-1 rounded bg-zinc-800/60 backdrop-blur-sm border border-zinc-700 text-zinc-200 font-medium">
            {currentNode.label}
          </span>
        </>
      )}
    </div>
  );
}
