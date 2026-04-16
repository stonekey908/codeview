'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Loader2, Maximize2, Minimize2, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useGraphStore } from '@/store/graph-store';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

type Size = 'normal' | 'large';

const SIZES: Record<Size, { w: string; h: string }> = {
  normal: { w: '480px', h: '620px' },
  large: { w: '720px', h: 'calc(100vh - 40px)' },
};

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [size, setSize] = useState<Size>('normal');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [providerName, setProviderName] = useState<string>('');
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { detailNodeId, graphData } = useGraphStore();
  const focusedNode = detailNodeId && graphData
    ? graphData.nodes.find(n => n.id === detailNodeId)
    : null;
  const focusedPath = focusedNode?.relativePath ?? null;
  const focusedLabel = focusedNode?.label ?? null;

  // Load saved history and current provider on mount
  useEffect(() => {
    Promise.all([
      fetch('/api/chat/history').then(r => r.json()).catch(() => ({ messages: [] })),
      fetch('/api/providers').then(r => r.json()).catch(() => null),
    ]).then(([history, providers]) => {
      if (Array.isArray(history?.messages)) setMessages(history.messages);
      if (providers?.providers) {
        const active = providers.providers.find((p: any) => p.id === providers.active);
        if (active) setProviderName(active.name);
      }
      setHistoryLoaded(true);
    });
  }, []);

  // Persist chat history to server whenever messages change (after initial load)
  useEffect(() => {
    if (!historyLoaded) return;
    const handle = setTimeout(() => {
      fetch('/api/chat/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
      }).catch(() => {});
    }, 500);
    return () => clearTimeout(handle);
  }, [messages, historyLoaded]);

  // Refresh provider name when panel opens
  useEffect(() => {
    if (!open) return;
    fetch('/api/providers').then(r => r.json()).then(d => {
      const active = d.providers?.find((p: any) => p.id === d.active);
      if (active) setProviderName(active.name);
    }).catch(() => {});
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading, size]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open && !loading) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, loading]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: 'user', content: text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: messages,
          focusedPath,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages([...nextMessages, { role: 'assistant', content: `⚠️ ${data.error || 'Something went wrong'}` }]);
      } else {
        setMessages([...nextMessages, { role: 'assistant', content: data.reply }]);
      }
    } catch (err: any) {
      setMessages([...nextMessages, { role: 'assistant', content: `⚠️ ${err?.message || 'Network error'}` }]);
    }
    setLoading(false);
  }, [input, loading, messages, focusedPath]);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const clearChat = async () => {
    if (!confirm('Clear conversation history for this project?')) return;
    setMessages([]);
    await fetch('/api/chat/history', { method: 'DELETE' }).catch(() => {});
  };

  const dims = SIZES[size];

  return (
    <>
      {/* Floating bubble */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open chat"
          className="fixed bottom-5 right-5 z-[250] w-12 h-12 rounded-full shadow-lg bg-primary text-primary-foreground flex items-center justify-center hover:scale-105 transition-transform"
        >
          <MessageCircle size={20} />
          {messages.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
              {messages.length > 99 ? '99' : messages.length}
            </span>
          )}
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div
          className="fixed bottom-5 right-5 z-[250] max-h-[calc(100vh-40px)] rounded-xl shadow-2xl border border-border bg-card flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200"
          style={{ width: dims.w, height: dims.h }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <div className="flex items-center gap-2 min-w-0">
              <MessageCircle size={14} className="text-primary shrink-0" />
              <h3 className="text-xs font-semibold truncate">Ask about your code</h3>
              {providerName && (
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground truncate">
                  {providerName}
                </span>
              )}
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              {messages.length > 0 && (
                <button onClick={clearChat}
                  aria-label="Clear conversation"
                  className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                  <Trash2 size={13} />
                </button>
              )}
              <button onClick={() => setSize(size === 'normal' ? 'large' : 'normal')}
                aria-label={size === 'normal' ? 'Expand chat' : 'Shrink chat'}
                className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                {size === 'normal' ? <Maximize2 size={13} /> : <Minimize2 size={13} />}
              </button>
              <button onClick={() => setOpen(false)} aria-label="Close chat"
                className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Focused component hint (softer wording — "while you're looking at") */}
          {focusedPath && (
            <div className="px-3 py-1.5 text-[10px] text-muted-foreground border-b border-border bg-muted/40 truncate">
              <span className="opacity-70">Viewing:</span> <code className="font-mono text-foreground">{focusedLabel || focusedPath}</code>
            </div>
          )}

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-xs text-muted-foreground space-y-3 px-6">
                <MessageCircle size={32} className="opacity-30" />
                <div>
                  <p className="font-medium text-sm text-foreground mb-1">Ask anything about this codebase</p>
                  <p className="text-[11px] leading-relaxed">
                    Try: &ldquo;What does this app do?&rdquo;, &ldquo;How does the upload flow work?&rdquo;, &ldquo;What components handle auth?&rdquo;
                  </p>
                </div>
              </div>
            ) : (
              messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[90%] rounded-xl px-3.5 py-2.5 text-[12.5px] leading-relaxed ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}`}>
                    {m.role === 'assistant' ? (
                      <div className="chat-markdown">
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                    ) : (
                      m.content
                    )}
                  </div>
                </div>
              ))
            )}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-xl px-3.5 py-2.5 text-xs flex items-center gap-2 text-muted-foreground">
                  <Loader2 size={12} className="animate-spin" />
                  Thinking...
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-border p-2.5">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Ask about your code..."
                rows={1}
                disabled={loading}
                className="flex-1 text-[13px] px-3 py-2 rounded-lg border border-border bg-muted text-foreground placeholder:text-muted-foreground/60 resize-none focus:outline-none focus:ring-1 focus:ring-primary max-h-32"
                style={{ minHeight: '36px' }}
              />
              <button
                onClick={send}
                disabled={loading || !input.trim()}
                aria-label="Send message"
                className="shrink-0 w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              </button>
            </div>
            <p className="text-[9px] text-muted-foreground mt-1.5 px-1">
              Enter to send · Shift+Enter new line · Esc to close · History saved per project
            </p>
          </div>
        </div>
      )}
    </>
  );
}
