import * as fs from 'fs';
import type { FrameworkDetection } from '@codeview/shared';
import type { ParseResult } from '../parser';

export function detectReactComponent(
  filePath: string,
  _relativePath: string,
  parseResult: ParseResult
): FrameworkDetection | null {
  if (!filePath.match(/\.(tsx|jsx)$/)) return null;

  const hasDefaultExport = parseResult.exports.some((e) => e.isDefault);
  const hasNamedExport = parseResult.exports.some((e) => !e.isDefault && !e.isTypeOnly);
  if (!hasDefaultExport && !hasNamedExport) return null;

  // Check if file contains JSX by looking for React-related imports or JSX patterns
  const content = fs.readFileSync(filePath, 'utf-8');
  const hasJSX = content.includes('<') && (
    content.includes('return (') ||
    content.includes('return(') ||
    content.includes('=>') ||
    content.includes('render')
  );

  const hasReactImport = parseResult.imports.some(
    (i) => i.source === 'react' || i.source === 'React'
  );

  // Check for hooks pattern (useXxx)
  const hasHooks = /\buse[A-Z]\w+\b/.test(content) && !hasJSX;
  if (hasHooks && !hasJSX) {
    return {
      role: 'hook',
      layer: 'ui',
      confidence: 0.7,
      framework: 'react',
    };
  }

  // Check for context pattern
  const hasCreateContext = content.includes('createContext');
  if (hasCreateContext) {
    return {
      role: 'context',
      layer: 'ui',
      confidence: 0.8,
      framework: 'react',
    };
  }

  // Check for forwardRef / memo wrappers
  const isWrapped = content.includes('forwardRef') || content.includes('memo(');

  if (hasJSX || hasReactImport || isWrapped) {
    return {
      role: 'component',
      layer: 'ui',
      confidence: hasJSX ? 0.9 : 0.6,
      framework: 'react',
    };
  }

  return null;
}
