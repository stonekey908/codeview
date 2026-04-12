import * as fs from 'fs';
import type { FrameworkDetection } from '@codeview/shared';
import type { ParseResult } from '../parser';

export function detectDatabaseModel(
  filePath: string,
  relativePath: string,
  _parseResult: ParseResult
): FrameworkDetection | null {
  const normPath = '/' + relativePath.replace(/\\/g, '/');

  // Prisma schema
  if (filePath.endsWith('.prisma')) {
    return {
      role: 'schema',
      layer: 'data',
      confidence: 0.95,
      framework: 'prisma',
    };
  }

  // Drizzle schemas (common patterns)
  if (normPath.includes('/schema') || normPath.includes('/drizzle/')) {
    const content = fs.readFileSync(filePath, 'utf-8');
    if (
      content.includes('pgTable') ||
      content.includes('sqliteTable') ||
      content.includes('mysqlTable')
    ) {
      return {
        role: 'schema',
        layer: 'data',
        confidence: 0.9,
        framework: 'drizzle',
      };
    }
  }

  // TypeORM entities
  if (normPath.includes('/entities/') || normPath.includes('/entity/')) {
    const content = fs.readFileSync(filePath, 'utf-8');
    if (content.includes('@Entity') || content.includes('@Column')) {
      return {
        role: 'model',
        layer: 'data',
        confidence: 0.9,
        framework: 'typeorm',
      };
    }
  }

  // Generic model directory
  if (normPath.includes('/models/') || normPath.includes('/model/')) {
    return {
      role: 'model',
      layer: 'data',
      confidence: 0.5,
      framework: 'unknown',
    };
  }

  return null;
}
