import { describe, test, expect, mock } from 'bun:test';
import { LeboncoinStrategy } from '../scraping-strategies/LeboncoinStrategy';
import type { ILogger } from '../types';

// Create a mock logger
function createMockLogger(): ILogger & { calls: Record<string, Array<string>> } {
  const calls: Record<string, Array<string>> = {
    info: [],
    warning: [],
    error: [],
    debug: [],
  };

  return {
    calls,
    info: (message: string) => { calls.info.push(message); },
    warning: (message: string) => { calls.warning.push(message); },
    error: (message: string) => { calls.error.push(message); },
    debug: (message: string) => { calls.debug.push(message); },
    await: () => ({ start: () => {}, update: () => {}, stop: () => {} }),
  };
}

describe('LeboncoinStrategy', () => {
  test('should have name "leboncoin"', () => {
    const strategy = new LeboncoinStrategy();
    expect(strategy.name).toBe('leboncoin');
  });

  test('should have execute method', () => {
    const strategy = new LeboncoinStrategy();
    expect(typeof strategy.execute).toBe('function');
  });

  test('should accept optional logger in constructor', () => {
    const mockLogger = createMockLogger();
    const strategy = new LeboncoinStrategy(mockLogger);
    expect(strategy.name).toBe('leboncoin');
  });

  test('should work without logger (logger is optional)', () => {
    const strategy = new LeboncoinStrategy();
    expect(strategy.name).toBe('leboncoin');
    expect(typeof strategy.execute).toBe('function');
  });
});
