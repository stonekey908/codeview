import { watch, type FSWatcher } from 'chokidar';
import * as fs from 'fs';
import * as path from 'path';
import ignore, { type Ignore } from 'ignore';

const TS_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mts', '.mjs']);
const ALWAYS_IGNORE = ['node_modules/**', '.git/**', '.next/**', 'dist/**', '.turbo/**', 'coverage/**', '.codeview/**'];
const DEBOUNCE_MS = 300;

export type FileChangeType = 'add' | 'change' | 'unlink';

export interface FileChangeEvent {
  type: FileChangeType;
  filePath: string;
  relativePath: string;
}

export interface WatcherOptions {
  rootDir: string;
  onChanges: (events: FileChangeEvent[]) => void;
  debounceMs?: number;
}

export interface WatcherHandle {
  close: () => Promise<void>;
}

export function createWatcher(options: WatcherOptions): WatcherHandle {
  const { rootDir, onChanges, debounceMs = DEBOUNCE_MS } = options;
  const absoluteRoot = path.resolve(rootDir);
  const ig = loadGitignore(absoluteRoot);

  let pendingEvents: FileChangeEvent[] = [];
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const flush = () => {
    if (pendingEvents.length > 0) {
      const batch = [...pendingEvents];
      pendingEvents = [];
      onChanges(batch);
    }
  };

  const enqueue = (type: FileChangeType, filePath: string) => {
    const ext = path.extname(filePath);
    if (!TS_EXTENSIONS.has(ext)) return;

    const relativePath = path.relative(absoluteRoot, filePath);
    if (ig.ignores(relativePath)) return;

    pendingEvents.push({ type, filePath, relativePath });

    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(flush, debounceMs);
  };

  const watcher: FSWatcher = watch(absoluteRoot, {
    ignored: ALWAYS_IGNORE.map((p) => path.join(absoluteRoot, p)),
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 50 },
  });

  watcher
    .on('add', (fp) => enqueue('add', fp))
    .on('change', (fp) => enqueue('change', fp))
    .on('unlink', (fp) => enqueue('unlink', fp));

  return {
    close: async () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      flush();
      await watcher.close();
    },
  };
}

function loadGitignore(rootDir: string): Ignore {
  const ig = ignore();
  ig.add(ALWAYS_IGNORE);
  const gitignorePath = path.join(rootDir, '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    ig.add(fs.readFileSync(gitignorePath, 'utf-8'));
  }
  return ig;
}
