import type { FrameworkDetection } from '@codeview/shared';
import type { ParseResult } from '../parser';
import { detectReactComponent } from './react';
import { detectNextjsPage, detectNextjsApiRoute } from './nextjs';
import { detectDatabaseModel } from './database';
import { detectUtility } from './utility';

export type Detector = (
  filePath: string,
  relativePath: string,
  parseResult: ParseResult
) => FrameworkDetection | null;

const detectors: Detector[] = [
  detectNextjsApiRoute,
  detectNextjsPage,
  detectReactComponent,
  detectDatabaseModel,
  detectUtility,
];

export function detectFramework(
  filePath: string,
  relativePath: string,
  parseResult: ParseResult
): FrameworkDetection | null {
  let best: FrameworkDetection | null = null;

  for (const detect of detectors) {
    const result = detect(filePath, relativePath, parseResult);
    if (result && (best === null || result.confidence > best.confidence)) {
      best = result;
    }
  }

  return best;
}
