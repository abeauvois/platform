import { describe, expect, test } from 'bun:test';
import { LeboncoinStrategy, extractCategoryFromH1, stripHtmlStylesAndTags } from '../scraping-strategies/LeboncoinStrategy';
import {
  leboncoinListingWithStyleHtml,
  leboncoinPageContext,
  leboncoinRealEstateListingHtml,
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

  test('should preserve data attributes but remove class attributes', () => {
    const htmlWithDataAttr = '<div data-test-id="adcard-jobs" class="some-class"><p data-qa-id="title" class="text-bold">Content</p></div>';
    const result = stripHtmlStylesAndTags(htmlWithDataAttr);

    expect(result).toContain('data-test-id="adcard-jobs"');
    expect(result).toContain('data-qa-id="title"');
    expect(result).not.toContain('class=');
    expect(result).not.toContain('some-class');
    expect(result).not.toContain('text-bold');
  });

  test('should remove all class attributes', () => {
    const htmlWithClasses = '<div class="flex items-center"><p class="text-lg font-bold">Content</p></div>';
    const result = stripHtmlStylesAndTags(htmlWithClasses);

    expect(result).not.toContain('class=');
    expect(result).not.toContain('flex');
    expect(result).not.toContain('text-lg');
    expect(result).toContain('<p>Content</p>');
  });

  test('should remove h3 elements', () => {
    const htmlWithH3 = '<div><h3>Title</h3><p>Content</p></div>';
    const result = stripHtmlStylesAndTags(htmlWithH3);

    expect(result).not.toContain('<h3>');
    expect(result).not.toContain('</h3>');
    expect(result).not.toContain('Title');
    expect(result).toContain('<p>Content</p>');
  });

  test('should handle fixture HTML with style tag', () => {
    const result = stripHtmlStylesAndTags(leboncoinListingWithStyleHtml);

    expect(result).not.toContain('<style>');
    expect(result).not.toContain('.test-style');
    expect(result).not.toContain('style="color: blue;"');
    expect(result).toContain('data-test-id="adcard-title"');
  });

  test('should remove SVG elements from HTML', () => {
    const htmlWithSvg = '<div><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2L2 7"/></svg><p>Content</p></div>';
    const result = stripHtmlStylesAndTags(htmlWithSvg);

    expect(result).not.toContain('<svg');
    expect(result).not.toContain('</svg>');
    expect(result).not.toContain('viewBox');
    expect(result).not.toContain('<path');
    expect(result).toContain('<p>Content</p>');
  });

  test('should remove multiple SVG elements', () => {
    const htmlWithMultipleSvg = '<div><svg><circle/></svg><span>Text</span><svg><rect/></svg></div>';
    const result = stripHtmlStylesAndTags(htmlWithMultipleSvg);

    expect(result).not.toContain('<svg');
    expect(result).not.toContain('</svg>');
    expect(result).toContain('<span>Text</span>');
  });

  test('should remove nested SVG content', () => {
    const htmlWithNestedSvg = '<div><svg><g><path d="M0 0"/><circle cx="10" cy="10" r="5"/></g></svg><p>Preserved</p></div>';
    const result = stripHtmlStylesAndTags(htmlWithNestedSvg);

    expect(result).not.toContain('<svg');
    expect(result).not.toContain('<g>');
    expect(result).not.toContain('<path');
    expect(result).not.toContain('<circle');
    expect(result).toContain('<p>Preserved</p>');
  });

  test('should remove pro store logo images', () => {
    const htmlWithProLogo = '<div><img data-test-id="pro-store-logo" src="logo.png" alt="Pro"/><p>Content</p></div>';
    const result = stripHtmlStylesAndTags(htmlWithProLogo);

    expect(result).not.toContain('pro-store-logo');
    expect(result).not.toContain('logo.png');
    expect(result).toContain('<p>Content</p>');
  });

  test('should remove self-closing pro store logo images', () => {
    const htmlWithProLogo = '<div><img data-test-id="pro-store-logo" src="logo.png"/><span>Text</span></div>';
    const result = stripHtmlStylesAndTags(htmlWithProLogo);

    expect(result).not.toContain('pro-store-logo');
    expect(result).toContain('<span>Text</span>');
  });

  test('should remove save ad button with data-qa-id="listitem_save_ad"', () => {
    const htmlWithSaveButton = '<div><button data-qa-id="listitem_save_ad"><svg data-title="SvgHeartOutline"></svg></button><p>Content</p></div>';
    const result = stripHtmlStylesAndTags(htmlWithSaveButton);

    expect(result).not.toContain('listitem_save_ad');
    expect(result).not.toContain('SvgHeartOutline');
    expect(result).toContain('<p>Content</p>');
  });

  test('should remove all unwanted elements from real estate listing fixture', () => {
    const result = stripHtmlStylesAndTags(leboncoinRealEstateListingHtml);

    // Should remove save ad button
    expect(result).not.toContain('listitem_save_ad');
    expect(result).not.toContain('adcard_favorite_button');

    // Should remove all SVGs
    expect(result).not.toContain('<svg');
    expect(result).not.toContain('</svg>');
    expect(result).not.toContain('SvgHeartOutline');
    expect(result).not.toContain('ArrowVerticalLeft');
    expect(result).not.toContain('ArrowVerticalRight');
    expect(result).not.toContain('SvgLastFloorCriteria');
    expect(result).not.toContain('SvgCaveCriteria');

    // Should remove pro store logo
    expect(result).not.toContain('pro-store-logo');

    // Should remove h3 elements
    expect(result).not.toContain('<h3>');
    expect(result).not.toContain('</h3>');

    // Should remove class attributes
    expect(result).not.toContain('class=');

    // Should preserve content (price and location are in p tags)
    expect(result).toContain('725 000 €');
    expect(result).toContain('Paris 75002');
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
