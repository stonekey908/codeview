import type { FrameworkDetection } from '@codeview/shared';
import type { ParseResult } from '../parser';

const PAGE_DIRS = ['/app/', '/pages/', '/src/app/', '/src/pages/'];
const API_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

export function detectNextjsPage(
  filePath: string,
  relativePath: string,
  parseResult: ParseResult
): FrameworkDetection | null {
  const normPath = '/' + relativePath.replace(/\\/g, '/');

  // Check if file is in a page directory
  const isInPageDir = PAGE_DIRS.some((dir) => normPath.includes(dir));
  if (!isInPageDir) return null;

  const fileName = normPath.split('/').pop() || '';

  // Layout files
  if (fileName.match(/^layout\.(tsx?|jsx?)$/)) {
    return {
      role: 'layout',
      layer: 'ui',
      confidence: 0.95,
      framework: 'nextjs',
    };
  }

  // Page files (App Router)
  if (fileName.match(/^page\.(tsx?|jsx?)$/)) {
    return {
      role: 'page',
      layer: 'ui',
      confidence: 0.95,
      framework: 'nextjs',
    };
  }

  // Loading/error/not-found
  if (fileName.match(/^(loading|error|not-found)\.(tsx?|jsx?)$/)) {
    return {
      role: 'component',
      layer: 'ui',
      confidence: 0.9,
      framework: 'nextjs',
    };
  }

  // Pages Router (default export in /pages/)
  if (normPath.includes('/pages/') && parseResult.exports.some((e) => e.isDefault)) {
    return {
      role: 'page',
      layer: 'ui',
      confidence: 0.8,
      framework: 'nextjs',
    };
  }

  return null;
}

export function detectNextjsApiRoute(
  _filePath: string,
  relativePath: string,
  parseResult: ParseResult
): FrameworkDetection | null {
  const normPath = '/' + relativePath.replace(/\\/g, '/');

  // App Router API route: app/**/route.ts
  if (normPath.match(/\/route\.(ts|js)$/)) {
    const hasApiExport = parseResult.exports.some((e) =>
      API_METHODS.includes(e.name)
    );
    if (hasApiExport) {
      return {
        role: 'api-route',
        layer: 'api',
        confidence: 0.95,
        framework: 'nextjs',
      };
    }
  }

  // Pages Router API: pages/api/**
  if (normPath.includes('/pages/api/') || normPath.includes('/src/pages/api/')) {
    if (parseResult.exports.some((e) => e.isDefault)) {
      return {
        role: 'api-route',
        layer: 'api',
        confidence: 0.9,
        framework: 'nextjs',
      };
    }
  }

  // Middleware
  if (normPath.match(/\/middleware\.(ts|js)$/)) {
    return {
      role: 'middleware',
      layer: 'api',
      confidence: 0.9,
      framework: 'nextjs',
    };
  }

  return null;
}
