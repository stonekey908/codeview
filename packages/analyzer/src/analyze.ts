import * as path from 'path';
import type { AnalysisResult, FileEntry } from '@codeview/shared';
import { scanFiles } from './scanner';
import { parseFile } from './parser';

export async function analyzeProject(rootDir: string): Promise<AnalysisResult> {
  const absoluteRoot = path.resolve(rootDir);
  const filePaths = scanFiles(absoluteRoot);

  const files: FileEntry[] = [];
  const errors: { filePath: string; message: string }[] = [];

  for (const filePath of filePaths) {
    try {
      const { imports, exports } = parseFile(filePath);
      files.push({
        filePath,
        relativePath: path.relative(absoluteRoot, filePath),
        imports,
        exports,
        framework: null, // Populated by framework detectors (STO-1647)
      });
    } catch (err) {
      errors.push({
        filePath,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { rootDir: absoluteRoot, files, errors };
}
