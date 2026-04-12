import * as fs from 'fs';
import * as path from 'path';
import ignore, { type Ignore } from 'ignore';

const TS_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mts', '.mjs']);
const ALWAYS_IGNORE = ['node_modules', '.git', '.next', 'dist', '.turbo', 'coverage'];

export function scanFiles(rootDir: string): string[] {
  const ig = loadGitignore(rootDir);
  const files: string[] = [];
  walk(rootDir, rootDir, ig, files);
  return files;
}

function loadGitignore(rootDir: string): Ignore {
  const ig = ignore();
  ig.add(ALWAYS_IGNORE);
  const gitignorePath = path.join(rootDir, '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    const content = fs.readFileSync(gitignorePath, 'utf-8');
    ig.add(content);
  }
  return ig;
}

function walk(dir: string, rootDir: string, ig: Ignore, files: string[]): void {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(rootDir, fullPath);

    if (ig.ignores(relativePath + (entry.isDirectory() ? '/' : ''))) {
      continue;
    }

    if (entry.isDirectory()) {
      walk(fullPath, rootDir, ig, files);
    } else if (entry.isFile() && TS_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }
}
