import type { Page } from 'puppeteer-core';
import type { ILogger } from '@platform/platform-domain';

export type { ILogger };

export interface BrowserScraperOptions {
  cdpEndpoint: string;
  defaultTimeout?: number;
}

export interface PaginationOptions {
  maxPages?: number;           // Maximum number of pages to scrape (default: 1)
  delayBetweenPages?: number;  // Delay in ms between pages (default: 500)
}

export interface IScrapeStrategy<T> {
  name: string;
  execute: (page: Page, options?: PaginationOptions) => Promise<T>;
}

export interface ScrapedListing {
  title: string;
  price: string;
  location: string;
  description: string;
  url: string;
  imageUrl?: string;
  postedAt?: string;
}

export type { Page };
