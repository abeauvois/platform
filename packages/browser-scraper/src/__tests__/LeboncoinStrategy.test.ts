import { describe, test, expect } from 'bun:test';
import { LeboncoinStrategy } from '../scraping-strategies/LeboncoinStrategy';

describe('LeboncoinStrategy', () => {
  test('should have name "leboncoin"', () => {
    const strategy = new LeboncoinStrategy();
    expect(strategy.name).toBe('leboncoin');
  });

  test('should have execute method', () => {
    const strategy = new LeboncoinStrategy();
    expect(typeof strategy.execute).toBe('function');
  });
});
