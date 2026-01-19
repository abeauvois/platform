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

        // Extract URL from the ad link
        const relativeUrl = await listing.$eval(
          'a[href^="/ad/"]',
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

        // Extract condition/state (optional - e.g., "Très bon état")
        const condition = await listing.$eval(
          'p.text-caption:not(.text-neutral):not(.sr-only)',
          (el) => el.textContent ?? undefined
        ).catch(() => undefined);

        scrapedListings.push({
          title: title.trim(),
          price: price.trim(),
          location: location.trim(),
          url,
          imageUrl,
          postedAt: condition?.trim(), // Using condition as postedAt for now
        });
      } catch (error) {
        // Skip listings that fail to parse
        continue;
      }
    }

    return scrapedListings;
  }
}
