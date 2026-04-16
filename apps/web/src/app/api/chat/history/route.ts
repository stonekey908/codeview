import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

function getHistoryPath(): string {
  const projectDir = process.env.CODEVIEW_PROJECT_DIR || process.cwd();
  const dir = path.join(projectDir, '.codeview');
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'chat-history.json');
}

// GET — load saved chat history for the active project
export async function GET() {
  const historyPath = getHistoryPath();
  try {
    if (fs.existsSync(historyPath)) {
      const raw = fs.readFileSync(historyPath, 'utf-8').trim();
      if (raw.length > 1) {
        const data = JSON.parse(raw);
        return NextResponse.json({ messages: Array.isArray(data.messages) ? data.messages : [] });
      }
    }
  } catch (err) {
    console.error('[chat-history] Read error:', err);
  }
  return NextResponse.json({ messages: [] });
}

// POST — save current chat history for the active project
export async function POST(request: NextRequest) {
  const body = await request.json();
  const historyPath = getHistoryPath();
  try {
    fs.writeFileSync(historyPath, JSON.stringify({
      messages: Array.isArray(body.messages) ? body.messages : [],
      updatedAt: new Date().toISOString(),
    }, null, 2));
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to save' }, { status: 500 });
  }
}

// DELETE — clear chat history for the active project
export async function DELETE() {
  const historyPath = getHistoryPath();
  try {
    if (fs.existsSync(historyPath)) fs.unlinkSync(historyPath);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to clear' }, { status: 500 });
  }
}
