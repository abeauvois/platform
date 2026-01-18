import type { Page } from 'puppeteer-core';

/**
 * Port: Browser scraper for fetching content from protected websites
 *
 * Uses Chrome DevTools Protocol (CDP) to connect to an existing browser session,
 * preserving cookies, sessions, and browser fingerprint to bypass protection.
 */
export interface IBrowserScraper {
    /**
     * Connect to Chrome via CDP endpoint
     * @param cdpEndpoint The CDP WebSocket endpoint (e.g., http://localhost:9222)
     */
    connect(cdpEndpoint: string): Promise<void>;

    /**
     * Disconnect from the browser
     */
    disconnect(): Promise<void>;

    /**
     * Check if connected to browser
     */
    isConnected(): boolean;

    /**
     * Scrape a URL using the provided strategy
     * @param url The URL to scrape
     * @param strategy The scraping strategy to use
     */
    scrape<T>(url: string, strategy: IScrapeStrategy<T>): Promise<T>;
}

/**
 * Strategy interface for site-specific scraping logic
 */
export interface IScrapeStrategy<T> {
    /** Strategy identifier */
    name: string;

    /**
     * Execute the scraping strategy on the page
     * @param page Puppeteer page object
     */
    execute(page: Page): Promise<T>;
}
