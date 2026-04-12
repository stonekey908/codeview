export interface ImportInfo {
  source: string;
  specifiers: string[];
  isTypeOnly: boolean;
  isDynamic: boolean;
}

export interface ExportInfo {
  name: string;
  isDefault: boolean;
  isTypeOnly: boolean;
}

export interface FileEntry {
  filePath: string;
  relativePath: string;
  imports: ImportInfo[];
  exports: ExportInfo[];
  framework: FrameworkDetectionResult | null;
}

export interface FrameworkDetectionResult {
  role: string;
  confidence: number;
  framework: string;
}

export interface AnalysisResult {
  rootDir: string;
  files: FileEntry[];
  errors: { filePath: string; message: string }[];
}
