import type { Page } from 'puppeteer-core';
import type { ILogger, IScrapeStrategy, PaginationOptions, ScrapedListing } from '../types';

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

      // Extract all listing cards from this page
      const pageListings = await this.extractListingsFromPage(page);

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

  private async extractListingsFromPage(page: Page): Promise<Array<ScrapedListing>> {
    const listings = await page.$$('[data-qa-id="aditem_container"]');
    const scrapedListings: Array<ScrapedListing> = [];

    for (const listing of listings) {
      try {
        // Extract title (new selector: data-test-id="adcard-title")
        const title = await listing.$eval(
          '[data-test-id="adcard-title"]',
          (el) => el.textContent ?? ''
        ).catch(() => '');

        // Extract price (new selector: data-test-id="price")
        const price = await listing.$eval(
          '[data-test-id="price"]',
          (el) => el.textContent ?? ''
        ).catch(() => '');

        // Extract location (p tag with text-caption text-neutral class containing city + zip)
        const location = await listing.$eval(
          'p.text-caption.text-neutral',
          (el) => el.textContent ?? ''
        ).catch(() => '');

        // Extract contract type / description (e.g., "CDI", "Intérim")
        // Note: Full description is only available on the detail page, not in list view
        const description = await listing.$eval(
          'div.text-body-2 p:first-child',
          (el) => el.textContent ?? ''
        ).catch(() => '');

        // Extract URL from the ad link
        const relativeUrl = await listing.$eval(
          'a[href^="/ad/"]',
          (el) => el.getAttribute('href') ?? ''
        ).catch(() => '');

        let url = '';
        if (relativeUrl) {
          url = relativeUrl.startsWith('http')
            ? relativeUrl
            : `https://www.leboncoin.fr${relativeUrl}`
        }

        // Extract image URL (optional)
        const imageUrl = await listing.$eval(
          'img',
          (el) => el.getAttribute('src') ?? undefined
        ).catch(() => undefined);

        // Extract condition/state (optional - e.g., "Très bon état")
        const condition = await listing.$eval(
          'p.text-caption:not(.text-neutral):not(.sr-only)',
          (el) => el.textContent ?? undefined
        ).catch(() => undefined);

        scrapedListings.push({
          title: title.trim(),
          price: price.trim(),
          location: location.trim(),
          description: description.trim(),
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
