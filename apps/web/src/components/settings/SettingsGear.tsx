'use client';

import { useState, useEffect, useCallback } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Settings, X } from 'lucide-react';
import { ProjectPicker } from '@/components/project/ProjectPicker';

interface ProviderInfo {
  id: string;
  name: string;
  type: 'cli' | 'http';
  available: boolean;
  contextWindow: number;
}

interface ProvidersResponse {
  active: string | null;
  setting: string | null;
  batchSize: number | null;
  providers: ProviderInfo[];
}

function defaultBatchSize(provider: ProviderInfo | undefined): number {
  if (!provider) return 30;
  if (provider.type === 'http') {
    return provider.contextWindow >= 65536 ? 15 : 5;
  }
  return 30;
}

export function SettingsGear({ onRegenerate, onProjectLoaded }: { onRegenerate?: (mode: 'all' | 'new') => void; onProjectLoaded?: () => void }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<ProvidersResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [batchOverride, setBatchOverride] = useState('');
  const [showProjectPicker, setShowProjectPicker] = useState(false);

  const fetchProviders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/providers');
      if (res.ok) {
        const d: ProvidersResponse = await res.json();
        setData(d);
        setBatchOverride(d.batchSize ? String(d.batchSize) : '');
      }
    } catch {}
    setLoading(false);
  }, []);

  // Refresh provider list each time popover opens
  useEffect(() => {
    if (open) fetchProviders();
  }, [open, fetchProviders]);

  const saveProvider = async (providerId: string | null) => {
    await fetch('/api/providers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: providerId }),
    });
    fetchProviders();
  };

  const saveBatchSize = async (size: number | null) => {
    await fetch('/api/providers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batchSize: size }),
    });
  };

  const selectedProvider = data?.providers.find(p =>
    data.setting ? p.id === data.setting : p.id === data.active
  );
  const autoBatch = defaultBatchSize(selectedProvider);
  const hasOllama = data?.providers.some(p => p.type === 'http') ?? false;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          aria-label="AI provider settings"
          className="w-7 h-7 flex items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <Settings size={13} />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="end"
          sideOffset={6}
          className="z-[200] w-72 rounded-lg border border-border bg-card shadow-lg animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <span className="text-[11px] font-semibold text-foreground">AI Provider</span>
            <Popover.Close asChild>
              <button className="text-muted-foreground hover:text-foreground" aria-label="Close">
                <X size={12} />
              </button>
            </Popover.Close>
          </div>

          <div className="p-3 space-y-3">
            {/* Provider selector */}
            <div>
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Provider</label>
              <select
                value={data?.setting ?? ''}
                onChange={(e) => saveProvider(e.target.value || null)}
                className="mt-1 w-full text-[11px] px-2 py-1.5 rounded-md border border-border bg-muted text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Auto ({data?.providers.find(p => p.id === data?.active)?.name ?? 'detecting...'})</option>
                {data?.providers.filter(p => p.available).map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              {!hasOllama && !loading && (
                <p className="mt-1 text-[9px] text-muted-foreground">Start Ollama to see local models</p>
              )}
            </div>

            {/* Batch size */}
            <div>
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Batch Size</label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={50}
                  placeholder={`Auto (${autoBatch})`}
                  value={batchOverride}
                  onChange={(e) => {
                    setBatchOverride(e.target.value);
                    const val = e.target.value ? parseInt(e.target.value, 10) : null;
                    if (val === null || (!isNaN(val) && val > 0)) {
                      saveBatchSize(val);
                    }
                  }}
                  className="w-full text-[11px] px-2 py-1.5 rounded-md border border-border bg-muted text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <p className="mt-0.5 text-[9px] text-muted-foreground">Components per AI request</p>
            </div>

            {/* Project switcher */}
            <div>
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Project</label>
              {showProjectPicker ? (
                <div className="mt-1">
                  <ProjectPicker
                    compact
                    onLoaded={() => {
                      setShowProjectPicker(false);
                      setOpen(false);
                      onProjectLoaded?.();
                    }}
                  />
                  <button
                    onClick={() => setShowProjectPicker(false)}
                    className="mt-1 text-[9px] text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowProjectPicker(true)}
                  className="mt-1 w-full px-2 py-1.5 text-[11px] font-medium rounded-md border border-border text-foreground hover:bg-accent transition-colors text-left"
                >
                  Change project...
                </button>
              )}
            </div>

            {/* Regenerate */}
            <div>
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Regenerate</label>
              <div className="mt-1 flex gap-2">
                <button
                  onClick={() => { onRegenerate?.('all'); setOpen(false); }}
                  className="flex-1 px-2 py-1.5 text-[10px] font-medium rounded-md border border-border text-foreground hover:bg-accent transition-colors"
                >
                  Regenerate All
                </button>
                <button
                  onClick={() => { onRegenerate?.('new'); setOpen(false); }}
                  className="flex-1 px-2 py-1.5 text-[10px] font-medium rounded-md border border-border text-foreground hover:bg-accent transition-colors"
                >
                  Update New Only
                </button>
              </div>
              <p className="mt-0.5 text-[9px] text-muted-foreground">Regenerate All clears existing data first</p>
            </div>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
