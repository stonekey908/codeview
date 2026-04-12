import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

export async function GET(request: NextRequest) {
  const filePath = request.nextUrl.searchParams.get('path');
  if (!filePath) {
    return NextResponse.json({ error: 'Missing path parameter' }, { status: 400 });
  }

  const projectDir = process.env.CODEVIEW_PROJECT_DIR || process.cwd();

  // Try the path as-is first, then relative to project dir
  const candidates = [
    filePath,
    path.join(projectDir, filePath),
    path.resolve(filePath),
  ];

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        const content = fs.readFileSync(candidate, 'utf-8');
        return NextResponse.json({ content, path: candidate });
      }
    } catch {
      continue;
    }
  }

  return NextResponse.json({ error: 'File not found', tried: candidates }, { status: 404 });
}
