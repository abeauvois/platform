import type { Page } from 'puppeteer-core';
import type { IScrapeStrategy, ScrapedListing } from '../types';

export class LeboncoinStrategy implements IScrapeStrategy<Array<ScrapedListing>> {
  public readonly name = 'leboncoin';

  async execute(page: Page): Promise<Array<ScrapedListing>> {
    // Wait for listings to load
    await page.waitForSelector('[data-qa-id="aditem_container"]', { timeout: 10000 });

    // Extract all listing cards
    const listings = await page.$$('[data-qa-id="aditem_container"]');

    const scrapedListings: Array<ScrapedListing> = [];

    for (const listing of listings) {
      try {
        // Extract title
        const title = await listing.$eval(
          '[data-qa-id="aditem_title"]',
          (el) => el.textContent ?? ''
        ).catch(() => '');

        // Extract price
        const price = await listing.$eval(
          '[data-qa-id="aditem_price"]',
          (el) => el.textContent ?? ''
        ).catch(() => '');

        // Extract location (may not always be present)
        const location = await listing.$eval(
          '[data-qa-id="aditem_location"]',
          (el) => el.textContent ?? ''
        ).catch(() => '');

        // Extract URL
        const relativeUrl = await listing.$eval(
          'a',
          (el) => el.getAttribute('href') ?? ''
        ).catch(() => '');

        const url = relativeUrl.startsWith('http')
          ? relativeUrl
          : `https://www.leboncoin.fr${relativeUrl}`;

        // Extract image URL (optional)
        const imageUrl = await listing.$eval(
          'img',
          (el) => el.getAttribute('src') ?? undefined
        ).catch(() => undefined);

        // Extract posted date (optional)
        const postedAt = await listing.$eval(
          '[data-qa-id="aditem_date"]',
          (el) => el.textContent ?? undefined
        ).catch(() => undefined);

        scrapedListings.push({
          title: title.trim(),
          price: price.trim(),
          location: location.trim(),
          url,
          imageUrl,
          postedAt: postedAt?.trim(),
        });
      } catch (error) {
        // Skip listings that fail to parse
        console.error('Failed to parse listing:', error);
        continue;
      }
    }

    return scrapedListings;
  }
}
