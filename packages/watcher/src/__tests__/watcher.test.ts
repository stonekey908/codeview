import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { createWatcher, type FileChangeEvent } from '../watcher';

let tmpDir: string;

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cv-watcher-'));
  // Create initial structure
  fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
  fs.writeFileSync(path.join(tmpDir, 'src', 'app.ts'), 'export const x = 1;');
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('createWatcher', () => {
  it('detects new TypeScript files', async () => {
    const events: FileChangeEvent[] = [];
    const handle = createWatcher({
      rootDir: tmpDir,
      onChanges: (e) => events.push(...e),
      debounceMs: 100,
    });

    // Wait for watcher to initialize
    await sleep(200);

    // Create a new file
    fs.writeFileSync(path.join(tmpDir, 'src', 'new.ts'), 'export const y = 2;');

    // Wait for debounce
    await sleep(500);

    await handle.close();

    const addEvents = events.filter((e) => e.type === 'add');
    expect(addEvents.length).toBeGreaterThanOrEqual(1);
    expect(addEvents.some((e) => e.relativePath.includes('new.ts'))).toBe(true);
  });

  it('detects file changes', async () => {
    const events: FileChangeEvent[] = [];
    const handle = createWatcher({
      rootDir: tmpDir,
      onChanges: (e) => events.push(...e),
      debounceMs: 100,
    });

    await sleep(200);

    // Modify existing file
    fs.writeFileSync(path.join(tmpDir, 'src', 'app.ts'), 'export const x = 2; // changed');

    await sleep(500);
    await handle.close();

    const changeEvents = events.filter((e) => e.type === 'change');
    expect(changeEvents.length).toBeGreaterThanOrEqual(1);
  });

  it('detects file deletions', async () => {
    // Create a file to delete
    fs.writeFileSync(path.join(tmpDir, 'src', 'temp.ts'), 'export const temp = 1;');
    await sleep(100);

    const events: FileChangeEvent[] = [];
    const handle = createWatcher({
      rootDir: tmpDir,
      onChanges: (e) => events.push(...e),
      debounceMs: 100,
    });

    await sleep(200);
    fs.unlinkSync(path.join(tmpDir, 'src', 'temp.ts'));

    await sleep(500);
    await handle.close();

    const unlinkEvents = events.filter((e) => e.type === 'unlink');
    expect(unlinkEvents.length).toBeGreaterThanOrEqual(1);
  });

  it('ignores non-TS/JS files', async () => {
    const events: FileChangeEvent[] = [];
    const handle = createWatcher({
      rootDir: tmpDir,
      onChanges: (e) => events.push(...e),
      debounceMs: 100,
    });

    await sleep(200);
    fs.writeFileSync(path.join(tmpDir, 'src', 'readme.md'), '# Hello');
    fs.writeFileSync(path.join(tmpDir, 'src', 'styles.css'), 'body {}');

    await sleep(500);
    await handle.close();

    const tsEvents = events.filter((e) =>
      e.relativePath.endsWith('.md') || e.relativePath.endsWith('.css')
    );
    expect(tsEvents).toHaveLength(0);
  });

  it('batches rapid changes via debouncing', async () => {
    let batchCount = 0;
    const handle = createWatcher({
      rootDir: tmpDir,
      onChanges: () => { batchCount++; },
      debounceMs: 200,
    });

    await sleep(200);

    // Rapid writes — should batch into fewer callbacks
    for (let i = 0; i < 5; i++) {
      fs.writeFileSync(path.join(tmpDir, 'src', `rapid${i}.ts`), `export const r${i} = ${i};`);
      await sleep(20);
    }

    await sleep(500);
    await handle.close();

    // Should be batched into 1-2 callbacks, not 5
    expect(batchCount).toBeLessThanOrEqual(2);
  });
});

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
