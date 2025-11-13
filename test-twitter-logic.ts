// Test script to verify the Twitter rate limit logic
import { TwitterScraper } from './src/infrastructure/adapters/TwitterScraper.js';
import { CliuiLogger } from './src/infrastructure/adapters/CliuiLogger.js';

const logger = new CliuiLogger();
const scraper = new TwitterScraper(process.env.TWITTER_BEARER_TOKEN || '', logger);

// Test URLs
const tweetUrls = [
    'https://x.com/clementdelangue/status/1985357572300321213',
    'https://x.com/example/status/1234567890123456789',
    'https://x.com/another/status/9876543210987654321'
];

async function testRateLimitLogic() {
    console.log('Testing Twitter rate limit logic...\n');

    for (let i = 0; i < tweetUrls.length; i++) {
        const url = tweetUrls[i];
        console.log(`\nAttempt ${i + 1}: ${url}`);
        console.log(`Rate limited: ${scraper.isRateLimited()}`);
        console.log(`Reset time: ${scraper.getRateLimitResetTime()}`);

        const content = await scraper.fetchTweetContent(url);
        console.log(`Result: ${content ? 'SUCCESS' : 'NULL'}`);

        if (scraper.isRateLimited()) {
            const waitSeconds = Math.ceil((scraper.getRateLimitResetTime() - Date.now()) / 1000);
            console.log(`Rate limit hit! Wait ${waitSeconds} seconds`);
        }
    }
}

testRateLimitLogic();
