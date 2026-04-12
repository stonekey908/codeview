import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

export async function GET() {
  // Look for analysis data from the CLI
  const projectDir = process.env.CODEVIEW_PROJECT_DIR || process.cwd();

  // Try multiple locations
  const candidates = [
    path.join(projectDir, '.codeview', 'analysis.json'),
    path.join(process.cwd(), '.codeview', 'analysis.json'),
    // Walk up from web app to monorepo root
    path.join(process.cwd(), '..', '..', '.codeview', 'analysis.json'),
  ];

  for (const filePath of candidates) {
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      return NextResponse.json(data);
    }
  }

  return NextResponse.json({ graph: null, layout: null }, { status: 404 });
}
