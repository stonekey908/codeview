import * as path from 'path';
import type { AnalysisResult, FileEntry } from '@codeview/shared';
import { scanFiles } from './scanner';
import { parseFile } from './parser';
import { detectFramework } from './detectors';

export async function analyzeProject(rootDir: string): Promise<AnalysisResult> {
  const absoluteRoot = path.resolve(rootDir);
  const filePaths = scanFiles(absoluteRoot);

  const files: FileEntry[] = [];
  const errors: { filePath: string; message: string }[] = [];

  for (const filePath of filePaths) {
    try {
      const parseResult = parseFile(filePath);
      const relativePath = path.relative(absoluteRoot, filePath);
      const framework = detectFramework(filePath, relativePath, parseResult);

      files.push({
        filePath,
        relativePath,
        imports: parseResult.imports,
        exports: parseResult.exports,
        framework: framework
          ? { role: framework.role, confidence: framework.confidence, framework: framework.framework }
          : null,
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
