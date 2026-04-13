import * as fs from 'fs';
import type { FrameworkDetection } from '@codeview/shared';
import type { ParseResult } from '../parser';

const CONFIG_PATTERNS = [/config\.(ts|js|mjs)$/, /\.config\.(ts|js|mjs)$/, /\/config\//];
const SERVICE_DIRS = ['/services/', '/service/', '/clients/', '/client/'];
const DATA_DIRS = ['/data/', '/fixtures/', '/seeds/', '/mock/'];
const CONSTANT_DIRS = ['/constants/', '/config/', '/static/'];
const UTIL_DIRS = ['/utils/', '/util/', '/helpers/', '/helper/', '/shared/'];
const CLOUD_FUNCTION_DIRS = ['/functions/', '/cloud-functions/', '/serverless/'];
const HOOK_DIRS = ['/hooks/'];

// Known external service SDKs
const EXTERNAL_IMPORTS = [
  'stripe', 'sendgrid', '@sendgrid', 'twilio', 'aws-sdk', '@aws-sdk',
  'firebase', '@firebase', 'firebase-admin', 'firebase-functions',
  'supabase', '@supabase',
  '@google/generative-ai', '@google-ai', 'openai', 'anthropic',
  'redis', 'ioredis', 'nodemailer', 'axios',
  '@react-native-firebase', 'expo-notifications',
];

// Known type/interface patterns
const TYPE_PATTERNS = ['/types.ts', '/types/', '/interfaces/', '.d.ts', '/types/index.ts'];

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

  // Cloud functions — these are backend/external, not utilities
  if (CLOUD_FUNCTION_DIRS.some((dir) => normPath.includes(dir))) {
    // Check if it's the index (entry point) or a specific function
    const hasExternalImport = parseResult.imports.some((imp) =>
      EXTERNAL_IMPORTS.some((sdk) => imp.source === sdk || imp.source.startsWith(sdk + '/'))
    );
    if (hasExternalImport || normPath.includes('/functions/src/')) {
      return { role: 'service', layer: 'external', confidence: 0.8, framework: 'cloud-functions' };
    }
  }

  // Check imports for external service SDKs
  const hasExternalImport = parseResult.imports.some((imp) =>
    EXTERNAL_IMPORTS.some((sdk) => imp.source === sdk || imp.source.startsWith(sdk + '/'))
  );

  // External service clients — by directory
  if (SERVICE_DIRS.some((dir) => normPath.includes(dir))) {
    return { role: 'service', layer: 'external', confidence: 0.7, framework: 'unknown' };
  }

  // External service clients — by import
  if (hasExternalImport) {
    return { role: 'service', layer: 'external', confidence: 0.75, framework: 'unknown' };
  }

  // Constants directories — these are data, not utilities
  if (CONSTANT_DIRS.some((dir) => normPath.includes(dir))) {
    return { role: 'model', layer: 'data', confidence: 0.65, framework: 'unknown' };
  }

  // Static data files — exports arrays/objects of data
  if (DATA_DIRS.some((dir) => normPath.includes(dir))) {
    return { role: 'model', layer: 'data', confidence: 0.7, framework: 'unknown' };
  }

  // Hooks — these are UI layer (React hooks used by components)
  if (HOOK_DIRS.some((dir) => normPath.includes(dir))) {
    return { role: 'hook', layer: 'ui', confidence: 0.6, framework: 'react' };
  }

  // Detect static data by content: files that primarily export large arrays/objects
  if (normPath.includes('/lib/') || normPath.includes('/src/')) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
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

  // Barrel/index files — just re-exports, utility
  if (normPath.endsWith('/index.ts') || normPath.endsWith('/index.tsx')) {
    if (parseResult.exports.length > 0 && parseResult.imports.length > 0) {
      // Check if it's mostly re-exports (barrel file)
      const reExportCount = parseResult.imports.filter(i => i.source.startsWith('.')).length;
      if (reExportCount >= parseResult.exports.length * 0.5) {
        return { role: 'utility', layer: 'utils', confidence: 0.3, framework: 'unknown' };
      }
    }
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
