'use client';

import { useEffect, useRef } from 'react';
import { Toolbar } from '@/components/toolbar/Toolbar';
import { LeftPanel } from '@/components/left/LeftPanel';
import { GraphCanvas } from '@/components/graph/GraphCanvas';
import { DetailPanel } from '@/components/detail/DetailPanel';
import { SearchPalette } from '@/components/search/SearchPalette';
import { KeyboardShortcuts } from '@/components/keyboard/KeyboardShortcuts';
import { OverviewPanel } from '@/components/overview/OverviewPanel';
import { useGraphStore } from '@/store/graph-store';
import { buildGraph, computeLayout } from '@codeview/graph-engine';
import type { LayoutResult } from '@codeview/graph-engine';
import type { GraphData } from '@codeview/shared';
import { buildRfNodes } from '@/lib/build-rf-nodes';

// Demo: "Taskflow" — a project management SaaS (like Linear/Asana)
const imp = (source: string, specifiers: string[]) => ({ source, specifiers, isTypeOnly: false, isDynamic: false });
const exp = (name: string, isDefault = false) => ({ name, isDefault, isTypeOnly: false });
const fw = (role: string, framework = 'nextjs', confidence = 0.95) => ({ role, confidence, framework });
const f = (relativePath: string, imports: any[], exports: any[], framework: any) => ({
  filePath: `/demo/${relativePath}`, relativePath, imports, exports, framework,
});

const DEMO_FILES = [
  // ── UI: Pages ──
  f('src/app/page.tsx',
    [imp('@/components/Dashboard', ['Dashboard']), imp('@/hooks/useAuth', ['useAuth']), imp('@/hooks/useProjects', ['useProjects'])],
    [exp('default', true)], fw('page')),
  f('src/app/layout.tsx',
    [imp('@/components/Sidebar', ['Sidebar']), imp('@/components/TopNav', ['TopNav']), imp('@/providers/AuthProvider', ['AuthProvider'])],
    [exp('default', true)], fw('layout')),
  f('src/app/projects/[id]/page.tsx',
    [imp('@/components/TaskBoard', ['TaskBoard']), imp('@/hooks/useProject', ['useProject']), imp('@/hooks/useTasks', ['useTasks'])],
    [exp('default', true)], fw('page')),
  f('src/app/settings/page.tsx',
    [imp('@/components/SettingsForm', ['SettingsForm']), imp('@/hooks/useAuth', ['useAuth']), imp('@/api/billing', ['billingApi'])],
    [exp('default', true)], fw('page')),
  f('src/app/login/page.tsx',
    [imp('@/components/LoginForm', ['LoginForm']), imp('@/api/auth', ['authApi'])],
    [exp('default', true)], fw('page')),

  // ── UI: Components ──
  f('src/components/Dashboard.tsx',
    [imp('@/components/ProjectCard', ['ProjectCard']), imp('@/components/ActivityFeed', ['ActivityFeed']), imp('@/components/StatsBar', ['StatsBar'])],
    [exp('Dashboard')], fw('component')),
  f('src/components/TaskBoard.tsx',
    [imp('@/components/TaskCard', ['TaskCard']), imp('@/components/TaskColumn', ['TaskColumn']), imp('@/hooks/useDragDrop', ['useDragDrop']), imp('@/api/tasks', ['tasksApi'])],
    [exp('TaskBoard')], fw('component')),
  f('src/components/TaskCard.tsx',
    [imp('@/components/Avatar', ['Avatar']), imp('@/components/PriorityBadge', ['PriorityBadge']), imp('@/utils/formatDate', ['formatDate'])],
    [exp('TaskCard')], fw('component')),
  f('src/components/Sidebar.tsx',
    [imp('@/hooks/useProjects', ['useProjects']), imp('@/components/ProjectList', ['ProjectList'])],
    [exp('Sidebar')], fw('component')),
  f('src/components/ActivityFeed.tsx',
    [imp('@/hooks/useRealtime', ['useRealtime']), imp('@/utils/formatDate', ['formatDate']), imp('@/utils/formatRelativeTime', ['formatRelativeTime'])],
    [exp('ActivityFeed')], fw('component')),
  f('src/components/LoginForm.tsx',
    [imp('@/api/auth', ['authApi']), imp('@/utils/validateEmail', ['validateEmail'])],
    [exp('LoginForm')], fw('component')),
  f('src/components/SettingsForm.tsx',
    [imp('@/api/billing', ['billingApi']), imp('@/hooks/useAuth', ['useAuth'])],
    [exp('SettingsForm')], fw('component')),

  // ── UI: Hooks ──
  f('src/hooks/useAuth.tsx',
    [imp('@/api/auth', ['authApi']), imp('@/lib/supabase', ['supabase'])],
    [exp('useAuth'), exp('AuthProvider')], fw('hook')),
  f('src/hooks/useProjects.ts',
    [imp('@/api/projects', ['projectsApi']), imp('@/hooks/useRealtime', ['useRealtime'])],
    [exp('useProjects')], fw('hook')),
  f('src/hooks/useTasks.ts',
    [imp('@/api/tasks', ['tasksApi']), imp('@/hooks/useRealtime', ['useRealtime'])],
    [exp('useTasks')], fw('hook')),
  f('src/hooks/useRealtime.ts',
    [imp('@/lib/supabase', ['supabase'])],
    [exp('useRealtime')], fw('hook')),

  // ── API: Route Handlers ──
  f('src/app/api/auth/route.ts',
    [imp('@/lib/supabase', ['supabase']), imp('@/utils/jwt', ['signToken', 'verifyToken'])],
    [exp('POST'), exp('GET')], fw('api-route')),
  f('src/app/api/projects/route.ts',
    [imp('@/lib/supabase', ['supabase']), imp('@/lib/permissions', ['checkPermission'])],
    [exp('GET'), exp('POST'), exp('DELETE')], fw('api-route')),
  f('src/app/api/tasks/route.ts',
    [imp('@/lib/supabase', ['supabase']), imp('@/lib/permissions', ['checkPermission']), imp('@/services/ai-assistant', ['aiAssistant'])],
    [exp('GET'), exp('POST'), exp('PATCH')], fw('api-route')),
  f('src/app/api/billing/route.ts',
    [imp('@/services/stripe', ['stripeClient']), imp('@/lib/supabase', ['supabase'])],
    [exp('GET'), exp('POST')], fw('api-route')),
  f('src/app/api/webhooks/stripe/route.ts',
    [imp('@/services/stripe', ['stripeClient']), imp('@/lib/supabase', ['supabase'])],
    [exp('POST')], fw('api-route')),
  f('src/app/api/ai/summarize/route.ts',
    [imp('@/services/ai-assistant', ['aiAssistant']), imp('@/lib/supabase', ['supabase'])],
    [exp('POST')], fw('api-route')),

  // ── External: Services ──
  f('src/services/stripe.ts',
    [],
    [exp('stripeClient'), exp('createCheckoutSession'), exp('handleWebhook')], fw('service', 'unknown', 0.8)),
  f('src/services/ai-assistant.ts',
    [imp('@/lib/openai', ['openai'])],
    [exp('aiAssistant'), exp('summarizeProject'), exp('suggestTasks')], fw('service', 'unknown', 0.8)),
  f('src/services/email.ts',
    [],
    [exp('sendInvite'), exp('sendNotification')], fw('service', 'unknown', 0.7)),
  f('src/lib/supabase.ts',
    [],
    [exp('supabase'), exp('supabaseAdmin')], fw('config', 'unknown', 0.9)),
  f('src/lib/openai.ts',
    [],
    [exp('openai')], fw('config', 'unknown', 0.8)),

  // ── Utils ──
  f('src/utils/jwt.ts',
    [],
    [exp('signToken'), exp('verifyToken')], fw('utility', 'unknown', 0.6)),
  f('src/utils/formatDate.ts',
    [],
    [exp('formatDate'), exp('formatRelativeTime')], fw('utility', 'unknown', 0.6)),
  f('src/utils/validateEmail.ts',
    [],
    [exp('validateEmail'), exp('validatePassword')], fw('utility', 'unknown', 0.6)),
  f('src/lib/permissions.ts',
    [imp('@/lib/supabase', ['supabase'])],
    [exp('checkPermission'), exp('requireAdmin')], fw('utility', 'unknown', 0.7)),

  // ── Data: Types & Constants ──
  f('src/types/project.ts',
    [],
    [exp('Project'), exp('Task'), exp('TaskStatus'), exp('Priority')], fw('unknown', 'unknown', 0.3)),
  f('src/types/user.ts',
    [],
    [exp('User'), exp('Team'), exp('Role')], fw('unknown', 'unknown', 0.3)),
  f('src/constants/priorities.ts',
    [],
    [exp('PRIORITIES'), exp('STATUS_LABELS'), exp('PRIORITY_COLORS')], fw('unknown', 'unknown', 0.3)),
];

export default function Home() {
  const { setGraphData, setRfNodes, setRfEdges, setLoading, theme, setTheme, graphData, detailMode, middleView, detailWidth, leftWidth, leftTab, detailNodeId, isLoading } = useGraphStore();
  const layoutRef = useRef<LayoutResult | null>(null);

  // Restore theme from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('codeview-theme') as 'dark' | 'light' | null;
      if (saved) { setTheme(saved); document.documentElement.classList.toggle('dark', saved === 'dark'); }
    } catch {}
  }, [setTheme]);

  useEffect(() => {
    async function init() {
      setLoading(true, 'Loading architecture...');
      let graph: GraphData;
      try {
        const res = await fetch('/api/analysis');
        if (res.ok) {
          const data = await res.json();
          graph = data.graph || buildGraph({ rootDir: '/demo', files: DEMO_FILES, errors: [] });
        } else {
          graph = buildGraph({ rootDir: '/demo', files: DEMO_FILES, errors: [] });
        }
      } catch {
        graph = buildGraph({ rootDir: '/demo', files: DEMO_FILES, errors: [] });
      }
      setGraphData(graph);
      const layout = await computeLayout(graph);
      layoutRef.current = layout;
      const { nodes, edges } = buildRfNodes(graph, layout, theme);
      setRfNodes(nodes);
      setRfEdges(edges);
      setLoading(false);
    }
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!graphData || !layoutRef.current) return;
    const { nodes, edges } = buildRfNodes(graphData, layoutRef.current, theme);
    setRfNodes(nodes);
    setRfEdges(edges);
  }, [theme, graphData, setRfNodes, setRfEdges]);

  // Layout
  const showOverview = leftTab === 'overview';
  const isSlideOut = detailMode === 'slide-out';
  const isExpanded = detailMode === 'expanded';
  const hasDetail = !!detailNodeId;

  // Graph shows for: Architecture tab always, OR any tab when slide-out mode
  const showGraph = leftTab === 'architecture' || (isSlideOut && hasDetail);
  const showSlideOut = isSlideOut && hasDetail;
  // Full-width detail for Features/Categories when expanded
  const showFullDetail = !showOverview && !showGraph && isExpanded && hasDetail;
  // Empty state when no component selected in Features/Categories
  const showEmpty = !showOverview && !showGraph && !showFullDetail && !hasDetail;

  let gridCols = `${leftWidth}px 1fr`;
  if (showSlideOut) gridCols = `${leftWidth}px 1fr ${detailWidth}px`;

  return (
    <div className="h-screen flex flex-col">
      <Toolbar />
      <div className="flex-1 overflow-hidden" style={{ display: 'grid', gridTemplateColumns: gridCols }}>
        <LeftPanel />
        {showOverview && <OverviewPanel />}
        {showGraph && <GraphCanvas />}
        {showSlideOut && <DetailPanel />}
        {showFullDetail && <DetailPanel fullWidth />}
        {showEmpty && (
          <div className="h-full flex items-center justify-center bg-background">
            <div className="text-center">
              <div className="text-3xl mb-3 opacity-30">←</div>
              <p className="text-sm text-muted-foreground">Select a component from the left panel</p>
            </div>
          </div>
        )}
      </div>
      <SearchPalette />
      <KeyboardShortcuts />
    </div>
  );
}
