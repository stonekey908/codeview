import * as path from 'path';
import type { ComponentRole, ArchitecturalLayer } from '@codeview/shared';

const LAYER_DESCRIPTIONS: Record<ArchitecturalLayer, string> = {
  ui: 'What users see and interact with — screens, buttons, and forms',
  api: 'Behind-the-scenes handlers that process requests',
  data: 'Database structure — what information is stored and how',
  utils: 'Shared helper tools used across the app',
  external: 'Third-party services the app connects to',
};

const ROLE_TEMPLATES: Record<ComponentRole, string> = {
  page: 'A screen in the app',
  component: 'A reusable piece of the interface',
  layout: 'The shared frame around pages',
  'api-route': 'Handles requests from the app',
  middleware: 'Checks requests before they reach handlers',
  model: 'Defines how data is stored',
  schema: 'Defines the database table structure',
  utility: 'A helper function used by other parts',
  hook: 'Shared logic for components',
  context: 'Shares data across the component tree',
  service: 'Connects to an external service',
  config: 'App configuration and settings',
  unknown: 'Part of the codebase',
};

export function humanLabel(relativePath: string): string {
  const baseName = path.basename(relativePath, path.extname(relativePath));

  // Remove common suffixes
  const cleaned = baseName
    .replace(/\.(test|spec|stories|styles|module)$/i, '')
    .replace(/\.d$/, '');

  return toTitleCase(cleaned);
}

export function humanDescription(
  relativePath: string,
  role: ComponentRole,
  _layer: ArchitecturalLayer
): string {
  const label = humanLabel(relativePath);
  const template = ROLE_TEMPLATES[role] || ROLE_TEMPLATES.unknown;
  return `${template}: ${label}`;
}

export function layerDescription(layer: ArchitecturalLayer): string {
  return LAYER_DESCRIPTIONS[layer];
}

function toTitleCase(str: string): string {
  // Handle PascalCase: "LoginPage" → "Login Page"
  let result = str.replace(/([a-z])([A-Z])/g, '$1 $2');
  // Handle kebab-case: "login-page" → "Login Page"
  result = result.replace(/[-_]/g, ' ');
  // Handle camelCase first word
  result = result.replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
  // Capitalize first letter of each word
  return result
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
