import * as fs from 'fs';
import type { FrameworkDetection } from '@codeview/shared';
import type { ParseResult } from '../parser';

const CONFIG_PATTERNS = [/config\.(ts|js|mjs)$/, /\.config\.(ts|js|mjs)$/, /\/config\//];
const SERVICE_DIRS = ['/services/', '/service/', '/clients/', '/client/'];
const DATA_DIRS = ['/data/', '/fixtures/', '/seeds/', '/mock/'];
const UTIL_DIRS = ['/utils/', '/util/', '/helpers/', '/helper/', '/shared/'];

// Known external service SDKs
const EXTERNAL_IMPORTS = [
  'stripe', 'sendgrid', '@sendgrid', 'twilio', 'aws-sdk', '@aws-sdk',
  'firebase', '@firebase', 'supabase', '@supabase',
  '@google/generative-ai', '@google-ai', 'openai', 'anthropic',
  'redis', 'ioredis', 'nodemailer', 'axios',
];

// Known type/interface patterns
const TYPE_PATTERNS = ['/types.ts', '/types/', '/interfaces/', '.d.ts'];

export function detectUtility(
  filePath: string,
  relativePath: string,
  parseResult: ParseResult
): FrameworkDetection | null {
  const normPath = '/' + relativePath.replace(/\\/g, '/');

  // Config files
  if (CONFIG_PATTERNS.some((p) => p.test(normPath))) {
    return { role: 'config', layer: 'utils', confidence: 0.7, framework: 'unknown' };
  }

  // Type definition files
  if (TYPE_PATTERNS.some((p) => normPath.includes(p))) {
    return { role: 'schema', layer: 'data', confidence: 0.6, framework: 'unknown' };
  }

  // Check imports for external service SDKs
  const hasExternalImport = parseResult.imports.some((imp) =>
    EXTERNAL_IMPORTS.some((sdk) => imp.source === sdk || imp.source.startsWith(sdk + '/'))
  );

  // External service clients — by directory
  if (SERVICE_DIRS.some((dir) => normPath.includes(dir))) {
    return { role: 'service', layer: 'external', confidence: 0.7, framework: 'unknown' };
  }

  // External service clients — by import (e.g., lib/gemini.ts imports @google/generative-ai)
  if (hasExternalImport) {
    return { role: 'service', layer: 'external', confidence: 0.75, framework: 'unknown' };
  }

  // Static data files — exports arrays/objects of data
  if (DATA_DIRS.some((dir) => normPath.includes(dir))) {
    return { role: 'model', layer: 'data', confidence: 0.7, framework: 'unknown' };
  }

  // Detect static data by content: files that primarily export large arrays/objects
  if (normPath.includes('/lib/') || normPath.includes('/src/')) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      // Files with large exported arrays are likely data
      const hasLargeExport = (
        (content.match(/export\s+(const|let)\s+\w+\s*[=:]\s*\[/g)?.length ?? 0) > 0 &&
        content.length > 2000
      );
      if (hasLargeExport) {
        return { role: 'model', layer: 'data', confidence: 0.6, framework: 'unknown' };
      }
    } catch { /* skip */ }
  }

  // Utility directories
  if (UTIL_DIRS.some((dir) => normPath.includes(dir))) {
    return { role: 'utility', layer: 'utils', confidence: 0.6, framework: 'unknown' };
  }

  // /lib/ files that aren't data or external — utility
  if (normPath.includes('/lib/')) {
    return { role: 'utility', layer: 'utils', confidence: 0.4, framework: 'unknown' };
  }

  // Fallback: files with only named exports (no JSX)
  const hasOnlyNamedExports =
    parseResult.exports.length > 0 &&
    parseResult.exports.every((e) => !e.isDefault);

  if (hasOnlyNamedExports && !relativePath.match(/\.(tsx|jsx)$/)) {
    return { role: 'utility', layer: 'utils', confidence: 0.3, framework: 'unknown' };
  }

  return null;
}
