import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { parseFile } from '../parser';

let tmpDir: string;

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cv-parser-'));
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function writeTemp(name: string, content: string): string {
  const filePath = path.join(tmpDir, name);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
  return filePath;
}

describe('parseFile', () => {
  it('extracts static imports', () => {
    const fp = writeTemp('static.ts', `
      import { useState, useEffect } from 'react';
      import path from 'path';
      import * as fs from 'fs';
    `);
    const result = parseFile(fp);
    expect(result.imports).toHaveLength(3);
    expect(result.imports[0]).toMatchObject({
      source: 'react',
      specifiers: ['useState', 'useEffect'],
      isTypeOnly: false,
      isDynamic: false,
    });
    expect(result.imports[1]).toMatchObject({ source: 'path', specifiers: ['path'] });
    expect(result.imports[2]).toMatchObject({ source: 'fs', specifiers: ['fs'] });
  });

  it('extracts type-only imports', () => {
    const fp = writeTemp('types.ts', `
      import type { FC } from 'react';
    `);
    const result = parseFile(fp);
    expect(result.imports).toHaveLength(1);
    expect(result.imports[0].isTypeOnly).toBe(true);
  });

  it('extracts dynamic imports', () => {
    const fp = writeTemp('dynamic.ts', `
      const mod = await import('./heavy-module');
    `);
    const result = parseFile(fp);
    const dynImport = result.imports.find((i) => i.isDynamic);
    expect(dynImport).toBeDefined();
    expect(dynImport!.source).toBe('./heavy-module');
  });

  it('extracts require calls', () => {
    const fp = writeTemp('require.ts', `
      const express = require('express');
    `);
    const result = parseFile(fp);
    expect(result.imports).toHaveLength(1);
    expect(result.imports[0]).toMatchObject({
      source: 'express',
      specifiers: ['express'],
    });
  });

  it('extracts named exports', () => {
    const fp = writeTemp('named.ts', `
      export function greet() {}
      export const MAX = 100;
      export class UserService {}
    `);
    const result = parseFile(fp);
    expect(result.exports).toHaveLength(3);
    expect(result.exports.map((e) => e.name)).toEqual(['greet', 'MAX', 'UserService']);
    expect(result.exports.every((e) => !e.isDefault)).toBe(true);
  });

  it('extracts default export', () => {
    const fp = writeTemp('default.ts', `
      export default function main() {}
    `);
    const result = parseFile(fp);
    expect(result.exports.some((e) => e.isDefault)).toBe(true);
  });

  it('extracts re-exports', () => {
    const fp = writeTemp('barrel.ts', `
      export { foo, bar } from './utils';
      export * from './helpers';
    `);
    const result = parseFile(fp);
    expect(result.exports).toHaveLength(2);
    expect(result.exports[0].name).toBe('foo');
    // Re-exports also create imports
    expect(result.imports.some((i) => i.source === './utils')).toBe(true);
    expect(result.imports.some((i) => i.source === './helpers')).toBe(true);
  });

  it('handles parse errors gracefully', () => {
    const fp = writeTemp('broken.ts', '{{{{invalid syntax!!!');
    // Should not throw
    const result = parseFile(fp);
    // TypeScript parser is lenient — it parses what it can
    expect(result).toBeDefined();
  });

  it('handles TSX files', () => {
    const fp = writeTemp('comp.tsx', `
      import React from 'react';
      export default function Button() {
        return <button>Click me</button>;
      }
    `);
    const result = parseFile(fp);
    expect(result.imports).toHaveLength(1);
    expect(result.exports.some((e) => e.isDefault)).toBe(true);
  });
});
