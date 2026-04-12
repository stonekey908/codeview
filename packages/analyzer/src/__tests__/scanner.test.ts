import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { scanFiles } from '../scanner';

let tmpDir: string;

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cv-scanner-'));
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function writeTemp(name: string, content = ''): void {
  const filePath = path.join(tmpDir, name);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

describe('scanFiles', () => {
  it('finds TypeScript files', () => {
    writeTemp('src/app.ts');
    writeTemp('src/page.tsx');
    writeTemp('src/util.js');
    writeTemp('src/hook.jsx');
    const files = scanFiles(tmpDir);
    expect(files.length).toBeGreaterThanOrEqual(4);
  });

  it('ignores node_modules', () => {
    writeTemp('node_modules/pkg/index.ts');
    const files = scanFiles(tmpDir);
    const nmFiles = files.filter((f) => f.includes('node_modules'));
    expect(nmFiles).toHaveLength(0);
  });

  it('ignores .git directory', () => {
    writeTemp('.git/objects/abc.ts');
    const files = scanFiles(tmpDir);
    const gitFiles = files.filter((f) => f.includes('.git'));
    expect(gitFiles).toHaveLength(0);
  });

  it('respects .gitignore patterns', () => {
    writeTemp('.gitignore', 'dist/\n*.generated.ts\n');
    writeTemp('dist/bundle.ts');
    writeTemp('src/auto.generated.ts');
    const files = scanFiles(tmpDir);
    expect(files.filter((f) => f.includes('dist/'))).toHaveLength(0);
    expect(files.filter((f) => f.includes('.generated.'))).toHaveLength(0);
  });

  it('ignores non-TS/JS files', () => {
    writeTemp('readme.md');
    writeTemp('styles.css');
    writeTemp('data.json');
    const files = scanFiles(tmpDir);
    const nonTs = files.filter(
      (f) => !f.match(/\.(ts|tsx|js|jsx|mts|mjs)$/)
    );
    expect(nonTs).toHaveLength(0);
  });
});
