import { NextRequest, NextResponse } from 'next/server';
import { codeToHtml } from 'shiki';

export async function POST(request: NextRequest) {
  const { code, lang } = await request.json();

  if (!code) {
    return NextResponse.json({ error: 'No code provided' }, { status: 400 });
  }

  // Detect language from extension or default to tsx
  const language = lang || 'tsx';

  try {
    const html = await codeToHtml(code, {
      lang: language,
      theme: 'github-dark',
    });

    return NextResponse.json({ html });
  } catch (err) {
    // Fallback: return unhighlighted
    return NextResponse.json({
      html: `<pre style="margin:0"><code>${escapeHtml(code)}</code></pre>`,
    });
  }
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
