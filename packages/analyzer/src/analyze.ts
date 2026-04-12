import type { AnalysisResult } from '@codeview/shared';

export async function analyzeProject(rootDir: string): Promise<AnalysisResult> {
  // TODO: Implement in STO-1646
  return {
    rootDir,
    files: [],
    errors: [],
  };
}
