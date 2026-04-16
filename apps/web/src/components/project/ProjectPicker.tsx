'use client';

import { useState, useEffect } from 'react';
import { FolderOpen, Loader2 } from 'lucide-react';

const RECENT_KEY = 'codeview-recent-projects';
const MAX_RECENT = 5;

function getRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(p => typeof p === 'string') : [];
  } catch {
    return [];
  }
}

function saveRecent(path: string) {
  try {
    const current = getRecent().filter(p => p !== path);
    const updated = [path, ...current].slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
  } catch {}
}

interface ProjectPickerProps {
  onLoaded: () => void;
  compact?: boolean;
}

export function ProjectPicker({ onLoaded, compact = false }: ProjectPickerProps) {
  const [path, setPath] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => { setRecent(getRecent()); }, []);

  const browse = async () => {
    setError(null);
    try {
      const res = await fetch('/api/browse');
      const data = await res.json();
      if (data.cancelled) return;
      if (!data.ok || !data.path) {
        setError(data.error || 'Could not open folder picker');
        return;
      }
      // Auto-load the selected folder
      load(data.path);
    } catch (err: any) {
      setError(err?.message || 'Could not open folder picker');
    }
  };

  const load = async (targetPath: string) => {
    if (!targetPath.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: targetPath.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to load project');
        setLoading(false);
        return;
      }
      saveRecent(data.projectDir);
      setRecent(getRecent());
      onLoaded();
    } catch (err: any) {
      setError(err?.message || 'Network error');
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    load(path);
  };

  if (compact) {
    return (
      <div className="space-y-2">
        <button onClick={browse} disabled={loading}
          className="w-full px-2 py-1.5 text-[11px] font-medium rounded-md border border-primary/30 text-primary bg-primary/5 hover:bg-primary/10 transition-colors disabled:opacity-40 flex items-center gap-1.5 justify-center">
          <FolderOpen size={11} /> Browse folders...
        </button>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="or paste a path"
            disabled={loading}
            className="flex-1 text-[11px] px-2 py-1.5 rounded-md border border-border bg-muted text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button type="submit" disabled={loading || !path.trim()}
            className="px-3 py-1.5 text-[11px] font-medium rounded-md border border-border text-foreground hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1">
            {loading ? <Loader2 size={11} className="animate-spin" /> : 'Load'}
          </button>
        </form>
        {error && <p className="text-[10px] text-red-400">{error}</p>}
        {recent.length > 0 && (
          <div className="space-y-1">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Recent</p>
            {recent.map((p) => (
              <button key={p} onClick={() => load(p)} disabled={loading}
                className="w-full text-left text-[10px] px-2 py-1 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground truncate disabled:opacity-40">
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center bg-background">
      <div className="text-center max-w-lg px-6">
        <div className="text-4xl mb-4 opacity-40">📦</div>
        <h2 className="text-lg font-semibold text-foreground mb-2">Load a project</h2>
        <p className="text-sm text-muted-foreground mb-5">
          Pick the folder you want to visualise. CodeView will scan the TypeScript and JavaScript files and build an interactive architecture map.
        </p>

        <button onClick={browse} disabled={loading}
          className="w-full mb-3 px-5 py-3 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
          {loading ? <Loader2 size={14} className="animate-spin" /> : <FolderOpen size={14} />}
          {loading ? 'Analysing...' : 'Browse folders'}
        </button>

        <p className="text-[10px] text-muted-foreground uppercase tracking-wider my-3">or paste a path</p>

        <form onSubmit={handleSubmit} className="flex gap-2 mb-3">
          <input
            type="text"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="/Users/you/my-project"
            disabled={loading}
            className="flex-1 text-sm px-3 py-2 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <button type="submit" disabled={loading || !path.trim()}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-foreground hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            Load
          </button>
        </form>

        {error && (
          <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-3 text-left">
            {error}
          </div>
        )}

        {recent.length > 0 && (
          <div className="mt-6 text-left">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Recent projects</p>
            <div className="space-y-1">
              {recent.map((p) => (
                <button key={p} onClick={() => load(p)} disabled={loading}
                  className="w-full text-left text-xs px-3 py-2 rounded-lg border border-border bg-card hover:bg-accent transition-colors text-foreground truncate disabled:opacity-40">
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground/60 mt-6">
          Tip: you can also start from the terminal with <code className="font-mono bg-muted px-1 py-0.5 rounded">npx codeview /path/to/project</code>
        </p>
      </div>
    </div>
  );
}
