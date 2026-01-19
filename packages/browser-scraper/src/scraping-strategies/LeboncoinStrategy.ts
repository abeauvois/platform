import type { Page } from 'puppeteer-core';
import type { ILogger, IScrapeStrategy, PaginationOptions, ScrapedListing } from '../types';

/**
 * Strip styling and unwanted elements from HTML, keeping only content and structure.
 * Removes: style tags, SVGs, save ad buttons, pro store logos, h3 tags, inline styles, and class attributes.
 */
export function stripHtmlStylesAndTags(html: string): string {
  if (!html) return '';

  // Remove <style>...</style> tags and their contents
  let result = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

  // Remove save/favorite ad buttons (contains heart SVG)
  result = result.replace(/<button[^>]*data-qa-id="listitem_save_ad"[^>]*>[\s\S]*?<\/button>/gi, '');

  // Remove <svg>...</svg> elements and their contents
  result = result.replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, '');

  // Remove <h3>...</h3> elements (title is already extracted separately)
  result = result.replace(/<h3[^>]*>[\s\S]*?<\/h3>/gi, '');

  // Remove pro store logo images
  result = result.replace(/<img[^>]*data-test-id="pro-store-logo"[^>]*\/?>/gi, '');

  // Remove inline style attributes (style="...")
  result = result.replace(/\s*style="[^"]*"/gi, '');

  // Remove class attributes (class="...")
  result = result.replace(/\s*class="[^"]*"/gi, '');

  return result;
}

/**
 * Extract category from Leboncoin h1 text
 * Expected format: "Annonces {Category} : {Location}"
 */
export function extractCategoryFromH1(h1Text: string): string {
  if (!h1Text) return '';

  // Match "Annonces {Category} :" pattern
  const match = h1Text.match(/^Annonces\s+([^:]+)\s*:/);
  if (match && match[1]) {
    return match[1].trim();
  }

  return '';
}

export class LeboncoinStrategy implements IScrapeStrategy<Array<ScrapedListing>> {
  public readonly name = 'leboncoin';

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
        await page.waitForSelector('[data-qa-id="aditem_container"]', { timeout: 10000 });
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

      // Try to find and click the accept button using XPath for text matching
      const clicked = await page.evaluate(() => {
        // Look for buttons containing "Accepter" text
        const buttons = Array.from(document.querySelectorAll('button'));
        const acceptButton = buttons.find(btn =>
          btn.textContent.includes('Accepter') && btn.textContent.includes('Fermer')
        );
        if (acceptButton) {
          acceptButton.click();
          return true;
        }

        // Fallback: look for "Continuer sans accepter"
        const continueButton = buttons.find(btn =>
          btn.textContent.includes('Continuer sans accepter')
        );
        if (continueButton) {
          continueButton.click();
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
      return extractCategoryFromH1(h1Text);
    } catch {
      return '';
    }
  }

  private async extractListingsFromPage(page: Page, externalCategory: string): Promise<Array<ScrapedListing>> {
    const listings = await page.$$('[data-qa-id="aditem_container"]');
    const scrapedListings: Array<ScrapedListing> = [];

    for (const listing of listings) {
      try {
        // Extract title - try multiple selectors for different listing types
        // Job listings use data-test-id="adcard-title"
        // Real estate listings have title in aria-label or h3 tag
        let title = await listing.$eval(
          '[data-test-id="adcard-title"]',
          (el) => el.textContent ?? ''
        ).catch(() => '');

        if (!title) {
          // Fallback: get from aria-label attribute on the article
          title = await listing.evaluate((el) => el.getAttribute('aria-label') ?? '').catch(() => '');
        }

        if (!title) {
          // Fallback: get from h3 tag
          title = await listing.$eval('h3', (el) => el.textContent ?? '').catch(() => '');
        }

        // Extract price (data-test-id="price")
        const price = await listing.$eval(
          '[data-test-id="price"]',
          (el) => el.textContent ?? ''
        ).catch(() => '');

        // Extract location - try multiple selectors
        let location = await listing.$eval(
          'p.text-caption.text-neutral',
          (el) => el.textContent ?? ''
        ).catch(() => '');

        if (!location) {
          // Fallback for real estate: look for paragraph with location info
          location = await listing.evaluate((el) => {
            // Find paragraph that contains city/postal code pattern
            const paragraphs = Array.from(el.querySelectorAll('p'));
            for (let i = 0; i < paragraphs.length; i++) {
              const text = paragraphs[i].textContent ?? '';
              // Match patterns like "Paris 75002" or city names
              if (/\d{5}/.test(text) || /Paris|Lyon|Marseille/i.test(text)) {
                return text;
              }
            }
            return '';
          }).catch(() => '');
        }

        // Extract raw HTML of the listing item (with unwanted elements stripped)
        const rawHtml = await listing.evaluate((element) => {
          // Clone to avoid modifying the DOM
          const clone = element.cloneNode(true) as HTMLElement;
          // Remove style tags
          clone.querySelectorAll('style').forEach(s => s.remove());
          // Remove save/favorite ad button (contains heart SVG)
          clone.querySelectorAll('[data-qa-id="listitem_save_ad"]').forEach(s => s.remove());
          // Remove all SVG elements (icons, etc.)
          clone.querySelectorAll('svg').forEach(s => s.remove());
          // Remove h3 elements (title is already extracted separately)
          clone.querySelectorAll('h3').forEach(s => s.remove());
          // Remove pro store logo images
          clone.querySelectorAll('img[data-test-id="pro-store-logo"]').forEach(s => s.remove());
          // Remove inline styles
          clone.querySelectorAll('[style]').forEach(el => el.removeAttribute('style'));
          // Remove all class attributes (no styling info needed)
          clone.querySelectorAll('[class]').forEach(el => el.removeAttribute('class'));
          return clone.outerHTML;
        }).catch(() => '');

        // Extract URL from the ad link
        const relativeUrl = await listing.$eval(
          'a[href^="/ad/"]',
          (el) => el.getAttribute('href') ?? ''
        ).catch(() => '');

        let url = '';
        if (relativeUrl) {
          url = relativeUrl.startsWith('http')
            ? relativeUrl
            : `https://www.leboncoin.fr${relativeUrl}`;
        }

        // Extract image URL (optional) - try multiple selectors
        let imageUrl = await listing.$eval(
          'img[src*="leboncoin"]',
          (el) => el.getAttribute('src') ?? undefined
        ).catch(() => undefined);

        if (!imageUrl) {
          imageUrl = await listing.$eval(
            'img',
            (el) => el.getAttribute('src') ?? undefined
          ).catch(() => undefined);
        }

        // Extract condition/state (optional - e.g., "Très bon état")
        const condition = await listing.$eval(
          'p.text-caption:not(.text-neutral):not(.sr-only)',
          (el) => el.textContent ?? undefined
        ).catch(() => undefined);

        scrapedListings.push({
          title: title.trim(),
          price: price.trim(),
          location: location.trim(),
          description: rawHtml,
          externalCategory,
          url,
          imageUrl,
          postedAt: condition?.trim(),
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
