import { describe, it, expect } from 'vitest';
import { humanLabel, humanDescription, layerDescription } from '../labeler';

describe('humanLabel', () => {
  it('converts PascalCase to spaced', () => {
    expect(humanLabel('src/LoginPage.tsx')).toBe('Login Page');
  });

  it('converts kebab-case to spaced', () => {
    expect(humanLabel('src/login-page.tsx')).toBe('Login Page');
  });

  it('converts camelCase to spaced', () => {
    expect(humanLabel('src/userProfile.ts')).toBe('User Profile');
  });

  it('converts snake_case to spaced', () => {
    expect(humanLabel('src/user_profile.ts')).toBe('User Profile');
  });

  it('handles simple names', () => {
    expect(humanLabel('src/index.ts')).toBe('Index');
  });

  it('strips file extensions', () => {
    expect(humanLabel('src/Button.tsx')).toBe('Button');
  });

  it('handles deeply nested paths', () => {
    expect(humanLabel('src/features/auth/LoginForm.tsx')).toBe('Login Form');
  });
});

describe('humanDescription', () => {
  it('creates page descriptions', () => {
    const desc = humanDescription('src/app/page.tsx', 'page', 'ui');
    expect(desc).toContain('screen');
    expect(desc).toContain('Page');
  });

  it('creates utility descriptions', () => {
    const desc = humanDescription('src/utils/format.ts', 'utility', 'utils', [], ['formatDate', 'formatCurrency']);
    expect(desc).toContain('formatDate');
  });
});

describe('layerDescription', () => {
  it('returns descriptions for all layers', () => {
    expect(layerDescription('ui')).toContain('users');
    expect(layerDescription('api')).toContain('handlers');
    expect(layerDescription('data')).toContain('Database');
    expect(layerDescription('utils')).toContain('helper');
    expect(layerDescription('external')).toContain('Third-party');
  });
});
