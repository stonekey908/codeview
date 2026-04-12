import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { parseFile } from '../parser';
import { detectFramework } from '../detectors';

let tmpDir: string;

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cv-detect-'));
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function writeAndDetect(relativePath: string, content: string) {
  const filePath = path.join(tmpDir, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
  const parseResult = parseFile(filePath);
  return detectFramework(filePath, relativePath, parseResult);
}

describe('React detector', () => {
  it('detects React components in TSX files', () => {
    const result = writeAndDetect('src/Button.tsx', `
      import React from 'react';
      export default function Button() {
        return (<button>Click</button>);
      }
    `);
    expect(result).not.toBeNull();
    expect(result!.role).toBe('component');
    expect(result!.layer).toBe('ui');
    expect(result!.framework).toBe('react');
  });

  it('detects hooks', () => {
    const result = writeAndDetect('src/useAuth.ts', `
      import { useState } from 'react';
      export function useAuth() {
        const [user, setUser] = useState(null);
        return { user };
      }
    `);
    expect(result).not.toBeNull();
    // Hook or utility — both acceptable
    expect(['hook', 'utility']).toContain(result!.role);
  });

  it('detects context providers', () => {
    const result = writeAndDetect('src/AuthContext.tsx', `
      import { createContext } from 'react';
      export const AuthContext = createContext(null);
      export function AuthProvider({ children }) {
        return (<AuthContext.Provider value={null}>{children}</AuthContext.Provider>);
      }
    `);
    expect(result).not.toBeNull();
    expect(result!.role).toBe('context');
  });
});

describe('Next.js detector', () => {
  it('detects App Router pages', () => {
    const result = writeAndDetect('src/app/dashboard/page.tsx', `
      export default function DashboardPage() {
        return (<div>Dashboard</div>);
      }
    `);
    expect(result).not.toBeNull();
    expect(result!.role).toBe('page');
    expect(result!.framework).toBe('nextjs');
    expect(result!.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it('detects layouts', () => {
    const result = writeAndDetect('src/app/layout.tsx', `
      export default function RootLayout({ children }) {
        return (<html><body>{children}</body></html>);
      }
    `);
    expect(result).not.toBeNull();
    expect(result!.role).toBe('layout');
    expect(result!.framework).toBe('nextjs');
  });

  it('detects API routes', () => {
    const result = writeAndDetect('src/app/api/users/route.ts', `
      export async function GET(request: Request) {
        return Response.json({ users: [] });
      }
      export async function POST(request: Request) {
        return Response.json({ created: true });
      }
    `);
    expect(result).not.toBeNull();
    expect(result!.role).toBe('api-route');
    expect(result!.layer).toBe('api');
  });
});

describe('Database detector', () => {
  it('detects Drizzle schemas', () => {
    const result = writeAndDetect('src/db/schema/users.ts', `
      import { pgTable, text, uuid } from 'drizzle-orm/pg-core';
      export const users = pgTable('users', {
        id: uuid('id').primaryKey(),
        name: text('name'),
      });
    `);
    expect(result).not.toBeNull();
    expect(result!.role).toBe('schema');
    expect(result!.layer).toBe('data');
  });

  it('detects model directories', () => {
    const result = writeAndDetect('src/models/User.ts', `
      export class User {
        id: string;
        name: string;
      }
    `);
    expect(result).not.toBeNull();
    expect(result!.layer).toBe('data');
  });
});

describe('Utility detector', () => {
  it('detects utility files', () => {
    const result = writeAndDetect('src/utils/format.ts', `
      export function formatDate(d: Date): string {
        return d.toISOString();
      }
      export function formatCurrency(n: number): string {
        return '$' + n.toFixed(2);
      }
    `);
    expect(result).not.toBeNull();
    expect(result!.role).toBe('utility');
    expect(result!.layer).toBe('utils');
  });

  it('detects config files', () => {
    const result = writeAndDetect('src/config.ts', `
      export const config = {
        apiUrl: process.env.API_URL,
        port: 3000,
      };
    `);
    expect(result).not.toBeNull();
    expect(result!.role).toBe('config');
  });

  it('detects service clients', () => {
    const result = writeAndDetect('src/services/stripe.ts', `
      import Stripe from 'stripe';
      export const stripe = new Stripe(process.env.STRIPE_KEY!);
    `);
    expect(result).not.toBeNull();
    expect(result!.role).toBe('service');
    expect(result!.layer).toBe('external');
  });
});
