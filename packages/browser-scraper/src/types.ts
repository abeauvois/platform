import type { Page } from 'puppeteer-core';

export interface BrowserScraperOptions {
  cdpEndpoint: string;
  defaultTimeout?: number;
}

export interface IScrapeStrategy<T> {
  name: string;
  execute(page: Page): Promise<T>;
}

export interface ScrapedListing {
  title: string;
  price: string;
  location: string;
  url: string;
  imageUrl?: string;
  postedAt?: string;
}

export type { Page };
