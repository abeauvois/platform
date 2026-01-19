import puppeteer, { type Browser, type Page } from 'puppeteer-core';
import type { BrowserScraperOptions, IScrapeStrategy, PaginationOptions } from './types';

export interface ScrapeOptions extends PaginationOptions {}

export class ChromeCdpAdapter {
  private browser: Browser | null = null;
  private cdpEndpoint: string;
  private defaultTimeout: number;

  constructor(options: BrowserScraperOptions) {
    this.cdpEndpoint = options.cdpEndpoint;
    this.defaultTimeout = options.defaultTimeout ?? 30000;
  }

  async connect(): Promise<void> {
    this.browser = await puppeteer.connect({
      browserURL: this.cdpEndpoint,
    });
  }

  async disconnect(): Promise<void> {
    if (this.browser) {
      this.browser.disconnect();
      this.browser = null;
    }
  }

  isConnected(): boolean {
    return this.browser !== null && this.browser.connected;
  }

  async scrape<T>(url: string, strategy: IScrapeStrategy<T>, options?: ScrapeOptions): Promise<T> {
    if (!this.browser) {
      throw new Error('Not connected');
    }

    // Always create a new page to avoid DevTools or internal Chrome pages
    const page = await this.browser.newPage();

    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: this.defaultTimeout });
      return await strategy.execute(page, options);
    } finally {
      try {
        await page.close();
      } catch {
        // Page may already be closed or invalid - ignore
      }
    }
  }
}

export type { Page };
