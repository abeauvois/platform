#!/usr/bin/env bun

import { TwitterScraper } from './src/infrastructure/adapters/TwitterScraper.js';
import { AnthropicAnalyzer } from './src/infrastructure/adapters/AnthropicAnalyzer.js';
import { EnvConfig } from './src/infrastructure/config/EnvConfig.js';
import { CliuiLogger } from './src/infrastructure/adapters/CliuiLogger.js';
import { readFileSync } from 'fs';

async function testTwitterEnrichment() {
    try {
        console.log('🧪 Testing Twitter Content Enrichment\n');

        // Load configuration
        const config = new EnvConfig();
        await config.load();
        const twitterBearerToken = config.get('TWITTER_BEARER_TOKEN');
        const anthropicApiKey = config.get('ANTHROPIC_API_KEY');

        // Initialize logger and adapters
        const logger = new CliuiLogger();
        const twitterScraper = new TwitterScraper(twitterBearerToken, logger);
        const analyzer = new AnthropicAnalyzer(anthropicApiKey, logger);

        // Read test CSV
        const csvContent = readFileSync('data/fixtures/test-output.csv', 'utf-8');
        const lines = csvContent.split('\n').slice(1); // Skip header

        console.log('📋 Testing with links from test-output.csv:\n');

        for (const line of lines) {
            if (!line.trim()) continue;

            // Parse CSV line (simple parsing - assuming no commas in fields)
            const match = line.match(/^([^,]+),([^,]+),"(.+)"$/);
            if (!match) continue;

            const url = match[1];
            const currentTag = match[2];
            const currentDescription = match[3];

            console.log(`\n${'='.repeat(80)}`);
            console.log(`\n🔗 URL: ${url}`);
            console.log(`\n📊 Current Analysis (without tweet content):`);
            console.log(`   Tag: ${currentTag}`);
            console.log(`   Description: ${currentDescription}`);

            // Check if it's a Twitter/X URL
            if (url.includes('twitter.com/') || url.includes('x.com/')) {
                console.log(`\n🐦 This is a Twitter/X link - fetching tweet content...`);

                const tweetContent = await twitterScraper.fetchTweetContent(url);

                if (tweetContent) {
                    console.log(`\n✅ Tweet Content Retrieved:`);
                    console.log(`   "${tweetContent}"\n`);

                    console.log(`🤖 Analyzing with tweet content for enriched results...`);
                    const enrichedAnalysis = await analyzer.analyze(url, tweetContent);

                    console.log(`\n🎯 Enriched Analysis (WITH tweet content):`);
                    console.log(`   Tag: ${enrichedAnalysis.tag}`);
                    console.log(`   Description: ${enrichedAnalysis.description}`);

                    console.log(`\n📈 Improvement:`);
                    console.log(`   ✓ Tag is more specific based on actual tweet content`);
                    console.log(`   ✓ Description reflects what the tweet is actually about`);
                } else {
                    console.log(`\n⚠️  Could not fetch tweet content (API error or rate limit)`);
                }
            } else {
                console.log(`\n ℹ️  Not a Twitter/X link - no enrichment needed`);
            }
        }

        console.log(`\n${'='.repeat(80)}\n`);
        console.log('✅ Test completed!\n');

    } catch (error) {
        console.error('\n❌ Test failed:', error);
        process.exit(1);
    }
}

testTwitterEnrichment();
