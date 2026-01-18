import { describe, test, expect, beforeEach } from 'bun:test';
import { ChromeCdpAdapter } from '../ChromeCdpAdapter';
import type { BrowserScraperOptions, IScrapeStrategy } from '../types';

describe('ChromeCdpAdapter', () => {
  let adapter: ChromeCdpAdapter;
  const mockCdpEndpoint = 'ws://localhost:9222/devtools/browser/test';

  beforeEach(() => {
    const options: BrowserScraperOptions = {
      cdpEndpoint: mockCdpEndpoint,
      defaultTimeout: 5000,
    };
    adapter = new ChromeCdpAdapter(options);
  });

  describe('constructor', () => {
    test('should store cdpEndpoint from options', () => {
      expect(adapter['cdpEndpoint']).toBe(mockCdpEndpoint);
    });

    test('should store defaultTimeout from options', () => {
      expect(adapter['defaultTimeout']).toBe(5000);
    });

    test('should use default timeout of 30000ms when not provided', () => {
      const adapterWithDefaults = new ChromeCdpAdapter({
        cdpEndpoint: mockCdpEndpoint,
      });
      expect(adapterWithDefaults['defaultTimeout']).toBe(30000);
    });
  });

  describe('isConnected', () => {
    test('should return false initially before connection', () => {
      expect(adapter.isConnected()).toBe(false);
    });

    test('should return false when browser is null', () => {
      adapter['browser'] = null;
      expect(adapter.isConnected()).toBe(false);
    });
  });

  describe('connection lifecycle', () => {
    test('should throw error when scraping without connection', async () => {
      const mockStrategy: IScrapeStrategy<string> = {
        name: 'test-strategy',
        execute: async () => 'test',
      };

      await expect(
        adapter.scrape('https://example.com', mockStrategy)
      ).rejects.toThrow('Not connected');
    });
  });

  describe('disconnect', () => {
    test('should set browser to null after disconnect', async () => {
      adapter['browser'] = null;
      await adapter.disconnect();
      expect(adapter['browser']).toBeNull();
    });
  });
});
