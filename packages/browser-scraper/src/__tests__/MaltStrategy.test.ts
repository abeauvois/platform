import { describe, expect, test } from 'bun:test';
import {
  MaltStrategy,
  extractCategoryFromMaltH1,
  stripMaltHtmlStylesAndTags,
} from '../scraping-strategies/MaltStrategy';
import {
  maltFreelancerListingHtml,
  maltFreelancerListingHtml2,
  maltPageContext,
  maltH1Variations,
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

describe('MaltStrategy', () => {
  test('should have name "malt"', () => {
    const strategy = new MaltStrategy();
    expect(strategy.name).toBe('malt');
  });

  test('should have execute method', () => {
    const strategy = new MaltStrategy();
    expect(typeof strategy.execute).toBe('function');
  });

  test('should accept optional logger in constructor', () => {
    const mockLogger = createMockLogger();
    const strategy = new MaltStrategy(mockLogger);
    expect(strategy.name).toBe('malt');
  });

  test('should work without logger (logger is optional)', () => {
    const strategy = new MaltStrategy();
    expect(strategy.name).toBe('malt');
    expect(typeof strategy.execute).toBe('function');
  });
});

describe('MaltStrategy - ScrapedListing interface', () => {
  test('should include externalCategory field in ScrapedListing', () => {
    const listing: ScrapedListing = {
      title: 'Hugo - Développeur Web | React.js | Next.js',
      price: '475 €/jour',
      location: 'Paris',
      description: '<a class="profile-card">HTML content</a>',
      externalCategory: 'developpeur web fullstack react hono',
      url: 'https://www.malt.fr/profile/hugobonifay',
    };

    expect(listing.externalCategory).toBe('developpeur web fullstack react hono');
  });

  test('should include skills in tags field', () => {
    const listing: ScrapedListing = {
      title: 'Hugo - Développeur Web | React.js | Next.js',
      price: '475 €/jour',
      location: 'Paris',
      description: '<a class="profile-card">HTML content</a>',
      externalCategory: 'developpeur web fullstack react hono',
      url: 'https://www.malt.fr/profile/hugobonifay',
      tags: 'Typescript, React.js, Node.js',
    };

    expect(listing.tags).toBe('Typescript, React.js, Node.js');
  });
});

describe('MaltStrategy - HTML stripping', () => {
  test('should remove style tags from HTML', () => {
    const htmlWithStyle = '<div><style>.test { color: red; }</style><p>Content</p></div>';
    const result = stripMaltHtmlStylesAndTags(htmlWithStyle);

    expect(result).not.toContain('<style>');
    expect(result).not.toContain('color: red');
    expect(result).toContain('<p>Content</p>');
  });

  test('should remove inline style attributes from HTML', () => {
    const htmlWithInlineStyle = '<div style="color: blue;"><p style="font-size: 12px;">Content</p></div>';
    const result = stripMaltHtmlStylesAndTags(htmlWithInlineStyle);

    expect(result).not.toContain('style=');
    expect(result).not.toContain('color: blue');
    expect(result).toContain('<p>Content</p>');
  });

  test('should preserve data attributes but remove class attributes', () => {
    const htmlWithDataAttr = '<div data-testid="test-item" class="some-class"><p data-qa-id="title" class="text-bold">Content</p></div>';
    const result = stripMaltHtmlStylesAndTags(htmlWithDataAttr);

    expect(result).toContain('data-testid="test-item"');
    expect(result).toContain('data-qa-id="title"');
    expect(result).not.toContain('class=');
    expect(result).not.toContain('some-class');
    expect(result).not.toContain('text-bold');
  });

  test('should remove all class attributes', () => {
    const htmlWithClasses = '<div class="flex items-center"><p class="text-lg font-bold">Content</p></div>';
    const result = stripMaltHtmlStylesAndTags(htmlWithClasses);

    expect(result).not.toContain('class=');
    expect(result).not.toContain('flex');
    expect(result).not.toContain('text-lg');
    expect(result).toContain('<p>Content</p>');
  });

  test('should remove SVG elements from HTML', () => {
    const htmlWithSvg = '<div><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2L2 7"/></svg><p>Content</p></div>';
    const result = stripMaltHtmlStylesAndTags(htmlWithSvg);

    expect(result).not.toContain('<svg');
    expect(result).not.toContain('</svg>');
    expect(result).not.toContain('viewBox');
    expect(result).not.toContain('<path');
    expect(result).toContain('<p>Content</p>');
  });

  test('should remove favorite buttons', () => {
    const htmlWithFavoriteButton = '<div><button data-testid="profile-card-favorite-btn"><svg></svg></button><p>Content</p></div>';
    const result = stripMaltHtmlStylesAndTags(htmlWithFavoriteButton);

    expect(result).not.toContain('profile-card-favorite-btn');
    expect(result).toContain('<p>Content</p>');
  });

  test('should remove favorite-button-v2 class buttons', () => {
    const htmlWithFavoriteV2 = '<div><button class="favorite-button-v2"><svg></svg></button><p>Content</p></div>';
    const result = stripMaltHtmlStylesAndTags(htmlWithFavoriteV2);

    expect(result).not.toContain('favorite-button-v2');
    expect(result).toContain('<p>Content</p>');
  });

  test('should handle freelancer listing fixture HTML', () => {
    const result = stripMaltHtmlStylesAndTags(maltFreelancerListingHtml);

    // Should remove style tags
    expect(result).not.toContain('<style>');
    expect(result).not.toContain('border-radius: 8px');

    // Should remove SVGs
    expect(result).not.toContain('<svg');
    expect(result).not.toContain('</svg>');

    // Should remove class attributes
    expect(result).not.toContain('class=');

    // Should remove favorite button
    expect(result).not.toContain('profile-card-favorite-btn');

    // Should preserve content (name, price, location)
    expect(result).toContain('Hugo');
    expect(result).toContain('475 €');
    expect(result).toContain('Paris');
  });

  test('should return empty string for empty input', () => {
    expect(stripMaltHtmlStylesAndTags('')).toBe('');
  });

  test('should handle null input gracefully', () => {
    expect(stripMaltHtmlStylesAndTags(null as unknown as string)).toBe('');
  });
});

describe('MaltStrategy - Category extraction', () => {
  test('should extract category from h1 text with standard format', () => {
    const h1Text = maltPageContext.h1Text;
    const category = extractCategoryFromMaltH1(h1Text);

    expect(category).toBe('developpeur web fullstack react hono');
  });

  test.each(maltH1Variations)(
    'should extract "$expected" from "$h1"',
    ({ h1, expected }) => {
      const category = extractCategoryFromMaltH1(h1);
      expect(category).toBe(expected);
    }
  );

  test('should return empty string for unrecognized h1 format', () => {
    const category = extractCategoryFromMaltH1('Some random text');

    expect(category).toBe('');
  });

  test('should handle empty h1 text', () => {
    const category = extractCategoryFromMaltH1('');

    expect(category).toBe('');
  });

  test('should handle null/undefined h1 text gracefully', () => {
    const category = extractCategoryFromMaltH1(null as unknown as string);

    expect(category).toBe('');
  });

  test('should handle h1 with single freelance (no s)', () => {
    const category = extractCategoryFromMaltH1('1 freelance "react" disponible');

    expect(category).toBe('react');
  });

  test('should handle h1 with large numbers', () => {
    const category = extractCategoryFromMaltH1('9999 freelances "senior developer" disponibles');

    expect(category).toBe('senior developer');
  });
});
