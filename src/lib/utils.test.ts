import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn utility', () => {
  it('combines className strings correctly', () => {
    expect(cn('flex', 'items-center')).toBe('flex items-center');
  });

  it('merges tailwind conflicts correctly', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
  });

  it('handles conditional classes and falsy values', () => {
    expect(cn('btn', false && 'hidden', null, undefined, 'active')).toBe('btn active');
  });
});
