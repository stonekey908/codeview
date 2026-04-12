import * as path from 'path';
import type { ComponentRole, ArchitecturalLayer } from '@codeview/shared';

const LAYER_DESCRIPTIONS: Record<ArchitecturalLayer, string> = {
  ui: 'What users see and interact with — screens, buttons, and forms',
  api: 'Behind-the-scenes handlers that process requests',
  data: 'Database structure — what information is stored and how',
  utils: 'Shared helper tools used across the app',
  external: 'Third-party services the app connects to',
};

export function humanLabel(relativePath: string): string {
  const baseName = path.basename(relativePath, path.extname(relativePath));

  // For route files (route.ts, page.tsx, layout.tsx), use the parent directory name
  if (['route', 'page', 'layout', 'index'].includes(baseName.toLowerCase())) {
    const parts = relativePath.replace(/\\/g, '/').split('/');
    const skip = new Set(['src', 'app', 'pages', 'api']);
    // Walk backwards to find a meaningful parent dir
    for (let i = parts.length - 2; i >= 0; i--) {
      if (!skip.has(parts[i]) && parts[i].length > 1 && !parts[i].startsWith('[')) {
        const dirLabel = toTitleCase(parts[i]);
        if (baseName === 'route') return `${dirLabel} API`;
        if (baseName === 'page') return `${dirLabel} Page`;
        if (baseName === 'layout') return `${dirLabel} Layout`;
        return dirLabel;
      }
    }
  }

  const cleaned = baseName
    .replace(/\.(test|spec|stories|styles|module)$/i, '')
    .replace(/\.d$/, '');
  return toTitleCase(cleaned);
}

export function humanDescription(
  relativePath: string,
  role: ComponentRole,
  layer: ArchitecturalLayer,
  importSources: string[] = [],
  exportNames: string[] = []
): string {
  const label = humanLabel(relativePath);
  const dirContext = extractDirContext(relativePath);

  // Build a contextual description based on what we actually know
  switch (role) {
    case 'page':
      return `The ${label} screen${dirContext ? ` in the ${dirContext} section` : ''} — this is what users see when they navigate here`;
    case 'layout':
      return `Wraps ${dirContext ? `the ${dirContext} pages` : 'pages'} with shared navigation, headers, and structure`;
    case 'component':
      return `A reusable UI element: ${label}${dirContext ? ` (used in ${dirContext})` : ''}`;
    case 'api-route': {
      const methods = exportNames.filter(n => ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(n));
      const methodStr = methods.length > 0 ? methods.join('/') : 'API';
      return `${methodStr} endpoint${dirContext ? ` for ${dirContext}` : ''} — handles requests from the frontend`;
    }
    case 'middleware':
      return `Runs before requests reach the API — checks authentication, permissions, or transforms data`;
    case 'model':
      return `Stores ${label.toLowerCase()} records in the database — defines what fields each ${label.toLowerCase()} has`;
    case 'schema':
      return `Database table definition for ${label.toLowerCase()} — columns, types, and relationships`;
    case 'utility': {
      const fns = exportNames.filter(n => n !== 'default' && n.length > 2).slice(0, 3);
      if (fns.length > 0) {
        return `Provides ${fns.map(f => camelToPhrase(f)).join(', ')}${exportNames.length > 3 ? ' and more' : ''}`;
      }
      return `Shared helper used${dirContext ? ` by ${dirContext}` : ' across the app'}`;
    }
    case 'hook': {
      const hookName = label.replace(/^Use\s?/i, '').toLowerCase();
      return hookName
        ? `Detects or manages ${hookName} state for components that need it`
        : `Reusable logic that components can plug into`;
    }
    case 'context':
      return `Shares ${label.replace(/Context|Provider/gi, '').trim().toLowerCase() || 'data'} across the entire app without passing it through every component`;
    case 'service': {
      const serviceName = label.replace(/Client|Service|Api/gi, '').trim();
      return `Connects to ${serviceName || 'an external service'}${importSources.some(s => s.includes('stripe')) ? ' for payment processing' : importSources.some(s => s.includes('sendgrid') || s.includes('mail')) ? ' for sending emails' : ''}`;
    }
    case 'config':
      return `Configuration and settings${dirContext ? ` for ${dirContext}` : ' for the app'} — environment variables, feature flags, constants`;
    default:
      return `Part of the ${dirContext || layer} layer`;
  }
}

export function layerDescription(layer: ArchitecturalLayer): string {
  return LAYER_DESCRIPTIONS[layer];
}

function extractDirContext(relativePath: string): string {
  const parts = relativePath.replace(/\\/g, '/').split('/');
  // Find the most meaningful directory name (skip src, app, pages, api, etc.)
  const skip = new Set(['src', 'app', 'pages', 'api', 'lib', 'utils', 'components', 'services', 'db', 'models']);
  const meaningful = parts.slice(0, -1).filter(p => !skip.has(p) && p.length > 1);
  return meaningful.length > 0 ? toTitleCase(meaningful[meaningful.length - 1]) : '';
}

function camelToPhrase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]/g, ' ')
    .toLowerCase();
}

function toTitleCase(str: string): string {
  let result = str.replace(/([a-z])([A-Z])/g, '$1 $2');
  result = result.replace(/[-_]/g, ' ');
  result = result.replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
  return result
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
