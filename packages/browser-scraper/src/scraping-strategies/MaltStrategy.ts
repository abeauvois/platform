import type { Page } from 'puppeteer-core';
import type { ILogger, IScrapeStrategy, PaginationOptions, ScrapedListing } from '../types';

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

export class MaltStrategy implements IScrapeStrategy<Array<ScrapedListing>> {
  public readonly name = 'malt';

  constructor(private readonly logger?: ILogger) {}

  async execute(page: Page, options?: PaginationOptions): Promise<Array<ScrapedListing>> {
    const maxPages = options?.maxPages ?? 1;
    const delayBetweenPages = options?.delayBetweenPages ?? 500;

    // Handle cookie consent popup if present
    await this.dismissCookieConsent(page);

    const allListings: Array<ScrapedListing> = [];
    const baseUrl = page.url();

    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      this.logger?.info(`Scraping page ${pageNum} of ${maxPages}`);

      // Navigate to the page (skip for first page - already there)
      if (pageNum > 1) {
        // Add delay between pages to avoid detection
        this.logger?.debug(`Waiting ${delayBetweenPages}ms before next page`);
        await this.delay(delayBetweenPages);

        // Build URL with page parameter
        const pageUrl = this.buildPageUrl(baseUrl, pageNum);
        await page.goto(pageUrl, { waitUntil: 'networkidle2' });
      }

      // Wait for listings to load
      try {
        await page.waitForSelector('a.profile-card[href*="/profile/"], a[href*="/profile/"]', { timeout: 10000 });
      } catch {
        // No listings found on this page - we've reached the end
        this.logger?.info(`No more listings found on page ${pageNum}, stopping pagination`);
        break;
      }

      // Extract category from page h1 (once per page)
      const externalCategory = await this.extractCategoryFromPage(page);

      // Extract all listing cards from this page
      const pageListings = await this.extractListingsFromPage(page, externalCategory);

      if (pageListings.length === 0) {
        // No more listings - stop pagination
        this.logger?.info(`No listings extracted from page ${pageNum}, stopping pagination`);
        break;
      }

      this.logger?.info(`Extracted ${pageListings.length} listings from page ${pageNum}`);
      allListings.push(...pageListings);
    }

    this.logger?.info(`Total listings scraped: ${allListings.length}`);
    return allListings;
  }

  private buildPageUrl(baseUrl: string, pageNum: number): string {
    const url = new URL(baseUrl);
    url.searchParams.set('page', String(pageNum));
    return url.toString();
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async dismissCookieConsent(page: Page): Promise<void> {
    try {
      // Wait briefly for the consent dialog to appear
      await this.delay(1000);

      // Try to find and click the accept button
      const clicked = await page.evaluate(() => {
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

      if (clicked) {
        // Wait for the dialog to close
        await this.delay(500);
        this.logger?.debug('Cookie consent dismissed');
      }
    } catch (error) {
      // Cookie consent already dismissed or not present - continue
      this.logger?.debug(`Cookie consent handling: ${error instanceof Error ? error.message : 'skipped'}`);
    }
  }

  private async extractCategoryFromPage(page: Page): Promise<string> {
    try {
      const h1Text = await page.$eval('h1', (el) => el.textContent ?? '').catch(() => '');
      return extractCategoryFromMaltH1(h1Text);
    } catch {
      return '';
    }
  }

  private async extractListingsFromPage(page: Page, externalCategory: string): Promise<Array<ScrapedListing>> {
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

        // Extract skills list and join them (store in postedAt field)
        const skills = await listing.evaluate((el) => {
          const skillElements = el.querySelectorAll('.profile-skills li .joy-tag, ul.profile-skills li');
          return Array.from(skillElements)
            .map(s => s.textContent?.trim())
            .filter(Boolean)
            .join(', ');
        }).catch(() => '');

        scrapedListings.push({
          title: title.trim(),
          price: price.trim(),
          location: location.trim(),
          description: rawHtml,
          externalCategory,
          url,
          imageUrl,
          postedAt: skills || undefined,
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
