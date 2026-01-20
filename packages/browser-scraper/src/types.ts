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
  description: string;         // Raw HTML of the listing item (style tags stripped)
  externalCategory: string;    // Provider's category (e.g., "Emploi", "Véhicules")
  url: string;
  imageUrl?: string;
  postedAt?: string;           // Date/time or condition info (e.g., "Très bon état", "01/2021")
  tags?: string;               // Skills or tags (e.g., "React.js, Node.js, TypeScript")
}

export type { Page };
