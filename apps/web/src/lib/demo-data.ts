/**
 * Resolves paths for .codeview data files.
 * Falls back to bundled demo-data/ when no real project data exists.
 */
import * as fs from 'fs';
import * as path from 'path';

const DEMO_DIR = path.resolve(process.cwd(), '../../demo-data');
// Also check relative to the web app (for when cwd is apps/web)
const DEMO_DIR_ALT = path.resolve(process.cwd(), 'demo-data');

function getDemoDir(): string {
  if (fs.existsSync(DEMO_DIR)) return DEMO_DIR;
  if (fs.existsSync(DEMO_DIR_ALT)) return DEMO_DIR_ALT;
  return DEMO_DIR;
}

export function getProjectDir(): string {
  return process.env.CODEVIEW_PROJECT_DIR || process.cwd();
}

/** Read a JSON file from .codeview/, falling back to demo-data/ */
export function readDataFile<T>(filename: string, fallback: T): T {
  const projectDir = getProjectDir();
  const realPath = path.join(projectDir, '.codeview', filename);

  // Try real project data first
  try {
    if (fs.existsSync(realPath)) {
      const raw = fs.readFileSync(realPath, 'utf-8').trim();
      if (raw && raw.length > 2) return JSON.parse(raw);
    }
  } catch {}

  // Fall back to demo data
  const demoDir = getDemoDir();
  const demoPath = path.join(demoDir, filename);
  try {
    if (fs.existsSync(demoPath)) {
      return JSON.parse(fs.readFileSync(demoPath, 'utf-8'));
    }
  } catch {}

  return fallback;
}

/** Check if we're running with a real project (not just demo) */
export function hasRealProject(): boolean {
  const projectDir = getProjectDir();
  return fs.existsSync(path.join(projectDir, '.codeview', 'analysis.json'));
}
