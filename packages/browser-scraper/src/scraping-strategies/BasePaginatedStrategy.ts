import type { Page } from 'puppeteer-core';
import type { ILogger, IScrapeStrategy, PaginationOptions, ScrapedListing } from '../types';

export abstract class BasePaginatedStrategy implements IScrapeStrategy<Array<ScrapedListing>> {
  abstract readonly name: string;

  constructor(protected readonly logger?: ILogger) {}

  /** CSS selector to wait for before extracting listings */
  protected abstract readonly listingSelector: string;

  /** Site-specific cookie consent dismiss logic run inside page.evaluate() */
  protected abstract dismissCookieConsentInPage(page: Page): Promise<boolean>;

  /** Extract category string from the h1 text (pure function) */
  protected abstract parseCategoryFromH1(h1Text: string): string;

  /** Extract all listings from the current page */
  protected abstract extractListingsFromPage(page: Page, externalCategory: string): Promise<Array<ScrapedListing>>;

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
        await page.waitForSelector(this.listingSelector, { timeout: 10000 });
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

  protected buildPageUrl(baseUrl: string, pageNum: number): string {
    const url = new URL(baseUrl);
    url.searchParams.set('page', String(pageNum));
    return url.toString();
  }

  protected delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async dismissCookieConsent(page: Page): Promise<void> {
    try {
      // Wait briefly for the consent dialog to appear
      await this.delay(1000);

      const clicked = await this.dismissCookieConsentInPage(page);

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
      return this.parseCategoryFromH1(h1Text);
    } catch {
      return '';
    }
  }
}
