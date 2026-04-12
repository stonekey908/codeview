#!/usr/bin/env npx tsx

import { resolve, join } from 'path';
import { existsSync, writeFileSync, mkdirSync } from 'fs';
import { spawn } from 'child_process';

const args = process.argv.slice(2);
const flags = {};
let targetDir = '.';

// Parse flags
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--port') { flags.port = args[++i]; continue; }
  if (args[i] === '--no-open') { flags.noOpen = true; continue; }
  if (args[i] === '--help' || args[i] === '-h') { flags.help = true; continue; }
  if (!args[i].startsWith('-')) { targetDir = args[i]; }
}

if (flags.help) {
  console.log(`
  codeview — Visual architecture companion for Claude Code

  Usage:
    npx codeview [directory] [options]

  Options:
    --port <number>   Port for the web server (default: 4200)
    --no-open         Don't open the browser automatically
    -h, --help        Show this help message

  Examples:
    npx codeview                    # Analyze current directory
    npx codeview ./my-project       # Analyze a specific directory
    npx codeview --port 3000        # Use a custom port
`);
  process.exit(0);
}

const port = flags.port || '4200';
const projectDir = resolve(targetDir);

if (!existsSync(projectDir)) {
  console.error(`\x1b[31mError:\x1b[0m Directory not found: ${projectDir}`);
  process.exit(1);
}

console.log('');
console.log('  \x1b[1m\x1b[36m▲ CodeView\x1b[0m');
console.log('');
console.log(`  \x1b[2mProject:\x1b[0m  ${projectDir}`);
console.log(`  \x1b[2mPort:\x1b[0m     ${port}`);
console.log('');

// Phase 1: Analyze the project
console.log('  \x1b[33m◌\x1b[0m Scanning project files...');
const startTime = Date.now();

try {
  const { analyzeProject } = await import('@codeview/analyzer');
  const { buildGraph, computeLayout } = await import('@codeview/graph-engine');

  const analysis = await analyzeProject(projectDir);
  const fileCount = analysis.files.length;
  const errorCount = analysis.errors.length;

  console.log(`  \x1b[32m✓\x1b[0m Found ${fileCount} files${errorCount > 0 ? ` (${errorCount} errors)` : ''}`);

  if (fileCount === 0) {
    console.error('\n  \x1b[31mNo TypeScript/JavaScript files found.\x1b[0m');
    console.error('  Make sure you\'re in a project directory with .ts, .tsx, .js, or .jsx files.');
    process.exit(1);
  }

  // Phase 2: Build graph
  console.log('  \x1b[33m◌\x1b[0m Building architecture graph...');
  const graph = buildGraph(analysis);
  console.log(`  \x1b[32m✓\x1b[0m ${graph.nodes.length} components, ${graph.edges.length} connections, ${graph.clusters.length} layers`);

  // Phase 3: Compute layout
  console.log('  \x1b[33m◌\x1b[0m Computing layout...');
  const layout = await computeLayout(graph);
  console.log(`  \x1b[32m✓\x1b[0m Layout computed`);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n  \x1b[2mAnalysis completed in ${elapsed}s\x1b[0m\n`);

  // Phase 4: Write analysis data for the web app to consume
  const dataDir = join(projectDir, '.codeview');
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(join(dataDir, 'analysis.json'), JSON.stringify({ graph, layout: { nodes: Object.fromEntries(layout.nodes), groups: Object.fromEntries(layout.groups) } }, null, 2));
  console.log(`  \x1b[2mData written to .codeview/analysis.json\x1b[0m`);

  // Phase 5: Start the web server
  console.log(`\n  \x1b[33m◌\x1b[0m Starting web server on port ${port}...`);

  // Find the web app directory (relative to this CLI package)
  const cliDir = new URL('.', import.meta.url).pathname;
  const webDir = resolve(cliDir, '../../web');

  if (!existsSync(webDir)) {
    console.log(`  \x1b[33m⚠\x1b[0m Web app not found at expected location.`);
    console.log(`  \x1b[2mRun 'pnpm dev' from the monorepo root to start the dev server.\x1b[0m`);
    console.log(`  \x1b[2mThen open http://localhost:4200\x1b[0m`);
    process.exit(0);
  }

  const serverProcess = spawn('npx', ['next', 'dev', '--port', port], {
    cwd: webDir,
    stdio: 'pipe',
    env: { ...process.env, CODEVIEW_PROJECT_DIR: projectDir },
  });

  serverProcess.stdout.on('data', async (data) => {
    const output = data.toString();
    if (output.includes('Ready')) {
      const url = `http://localhost:${port}`;
      console.log(`  \x1b[32m✓\x1b[0m Ready at \x1b[1m\x1b[36m${url}\x1b[0m\n`);

      if (!flags.noOpen) {
        const open = (await import('open')).default;
        open(url);
      }
    }
  });

  serverProcess.stderr.on('data', (data) => {
    // Only show actual errors, not Next.js compilation messages
    const msg = data.toString();
    if (msg.includes('Error') || msg.includes('error')) {
      process.stderr.write(msg);
    }
  });

  // Clean shutdown
  process.on('SIGINT', () => {
    console.log('\n  \x1b[2mShutting down...\x1b[0m');
    serverProcess.kill();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    serverProcess.kill();
    process.exit(0);
  });

} catch (err) {
  console.error(`\n  \x1b[31mError:\x1b[0m ${err.message}`);
  process.exit(1);
}
