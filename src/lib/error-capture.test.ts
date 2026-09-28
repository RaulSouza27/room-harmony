import { describe, it, expect } from 'vitest';
import { describeError } from './error-capture';

describe('error-capture utility', () => {
  it('describes standard Error objects with stack/message', () => {
    const error = new Error('Test error message');
    const description = describeError(error);
    expect(description).toContain('Error: Test error message');
  });

  it('handles cause chain in nested errors', () => {
    const rootCause = new Error('Root cause details');
    const mainError = new Error('Main error', { cause: rootCause });

    const description = describeError(mainError);
    expect(description).toContain('Error: Main error');
    expect(description).toContain('caused by: Error: Root cause details');
  });

  it('handles non-Error objects gracefully', () => {
    expect(describeError('String error')).toBe('String error');
    expect(describeError({ status: 500, msg: 'custom' })).toContain('"status":500');
  });
});
