import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

// Write a pending question for Claude to pick up via MCP
export async function POST(request: NextRequest) {
  const { componentPath, question } = await request.json();
  const projectDir = process.env.CODEVIEW_PROJECT_DIR || process.cwd();
  const dir = path.join(projectDir, '.codeview');
  fs.mkdirSync(dir, { recursive: true });

  // Write pending question
  fs.writeFileSync(
    path.join(dir, 'pending-question.json'),
    JSON.stringify({ componentPath, question, timestamp: new Date().toISOString() })
  );

  return NextResponse.json({ status: 'queued', componentPath });
}

// Check for Claude's response
export async function GET() {
  const projectDir = process.env.CODEVIEW_PROJECT_DIR || process.cwd();

  // Check for cached descriptions
  const descPath = path.join(projectDir, '.codeview', 'descriptions.json');
  let descriptions: Record<string, string> = {};
  try {
    if (fs.existsSync(descPath)) {
      descriptions = JSON.parse(fs.readFileSync(descPath, 'utf-8'));
    }
  } catch { /* ignore */ }

  // Check for pending question status
  const pendingPath = path.join(projectDir, '.codeview', 'pending-question.json');
  let pending = null;
  try {
    if (fs.existsSync(pendingPath)) {
      pending = JSON.parse(fs.readFileSync(pendingPath, 'utf-8'));
    }
  } catch { /* ignore */ }

  return NextResponse.json({ descriptions, pending });
}
