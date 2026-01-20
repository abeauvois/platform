import { describe, expect, test } from 'bun:test';
import {
  AutoScout24Strategy,
  extractCategoryFromAutoScout24H1,
  stripAutoScout24HtmlStylesAndTags,
} from '../scraping-strategies/AutoScout24Strategy';
import {
  autoscout24DealerListingHtml,
  autoscout24PrivateListingHtml,
  autoscout24PageContext,
  autoscout24H1Variations,
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

describe('AutoScout24Strategy', () => {
  test('should have name "autoscout24"', () => {
    const strategy = new AutoScout24Strategy();
    expect(strategy.name).toBe('autoscout24');
  });

  test('should have execute method', () => {
    const strategy = new AutoScout24Strategy();
    expect(typeof strategy.execute).toBe('function');
  });

  test('should accept optional logger in constructor', () => {
    const mockLogger = createMockLogger();
    const strategy = new AutoScout24Strategy(mockLogger);
    expect(strategy.name).toBe('autoscout24');
  });

  test('should work without logger (logger is optional)', () => {
    const strategy = new AutoScout24Strategy();
    expect(strategy.name).toBe('autoscout24');
    expect(typeof strategy.execute).toBe('function');
  });
});

describe('AutoScout24Strategy - ScrapedListing interface', () => {
  test('should include externalCategory field in ScrapedListing', () => {
    const listing: ScrapedListing = {
      title: 'Ferrari Roma',
      price: '289 900 €',
      location: 'Paris',
      description: '<article>HTML content</article>',
      externalCategory: 'Ferrari Roma',
      url: 'https://www.autoscout24.fr/voiture/ferrari-roma/test',
    };

    expect(listing.externalCategory).toBe('Ferrari Roma');
  });
});

describe('AutoScout24Strategy - HTML stripping', () => {
  test('should remove style tags from HTML', () => {
    const htmlWithStyle = '<div><style>.test { color: red; }</style><p>Content</p></div>';
    const result = stripAutoScout24HtmlStylesAndTags(htmlWithStyle);

    expect(result).not.toContain('<style>');
    expect(result).not.toContain('color: red');
    expect(result).toContain('<p>Content</p>');
  });

  test('should remove inline style attributes from HTML', () => {
    const htmlWithInlineStyle = '<div style="color: blue;"><p style="font-size: 12px;">Content</p></div>';
    const result = stripAutoScout24HtmlStylesAndTags(htmlWithInlineStyle);

    expect(result).not.toContain('style=');
    expect(result).not.toContain('color: blue');
    expect(result).toContain('<p>Content</p>');
  });

  test('should preserve data attributes but remove class attributes', () => {
    const htmlWithDataAttr = '<div data-testid="test-item" class="some-class"><p data-qa-id="title" class="text-bold">Content</p></div>';
    const result = stripAutoScout24HtmlStylesAndTags(htmlWithDataAttr);

    expect(result).toContain('data-testid="test-item"');
    expect(result).toContain('data-qa-id="title"');
    expect(result).not.toContain('class=');
    expect(result).not.toContain('some-class');
    expect(result).not.toContain('text-bold');
  });

  test('should remove all class attributes', () => {
    const htmlWithClasses = '<div class="flex items-center"><p class="text-lg font-bold">Content</p></div>';
    const result = stripAutoScout24HtmlStylesAndTags(htmlWithClasses);

    expect(result).not.toContain('class=');
    expect(result).not.toContain('flex');
    expect(result).not.toContain('text-lg');
    expect(result).toContain('<p>Content</p>');
  });

  test('should remove h2 elements (title)', () => {
    const htmlWithH2 = '<div><h2>Title</h2><p>Content</p></div>';
    const result = stripAutoScout24HtmlStylesAndTags(htmlWithH2);

    expect(result).not.toContain('<h2>');
    expect(result).not.toContain('</h2>');
    expect(result).not.toContain('Title');
    expect(result).toContain('<p>Content</p>');
  });

  test('should remove SVG elements from HTML', () => {
    const htmlWithSvg = '<div><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2L2 7"/></svg><p>Content</p></div>';
    const result = stripAutoScout24HtmlStylesAndTags(htmlWithSvg);

    expect(result).not.toContain('<svg');
    expect(result).not.toContain('</svg>');
    expect(result).not.toContain('viewBox');
    expect(result).not.toContain('<path');
    expect(result).toContain('<p>Content</p>');
  });

  test('should remove watchlist/save buttons', () => {
    const htmlWithWatchlistButton = '<div><button data-testid="watchlist-add-button"><svg></svg></button><p>Content</p></div>';
    const result = stripAutoScout24HtmlStylesAndTags(htmlWithWatchlistButton);

    expect(result).not.toContain('watchlist-add-button');
    expect(result).toContain('<p>Content</p>');
  });

  test('should handle dealer listing fixture HTML', () => {
    const result = stripAutoScout24HtmlStylesAndTags(autoscout24DealerListingHtml);

    // Should remove style tags
    expect(result).not.toContain('<style>');
    expect(result).not.toContain('font-size: 16px');

    // Should remove SVGs
    expect(result).not.toContain('<svg');
    expect(result).not.toContain('</svg>');

    // Should remove h2 elements
    expect(result).not.toContain('<h2');
    expect(result).not.toContain('</h2>');

    // Should remove class attributes
    expect(result).not.toContain('class=');

    // Should remove watchlist button
    expect(result).not.toContain('watchlist-add-button');

    // Should preserve content (price and specs)
    expect(result).toContain('289 900 €');
    expect(result).toContain('FR-75008 Paris');
  });
});

describe('AutoScout24Strategy - Category extraction', () => {
  test('should extract category from h1 text "50 offres pour Ferrari Roma"', () => {
    const h1Text = autoscout24PageContext.h1Text;
    const category = extractCategoryFromAutoScout24H1(h1Text);

    expect(category).toBe('Ferrari Roma');
  });

  test.each(autoscout24H1Variations)(
    'should extract "$expected" from "$h1"',
    ({ h1, expected }) => {
      const category = extractCategoryFromAutoScout24H1(h1);
      expect(category).toBe(expected);
    }
  );

  test('should return empty string for unrecognized h1 format', () => {
    const category = extractCategoryFromAutoScout24H1('Some random text');

    expect(category).toBe('');
  });

  test('should handle empty h1 text', () => {
    const category = extractCategoryFromAutoScout24H1('');

    expect(category).toBe('');
  });

  test('should handle null/undefined h1 text gracefully', () => {
    const category = extractCategoryFromAutoScout24H1(null as unknown as string);

    expect(category).toBe('');
  });
});
