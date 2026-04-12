'use client';

import { ChevronRight } from 'lucide-react';
import { useGraphStore } from '@/store/graph-store';

export function Breadcrumb() {
  const { zoomLevel, setZoomLevel } = useGraphStore();

  const crumbs = [
    { key: 'architecture' as const, label: 'All Layers' },
    ...(zoomLevel === 'modules' || zoomLevel === 'components'
      ? [{ key: 'modules' as const, label: 'All Modules' }]
      : []),
    ...(zoomLevel === 'components'
      ? [{ key: 'components' as const, label: 'All Components' }]
      : []),
  ];

  return (
    <div className="absolute top-3 left-3 z-10 flex items-center gap-1">
      {crumbs.map((crumb, i) => (
        <div key={crumb.key} className="flex items-center gap-1">
          {i > 0 && <ChevronRight size={10} className="text-zinc-600" />}
          <button
            onClick={() => setZoomLevel(crumb.key)}
            className={`px-2 py-1 rounded text-[11px] transition-colors ${
              i === crumbs.length - 1
                ? 'text-zinc-200 font-medium bg-zinc-800/60 backdrop-blur-sm border border-zinc-700'
                : 'text-zinc-500 hover:text-zinc-300 bg-zinc-800/40 backdrop-blur-sm border border-zinc-800'
            }`}
          >
            {crumb.label}
          </button>
        </div>
      ))}
    </div>
  );
}
