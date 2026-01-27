import type { Page } from 'puppeteer-core';
import type { ILogger, ScrapedListing } from '../types';
import { BasePaginatedStrategy } from './BasePaginatedStrategy';

/**
 * Strip styling and unwanted elements from Malt HTML, keeping only content and structure.
 * Removes: style tags, SVGs, favorite buttons, inline styles, and class attributes.
 */
export function stripMaltHtmlStylesAndTags(html: string): string {
  if (!html) return '';

  // Remove <style>...</style> tags and their contents
  let result = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

  // Remove favorite buttons (by data-testid)
  result = result.replace(/<button[^>]*data-testid="profile-card-favorite-btn"[^>]*>[\s\S]*?<\/button>/gi, '');

  // Remove favorite buttons (by class favorite-button-v2)
  result = result.replace(/<button[^>]*class="[^"]*favorite-button-v2[^"]*"[^>]*>[\s\S]*?<\/button>/gi, '');

  // Remove <svg>...</svg> elements and their contents
  result = result.replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, '');

  // Remove inline style attributes (style="...")
  result = result.replace(/\s*style="[^"]*"/gi, '');

  // Remove class attributes (class="...")
  result = result.replace(/\s*class="[^"]*"/gi, '');

  return result;
}

/**
 * Extract category (search query) from Malt h1 text
 * Expected format: "{N} freelances "{search query}" disponibles" or "{N} freelance "{search query}" disponible"
 */
export function extractCategoryFromMaltH1(h1Text: string): string {
  if (!h1Text) return '';

  // Match "{N} freelances "{query}" disponibles" or "{N} freelance "{query}" disponible" pattern
  const match = h1Text.match(/^\d+\s+freelances?\s+"([^"]+)"\s+disponibles?/i);
  if (match && match[1]) {
    return match[1].trim();
  }

  return '';
}

export class MaltStrategy extends BasePaginatedStrategy {
  public readonly name = 'malt';
  protected readonly listingSelector = 'a.profile-card[href*="/profile/"], a[href*="/profile/"]';

  constructor(logger?: ILogger) {
    super(logger);
  }

  protected async dismissCookieConsentInPage(page: Page): Promise<boolean> {
    return page.evaluate(() => {
      // Look for common cookie consent button patterns on Malt
      const buttons = Array.from(document.querySelectorAll('button'));

      // Try to find "Accept all" or "Accepter tout" button
      const acceptButton = buttons.find(btn =>
        btn.textContent?.includes('Accepter') ||
        btn.textContent?.includes('Accept all') ||
        btn.textContent?.includes('Tout accepter')
      );

      if (acceptButton) {
        acceptButton.click();
        return true;
      }

      // Fallback: look for specific cookie consent dialog buttons
      const consentButton = document.querySelector('[data-testid="cookie-consent-accept"], #onetrust-accept-btn-handler') as HTMLButtonElement;
      if (consentButton) {
        consentButton.click();
        return true;
      }

      return false;
    });
  }

  protected parseCategoryFromH1(h1Text: string): string {
    return extractCategoryFromMaltH1(h1Text);
  }

  protected async extractListingsFromPage(page: Page, externalCategory: string): Promise<Array<ScrapedListing>> {
    const listings = await page.$$('a.profile-card[href*="/profile/"], a[href*="/profile/"]');
    const scrapedListings: Array<ScrapedListing> = [];

    for (const listing of listings) {
      try {
        // Extract name from .profile-name
        const name = await listing.$eval(
          '.profile-name',
          (el) => el.textContent ?? ''
        ).catch(() => '');

        // Extract headline/title from h2.profile-headline or h2
        let headline = await listing.$eval(
          'h2.profile-headline',
          (el) => el.textContent ?? ''
        ).catch(() => '');

        if (!headline) {
          headline = await listing.$eval(
            'h2',
            (el) => el.textContent ?? ''
          ).catch(() => '');
        }

        // Combine name and headline for title
        const title = name && headline ? `${name.trim()} - ${headline.trim()}` : (headline.trim() || name.trim());

        // Extract daily rate from .profile-card-price__label strong
        let priceText = await listing.$eval(
          '.profile-card-price__label strong',
          (el) => el.textContent ?? ''
        ).catch(() => '');

        if (!priceText) {
          priceText = await listing.$eval(
            'strong',
            (el) => el.textContent ?? ''
          ).catch(() => '');
        }

        // Format price as "X €/jour"
        const price = priceText ? `${priceText.trim()}/jour` : '';

        // Extract location from .profile-location__text
        const location = await listing.$eval(
          '.profile-location__text',
          (el) => el.textContent ?? ''
        ).catch(() => '');

        // Extract raw HTML of the listing item (with unwanted elements stripped)
        const rawHtml = await listing.evaluate((element) => {
          // Clone to avoid modifying the DOM
          const clone = element.cloneNode(true) as HTMLElement;
          // Remove style tags
          clone.querySelectorAll('style').forEach(s => s.remove());
          // Remove favorite buttons
          clone.querySelectorAll('[data-testid="profile-card-favorite-btn"]').forEach(s => s.remove());
          clone.querySelectorAll('.favorite-button-v2').forEach(s => s.remove());
          // Remove all SVG elements (icons, etc.)
          clone.querySelectorAll('svg').forEach(s => s.remove());
          // Remove inline styles
          clone.querySelectorAll('[style]').forEach(el => el.removeAttribute('style'));
          // Remove all class attributes (no styling info needed)
          clone.querySelectorAll('[class]').forEach(el => el.removeAttribute('class'));
          clone.removeAttribute('class');
          return clone.outerHTML;
        }).catch(() => '');

        // Extract URL from the profile link href
        const relativeUrl = await listing.evaluate((el) => el.getAttribute('href') ?? '').catch(() => '');

        let url = '';
        if (relativeUrl) {
          // Remove query parameters from profile URL
          const profilePath = relativeUrl.split('?')[0];
          url = profilePath.startsWith('http')
            ? profilePath
            : `https://www.malt.fr${profilePath}`;
        }

        // Extract image URL from img[alt="photo"]
        let imageUrl = await listing.$eval(
          'img[alt="photo"]',
          (el) => el.getAttribute('src') ?? undefined
        ).catch(() => undefined);

        if (!imageUrl) {
          imageUrl = await listing.$eval(
            'img',
            (el) => el.getAttribute('src') ?? undefined
          ).catch(() => undefined);
        }

        // Extract skills list and join them
        const skills = await listing.evaluate((el) => {
          // Use only .joy-tag to avoid duplicates (li and span both match otherwise)
          let skillElements = el.querySelectorAll('.profile-skills .joy-tag');
          if (skillElements.length === 0) {
            // Fallback: try li elements directly
            skillElements = el.querySelectorAll('.profile-skills li');
          }
          // Use Set to deduplicate in case of any remaining duplicates
          const uniqueSkills = new Set(
            Array.from(skillElements)
              .map(s => s.textContent?.trim())
              .filter(Boolean) as Array<string>
          );
          return Array.from(uniqueSkills).join(', ');
        }).catch(() => '');

        scrapedListings.push({
          title: title.trim(),
          price: price.trim(),
          location: location.trim(),
          description: rawHtml,
          externalCategory,
          url,
          imageUrl,
          tags: skills || undefined,
        });
      } catch (error) {
        // Skip listings that fail to parse
        this.logger?.warning(`Failed to parse listing: ${error instanceof Error ? error.message : 'Unknown error'}`);
        continue;
      }
    }

    return scrapedListings;
  }
}
