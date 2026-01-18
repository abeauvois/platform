import puppeteer, { type Browser, type Page } from 'puppeteer-core';
import type { BrowserScraperOptions, IScrapeStrategy } from './types';

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

  async scrape<T>(url: string, strategy: IScrapeStrategy<T>): Promise<T> {
    if (!this.browser) {
      throw new Error('Not connected');
    }

    const pages = await this.browser.pages();
    const page = pages[0] || await this.browser.newPage();

    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: this.defaultTimeout });
      return await strategy.execute(page);
    } finally {
      await page.close();
    }
  }
}

export type { Page };
