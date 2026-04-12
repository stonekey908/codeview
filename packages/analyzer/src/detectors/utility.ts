import type { FrameworkDetection } from '@codeview/shared';
import type { ParseResult } from '../parser';

const UTIL_DIRS = ['/utils/', '/util/', '/helpers/', '/helper/', '/lib/', '/shared/'];
const CONFIG_PATTERNS = [/config\.(ts|js)$/, /\.config\.(ts|js)$/, /\/config\//];
const SERVICE_DIRS = ['/services/', '/service/', '/clients/', '/client/'];

export function detectUtility(
  _filePath: string,
  relativePath: string,
  parseResult: ParseResult
): FrameworkDetection | null {
  const normPath = '/' + relativePath.replace(/\\/g, '/');

  // Config files
  if (CONFIG_PATTERNS.some((p) => p.test(normPath))) {
    return {
      role: 'config',
      layer: 'utils',
      confidence: 0.7,
      framework: 'unknown',
    };
  }

  // External service clients
  if (SERVICE_DIRS.some((dir) => normPath.includes(dir))) {
    return {
      role: 'service',
      layer: 'external',
      confidence: 0.7,
      framework: 'unknown',
    };
  }

  // Utility directories
  if (UTIL_DIRS.some((dir) => normPath.includes(dir))) {
    return {
      role: 'utility',
      layer: 'utils',
      confidence: 0.6,
      framework: 'unknown',
    };
  }

  // Fallback: if file only exports functions/constants (no JSX, no default component),
  // it's likely a utility
  const hasOnlyNamedExports =
    parseResult.exports.length > 0 &&
    parseResult.exports.every((e) => !e.isDefault);

  if (hasOnlyNamedExports && !relativePath.match(/\.(tsx|jsx)$/)) {
    return {
      role: 'utility',
      layer: 'utils',
      confidence: 0.3,
      framework: 'unknown',
    };
  }

  return null;
}
