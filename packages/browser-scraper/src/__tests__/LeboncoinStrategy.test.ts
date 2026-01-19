import { describe, expect, test } from 'bun:test';
import { LeboncoinStrategy, extractCategoryFromH1, stripHtmlStylesAndTags } from '../scraping-strategies/LeboncoinStrategy';
import {
  leboncoinListingWithStyleHtml,
  leboncoinPageContext,
} from './fixtures';
import type { ILogger, ScrapedListing } from '../types';

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
    await: () => ({ start: () => { }, update: () => { }, stop: () => { } }),
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

describe('LeboncoinStrategy - ScrapedListing interface', () => {
  test('should include externalCategory field in ScrapedListing', () => {
    // This test verifies the TypeScript interface includes the new field
    const listing: ScrapedListing = {
      title: 'Test',
      price: '100 €',
      location: 'Paris',
      description: '<article>HTML content</article>',
      externalCategory: 'Emploi',
      url: 'https://example.com',
    };

    expect(listing.externalCategory).toBe('Emploi');
  });
});

describe('LeboncoinStrategy - HTML stripping', () => {
  test('should remove style tags from HTML', () => {
    const htmlWithStyle = '<div><style>.test { color: red; }</style><p>Content</p></div>';
    const result = stripHtmlStylesAndTags(htmlWithStyle);

    expect(result).not.toContain('<style>');
    expect(result).not.toContain('color: red');
    expect(result).toContain('<p>Content</p>');
  });

  test('should remove inline style attributes from HTML', () => {
    const htmlWithInlineStyle = '<div style="color: blue;"><p style="font-size: 12px;">Content</p></div>';
    const result = stripHtmlStylesAndTags(htmlWithInlineStyle);

    expect(result).not.toContain('style=');
    expect(result).not.toContain('color: blue');
    expect(result).toContain('<p>Content</p>');
  });

  test('should preserve data attributes', () => {
    const htmlWithDataAttr = '<div data-test-id="adcard-jobs"><p data-qa-id="title">Content</p></div>';
    const result = stripHtmlStylesAndTags(htmlWithDataAttr);

    expect(result).toContain('data-test-id="adcard-jobs"');
    expect(result).toContain('data-qa-id="title"');
  });

  test('should handle fixture HTML with style tag', () => {
    const result = stripHtmlStylesAndTags(leboncoinListingWithStyleHtml);

    expect(result).not.toContain('<style>');
    expect(result).not.toContain('.test-style');
    expect(result).not.toContain('style="color: blue;"');
    expect(result).toContain('data-test-id="adcard-title"');
  });
});

describe('LeboncoinStrategy - Category extraction', () => {
  test('should extract category from h1 text "Annonces Emploi : Ile-de-France"', () => {
    const h1Text = leboncoinPageContext.h1Text;
    const category = extractCategoryFromH1(h1Text);

    expect(category).toBe('Emploi');
  });

  test('should extract category from h1 text "Annonces Véhicules : Paris"', () => {
    const category = extractCategoryFromH1('Annonces Véhicules : Paris');

    expect(category).toBe('Véhicules');
  });

  test('should extract category from h1 text "Annonces Immobilier : Lyon"', () => {
    const category = extractCategoryFromH1('Annonces Immobilier : Lyon');

    expect(category).toBe('Immobilier');
  });

  test('should return empty string for unrecognized h1 format', () => {
    const category = extractCategoryFromH1('Some random text');

    expect(category).toBe('');
  });

  test('should handle empty h1 text', () => {
    const category = extractCategoryFromH1('');

    expect(category).toBe('');
  });

  test('should handle null/undefined h1 text gracefully', () => {
    const category = extractCategoryFromH1(null as unknown as string);

    expect(category).toBe('');
  });
});
