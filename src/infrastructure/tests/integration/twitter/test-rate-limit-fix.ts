#!/usr/bin/env bun

// Test script to verify the rate limit fix
import { EnvConfig } from '../../../config/EnvConfig.js';

// Load environment variables
const config = new EnvConfig();
await config.load();

// Import after env vars are loaded
import { TwitterClient } from '../../../adapters/TwitterClient.js';
import { CliuiLogger } from '../../../adapters/CliuiLogger.js';

async function testRateLimitFix() {
    const logger = new CliuiLogger();
    const bearerToken = config.get('TWITTER_BEARER_TOKEN');
    const scraper = new TwitterClient(bearerToken, logger);

    console.log('Testing rate limit fix...\n');

    // Test 1: Check initial state
    console.log('Initial state:');
    console.log(`  Rate limited: ${scraper.isRateLimited()}`);
    console.log(`  Reset time: ${scraper.getRateLimitResetTime()}`);
    console.log();

    // Test 2: Simulate rate limit (set a time in the past)
    console.log('Simulating expired rate limit...');
    (scraper as any).rateLimitResetTime = Date.now() - 1000; // 1 second ago
    console.log(`  Rate limited before check: ${(scraper as any).rateLimitResetTime > Date.now()}`);
    console.log(`  isRateLimited() result: ${scraper.isRateLimited()}`); // Should auto-clear
    console.log(`  Rate limited after check: ${(scraper as any).rateLimitResetTime > Date.now()}`);
    console.log(`  Reset time after check: ${scraper.getRateLimitResetTime()}`);
    console.log();

    // Test 3: Manual clear
    console.log('Testing manual clear...');
    (scraper as any).rateLimitResetTime = Date.now() + 10000; // 10 seconds in future
    console.log(`  Rate limited before clear: ${scraper.isRateLimited()}`);
    scraper.clearRateLimit();
    console.log(`  Rate limited after clear: ${scraper.isRateLimited()}`);
    console.log();

    // Test 4: Real API test (if you want to test with actual tweet)
    const testUrl = 'https://x.com/clementdelangue/status/1985357572300321213';
    console.log(`Testing with real URL: ${testUrl}`);
    console.log('Attempting to fetch tweet content...');

    const content = await scraper.fetchTweetContent(testUrl);
    if (content) {
        console.log(`  ✅ Successfully fetched tweet content (${content.substring(0, 50)}...)`);
    } else {
        console.log(`  ⚠️  Could not fetch tweet (might be rate limited or invalid)`);
        if (scraper.isRateLimited()) {
            const waitSeconds = Math.ceil((scraper.getRateLimitResetTime() - Date.now()) / 1000);
            console.log(`  Rate limit will reset in ${waitSeconds} seconds`);
        }
    }
}

testRateLimitFix().catch(console.error);
