'use client';

import { useGraphStore, type ZoomLevel } from '@/store/graph-store';
import { Search, Moon, Sun, Eye } from 'lucide-react';

const ZOOM_LEVELS: { key: ZoomLevel; label: string }[] = [
  { key: 'architecture', label: 'Architecture' },
  { key: 'modules', label: 'Modules' },
  { key: 'components', label: 'Components' },
];

export function Toolbar() {
  const { viewMode, setViewMode, zoomLevel, setZoomLevel, theme, setTheme, graphData } = useGraphStore();

  const totalComponents = graphData?.nodes.length ?? 0;
  const totalConnections = graphData?.edges.length ?? 0;

  return (
    <header className="flex items-center justify-between px-3.5 h-12 bg-zinc-900 border-b border-zinc-800">
      {/* Left: Logo + project */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <span className="text-sm font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
            CodeView
          </span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-800 border border-zinc-700 rounded-full text-xs font-mono text-zinc-400">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          {totalComponents > 0
            ? `${totalComponents} components · ${totalConnections} connections`
            : 'No project loaded'
          }
        </div>
      </div>

      {/* Center: Zoom level switcher */}
      <div className="flex gap-px p-0.5 bg-zinc-800 border border-zinc-700 rounded-lg">
        {ZOOM_LEVELS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setZoomLevel(key)}
            className={`px-3 py-1 text-[11px] font-medium rounded-md transition-all ${
              zoomLevel === key
                ? 'bg-zinc-700 text-zinc-100 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-1.5">
        {/* Descriptive/Technical toggle */}
        <button
          onClick={() => setViewMode(viewMode === 'descriptive' ? 'technical' : 'descriptive')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
            viewMode === 'technical'
              ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
              : 'border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600'
          }`}
        >
          <Eye size={13} />
          Technical
        </button>

        {/* Search */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-800 border border-zinc-700 rounded-md text-zinc-500 text-[11px] min-w-[140px] cursor-text hover:border-zinc-600">
          <Search size={12} className="opacity-50" />
          <span>Search...</span>
          <kbd className="ml-auto text-[9px] px-1 py-px bg-zinc-700 border border-zinc-600 rounded text-zinc-400 font-mono">
            /
          </kbd>
        </div>

        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="w-7 h-7 flex items-center justify-center rounded-md border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-colors"
        >
          {theme === 'dark' ? <Moon size={14} /> : <Sun size={14} />}
        </button>
      </div>
    </header>
  );
}
