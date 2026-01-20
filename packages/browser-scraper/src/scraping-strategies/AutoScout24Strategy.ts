import type { Page } from 'puppeteer-core';
import type { ILogger, IScrapeStrategy, PaginationOptions, ScrapedListing } from '../types';

/**
 * Strip styling and unwanted elements from AutoScout24 HTML, keeping only content and structure.
 * Removes: style tags, SVGs, watchlist buttons, h2 tags, inline styles, and class attributes.
 */
export function stripAutoScout24HtmlStylesAndTags(html: string): string {
  if (!html) return '';

  // Remove <style>...</style> tags and their contents
  let result = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

  // Remove watchlist/save buttons
  result = result.replace(/<button[^>]*data-testid="watchlist-add-button"[^>]*>[\s\S]*?<\/button>/gi, '');

  // Remove <svg>...</svg> elements and their contents
  result = result.replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, '');

  // Remove <h2>...</h2> elements (title is already extracted separately)
  result = result.replace(/<h2[^>]*>[\s\S]*?<\/h2>/gi, '');

  // Remove inline style attributes (style="...")
  result = result.replace(/\s*style="[^"]*"/gi, '');

  // Remove class attributes (class="...")
  result = result.replace(/\s*class="[^"]*"/gi, '');

  return result;
}

/**
 * Extract category from AutoScout24 h1 text
 * Expected format: "{N} offres pour {Make Model}" or "{N} offre pour {Make Model}"
 */
export function extractCategoryFromAutoScout24H1(h1Text: string): string {
  if (!h1Text) return '';

  // Match "{N} offres pour {Category}" or "{N} offre pour {Category}" pattern
  // N can be like "50", "1", or "1.234" (with dot thousands separator)
  const match = h1Text.match(/^[\d.]+\s+offres?\s+pour\s+(.+)$/i);
  if (match && match[1]) {
    return match[1].trim();
  }

  return '';
}

export class AutoScout24Strategy implements IScrapeStrategy<Array<ScrapedListing>> {
  public readonly name = 'autoscout24';

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
        await page.waitForSelector('article[data-testid="decluttered-list-item"], article.list-page-item', { timeout: 10000 });
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
        // Look for the AutoScout24 cookie accept button by data-testid
        const acceptButton = document.querySelector('[data-testid="as24-cmp-accept-all-button"]') as HTMLButtonElement;
        if (acceptButton) {
          acceptButton.click();
          return true;
        }

        // Fallback: look for buttons containing "Accepter tout" text
        const buttons = Array.from(document.querySelectorAll('button'));
        const acceptAllButton = buttons.find(btn =>
          btn.textContent?.includes('Accepter tout') || btn.textContent?.includes('Accept all')
        );
        if (acceptAllButton) {
          acceptAllButton.click();
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
      return extractCategoryFromAutoScout24H1(h1Text);
    } catch {
      return '';
    }
  }

  private async extractListingsFromPage(page: Page, externalCategory: string): Promise<Array<ScrapedListing>> {
    const listings = await page.$$('article[data-testid="decluttered-list-item"], article.list-page-item');
    const scrapedListings: Array<ScrapedListing> = [];

    for (const listing of listings) {
      try {
        // Extract title from h2 inside the title link
        let title = await listing.$eval(
          '.ListItemTitle_heading__G2W_N, h2',
          (el) => el.textContent ?? ''
        ).catch(() => '');

        if (!title) {
          // Fallback: get from anchor title attribute
          title = await listing.$eval(
            'a.ListItemTitle_anchor__4TrfR, a[href*="/voiture/"]',
            (el) => el.getAttribute('title') ?? ''
          ).catch(() => '');
        }

        // Extract price
        const price = await listing.$eval(
          '.CurrentPrice_price__Ekflz, [data-price]',
          (el) => el.textContent ?? ''
        ).catch(() => '');

        // Extract location - try dealer address first, then general address
        let location = await listing.$eval(
          '[data-testid="dealer-address"], .ListItemSeller_address__Fqhiu',
          (el) => el.textContent ?? ''
        ).catch(() => '');

        if (!location) {
          // Fallback: look for any element with address info
          location = await listing.evaluate((el) => {
            const addressEl = el.querySelector('.ListItemSeller_address__Fqhiu, [class*="address"]');
            return addressEl?.textContent ?? '';
          }).catch(() => '');
        }

        // Extract raw HTML of the listing item (with unwanted elements stripped)
        const rawHtml = await listing.evaluate((element) => {
          // Clone to avoid modifying the DOM
          const clone = element.cloneNode(true) as HTMLElement;
          // Remove style tags
          clone.querySelectorAll('style').forEach(s => s.remove());
          // Remove watchlist/save buttons
          clone.querySelectorAll('[data-testid="watchlist-add-button"]').forEach(s => s.remove());
          // Remove all SVG elements (icons, etc.)
          clone.querySelectorAll('svg').forEach(s => s.remove());
          // Remove h2 elements (title is already extracted separately)
          clone.querySelectorAll('h2').forEach(s => s.remove());
          // Remove inline styles
          clone.querySelectorAll('[style]').forEach(el => el.removeAttribute('style'));
          // Remove all class attributes (no styling info needed)
          clone.querySelectorAll('[class]').forEach(el => el.removeAttribute('class'));
          return clone.outerHTML;
        }).catch(() => '');

        // Extract URL from the listing link
        const relativeUrl = await listing.$eval(
          'a.ListItemTitle_anchor__4TrfR[href], a[href*="/voiture/"]',
          (el) => el.getAttribute('href') ?? ''
        ).catch(() => '');

        let url = '';
        if (relativeUrl) {
          url = relativeUrl.startsWith('http')
            ? relativeUrl
            : `https://www.autoscout24.fr${relativeUrl}`;
        }

        // Extract image URL
        let imageUrl = await listing.$eval(
          'img[data-testid="decluttered-list-item-image"]',
          (el) => el.getAttribute('src') ?? undefined
        ).catch(() => undefined);

        if (!imageUrl) {
          imageUrl = await listing.$eval(
            'picture img, img[src*="autoscout24"]',
            (el) => el.getAttribute('src') ?? undefined
          ).catch(() => undefined);
        }

        // Extract specs info (e.g., "01/2021", "22 500 km", etc.)
        const specs = await listing.evaluate((el) => {
          const specsContainer = el.querySelector('.ListItemSpecs_container__3M2B5, [class*="Specs"]');
          if (specsContainer) {
            return Array.from(specsContainer.querySelectorAll('span'))
              .map(s => s.textContent?.trim())
              .filter(Boolean)
              .join(' | ');
          }
          return '';
        }).catch(() => '');

        scrapedListings.push({
          title: title.trim(),
          price: price.trim(),
          location: location.trim(),
          description: rawHtml,
          externalCategory,
          url,
          imageUrl,
          postedAt: specs || undefined,
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
