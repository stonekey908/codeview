'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useGraphStore } from '@/store/graph-store';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [providerName, setProviderName] = useState<string>('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { detailNodeId, graphData } = useGraphStore();
  const focusedNode = detailNodeId && graphData
    ? graphData.nodes.find(n => n.id === detailNodeId)
    : null;
  const focusedPath = focusedNode?.relativePath ?? null;

  // Load current provider name for display
  useEffect(() => {
    fetch('/api/providers')
      .then(r => r.json())
      .then(d => {
        const active = d.providers?.find((p: any) => p.id === d.active);
        if (active) setProviderName(active.name);
      })
      .catch(() => {});
  }, [open]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  // Focus input when opening
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  // Escape to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const send = async () => {
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
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const clearChat = () => setMessages([]);

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
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-5 right-5 z-[250] w-[400px] h-[560px] max-h-[calc(100vh-40px)] rounded-xl shadow-2xl border border-border bg-card flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <div className="flex items-center gap-2">
              <MessageCircle size={14} className="text-primary" />
              <h3 className="text-xs font-semibold">Ask about your code</h3>
              {providerName && (
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                  {providerName}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button onClick={clearChat} className="text-[10px] text-muted-foreground hover:text-foreground transition-colors px-1.5">
                  Clear
                </button>
              )}
              <button onClick={() => setOpen(false)} aria-label="Close chat"
                className="text-muted-foreground hover:text-foreground transition-colors">
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Focused component hint */}
          {focusedPath && (
            <div className="px-3 py-1.5 text-[10px] text-muted-foreground border-b border-border bg-muted/40">
              Context: <code className="font-mono text-foreground">{focusedPath}</code>
            </div>
          )}

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-xs text-muted-foreground space-y-2 px-4">
                <MessageCircle size={28} className="opacity-30" />
                <p className="font-medium">Ask anything about this codebase</p>
                <p className="text-[11px]">Try: &ldquo;What does this app do?&rdquo;, &ldquo;How does the upload flow work?&rdquo;, or &ldquo;What components handle authentication?&rdquo;</p>
              </div>
            ) : (
              messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}`}>
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
                <div className="bg-muted rounded-xl px-3 py-2 text-xs flex items-center gap-2 text-muted-foreground">
                  <Loader2 size={12} className="animate-spin" />
                  Thinking...
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-border p-2">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Ask about your code..."
                rows={1}
                disabled={loading}
                className="flex-1 text-xs px-2.5 py-2 rounded-lg border border-border bg-muted text-foreground placeholder:text-muted-foreground/60 resize-none focus:outline-none focus:ring-1 focus:ring-primary max-h-24"
                style={{ minHeight: '34px' }}
              />
              <button
                onClick={send}
                disabled={loading || !input.trim()}
                aria-label="Send message"
                className="shrink-0 w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
              >
                {loading ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              </button>
            </div>
            <p className="text-[9px] text-muted-foreground mt-1 px-1">Enter to send · Shift+Enter for new line · Esc to close</p>
          </div>
        </div>
      )}
    </>
  );
}
