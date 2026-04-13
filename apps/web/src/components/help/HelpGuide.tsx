'use client';

import { X } from 'lucide-react';

export function HelpGuide({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[350] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div role="dialog" aria-label="Help guide" className="relative w-full max-w-2xl max-h-[80vh] overflow-y-auto bg-card border border-border rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-border bg-card rounded-t-xl">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-gradient-to-br from-primary to-green-500 flex items-center justify-center text-[8px] text-primary-foreground font-bold">CV</div>
            <h2 className="text-sm font-bold">Getting Started with CodeView</h2>
          </div>
          <button onClick={onClose} aria-label="Close help" className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* What is CodeView */}
          <Section title="What is CodeView?">
            <p>CodeView scans any TypeScript/JavaScript project and turns it into an interactive architecture map. It helps non-technical stakeholders understand what&apos;s being built without reading code.</p>
          </Section>

          {/* Analysing your project */}
          <Section title="Analyse Your Project">
            <p>Point CodeView at any project folder to visualise it:</p>
            <Code>npx tsx apps/cli/bin/codeview.mjs /path/to/your/project</Code>
            <p>This scans all <Mono>.ts</Mono>, <Mono>.tsx</Mono>, <Mono>.js</Mono>, <Mono>.jsx</Mono> files and builds an architecture graph. Results are cached in a <Mono>.codeview/</Mono> folder inside your project.</p>
          </Section>

          {/* Navigation */}
          <Section title="Navigation">
            <div className="grid grid-cols-2 gap-2">
              <NavItem tab="Overview" desc="AI-generated narrative explaining what the app does, key features, and data flows" />
              <NavItem tab="Features" desc="Components grouped by business function — see how a feature works across all layers" />
              <NavItem tab="Categories" desc="Components grouped by technical layer (UI, API, Data, Utils, External)" />
              <NavItem tab="Architecture" desc="Interactive graph showing how layers connect with dependency lines" />
            </div>
          </Section>

          {/* AI Features */}
          <Section title="AI Features">
            <p>AI features use your existing terminal AI subscription — no separate API keys needed.</p>
            <div className="space-y-2 mt-2">
              <AiFeature
                name="⚡ Enhance"
                desc="Reads every file and generates better titles, correct layer categorisation, and one-sentence descriptions. Processes in batches of 30."
                time="30-90s"
              />
              <AiFeature
                name="✨ Explain"
                desc="Select specific components for deep analysis. AI reads the full source code and writes a detailed plain-English explanation."
                time="5-15s per component"
              />
              <AiFeature
                name="📖 Overview"
                desc="Generates a narrative covering what the app does, its features, data flows, backend services, and data types."
                time="30-60s"
              />
            </div>
            <p className="text-muted-foreground mt-3">Currently supports <strong className="text-foreground">Claude Code</strong> and <strong className="text-foreground">Gemini CLI</strong>. Set <Mono>CODEVIEW_AI_PROVIDER=gemini</Mono> to switch providers.</p>
          </Section>

          {/* Interactions */}
          <Section title="Interactions">
            <div className="space-y-1">
              {[
                ['Click a component', 'Opens the detail panel with description, connections, and source code'],
                ['Shift + Click', 'Multi-select components in the Architecture graph'],
                ['Double-click (graph)', 'Focus mode — dims everything except the selected component and its connections'],
                ['Drag panel edges', 'Resize the left panel and detail panel'],
                ['⌘K or /', 'Open the search palette to find any component'],
                ['Esc', 'Close panels, exit focus mode, or clear selection'],
                ['?', 'Toggle keyboard shortcuts help'],
              ].map(([action, desc]) => (
                <div key={action} className="flex items-start gap-3 py-1.5">
                  <kbd className="shrink-0 px-1.5 py-0.5 text-[10px] font-mono bg-muted border border-border rounded text-muted-foreground min-w-[120px] text-center">{action}</kbd>
                  <span className="text-[12px] text-muted-foreground">{desc}</span>
                </div>
              ))}
            </div>
          </Section>

          {/* Detail Panel */}
          <Section title="Component Detail Panel">
            <p>Click any component to see its detail panel with three tabs:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground mt-1">
              <li><strong className="text-foreground">Overview</strong> — description, AI explanation, and key stats (exports, imports, connections)</li>
              <li><strong className="text-foreground">Connections</strong> — what this component uses and what uses it, with clickable links to navigate</li>
              <li><strong className="text-foreground">Code</strong> — syntax-highlighted source code with line numbers and copy button</li>
            </ul>
          </Section>

          {/* CLI */}
          <Section title="CLI Options">
            <Code>{`npx tsx apps/cli/bin/codeview.mjs [directory] [options]

Options:
  --port <number>   Port for web server (default: 4200)
  --no-open         Don't open the browser
  -h, --help        Show help

Environment:
  CODEVIEW_AI_PROVIDER   Force AI provider (claude, gemini, or path)`}</Code>
          </Section>

          {/* Privacy */}
          <Section title="Privacy & Data">
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li><strong className="text-foreground">100% local</strong> — runs entirely on your machine, no data sent anywhere</li>
              <li><strong className="text-foreground">Read-only</strong> — CodeView never modifies your project files</li>
              <li><strong className="text-foreground">No API keys</strong> — AI features use your existing terminal subscription</li>
              <li><strong className="text-foreground">.codeview/ folder</strong> — cached analysis in your project, add to .gitignore if preferred</li>
            </ul>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">{title}</h3>
      <div className="text-[13px] leading-relaxed text-foreground space-y-2">{children}</div>
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <pre className="text-[11px] font-mono bg-muted border border-border rounded-lg px-3 py-2 overflow-x-auto text-muted-foreground whitespace-pre-wrap">{children}</pre>
  );
}

function Mono({ children }: { children: React.ReactNode }) {
  return <code className="text-[11px] font-mono bg-muted px-1 py-0.5 rounded">{children}</code>;
}

function NavItem({ tab, desc }: { tab: string; desc: string }) {
  return (
    <div className="bg-muted border border-border rounded-lg p-2.5">
      <div className="text-[12px] font-semibold text-foreground">{tab}</div>
      <div className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{desc}</div>
    </div>
  );
}

function AiFeature({ name, desc, time }: { name: string; desc: string; time: string }) {
  return (
    <div className="bg-muted border border-border rounded-lg p-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-semibold text-foreground">{name}</span>
        <span className="text-[9px] font-mono text-muted-foreground bg-card border border-border px-1.5 py-0.5 rounded">{time}</span>
      </div>
      <div className="text-[10px] text-muted-foreground mt-1 leading-snug">{desc}</div>
    </div>
  );
}
