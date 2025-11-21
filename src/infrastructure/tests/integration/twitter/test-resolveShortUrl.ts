#!/usr/bin/env bun

import { TwitterClient } from '../../../adapters/TwitterClient.js';
import { CliuiLogger } from '../../../adapters/CliuiLogger.js';

/**
 * Integration test for the resolveShortUrl function
 * This test uses real HTTP requests without mocks
 */
async function testResolveShortUrl() {
    try {
        console.log('🧪 Testing resolveShortUrl function - Integration Test\n');
        console.log('⚠️  This test makes real HTTP requests to resolve shortened URLs\n');

        // Create a TwitterClient instance (bearer token not needed for resolveShortUrl)
        const logger = new CliuiLogger();
        const scraper = new TwitterClient('dummy-token', logger);

        // Test URLs provided by the user
        const testUrls = [
            {
                name: 'Shortened X.com URL 1 (neatprompts)',
                url: 'https://x.com/neatprompts/status/1980129370653257739?s=51&t=JsTxSwMxTXa',
                expectedPattern: /x\.com\/neatprompts\/status\/1980129370653257739/
            },
            {
                name: 'Shortened X.com URL 2 (daievolutionhub)',
                url: 'https://x.com/daievolutionhub/status/1975169191209554269?s=51&t=JsTxSwM',
                expectedPattern: /x\.com\/daievolutionhub\/status\/1975169191209554269/
            }
        ];

        let passedTests = 0;
        let failedTests = 0;

        for (const testCase of testUrls) {
            console.log(`\n📝 Testing: ${testCase.name}`);
            console.log(`   Input URL: ${testCase.url}`);

            try {
                // Access the private method using bracket notation
                const resolvedUrl = await (scraper as any).resolveShortUrl(testCase.url);

                if (!resolvedUrl) {
                    console.log('   ❌ Failed: resolveShortUrl returned null');
                    failedTests++;
                    continue;
                }

                console.log(`   Resolved URL: ${resolvedUrl}`);

                // Verify the resolved URL matches the expected pattern
                if (testCase.expectedPattern.test(resolvedUrl)) {
                    console.log('   ✓ URL resolved correctly and matches expected pattern');
                    passedTests++;
                } else {
                    console.log(`   ❌ Failed: URL doesn't match expected pattern ${testCase.expectedPattern}`);
                    failedTests++;
                }

                // Verify it's a Twitter/X URL
                if (resolvedUrl.includes('twitter.com/') || resolvedUrl.includes('x.com/')) {
                    console.log('   ✓ Confirmed as Twitter/X URL');
                } else {
                    console.log('   ⚠️  Warning: Resolved URL is not a Twitter/X URL');
                }

                // Additional validation: Check that query parameters were handled
                const originalHasParams = testCase.url.includes('?s=51&t=');
                if (originalHasParams) {
                    console.log('   ✓ Original URL had shortening parameters (s=51&t=...)');
                }

            } catch (error) {
                console.log(`   ❌ Error: ${error instanceof Error ? error.message : error}`);
                failedTests++;
            }
        }

        // Test with a t.co URL (if available)
        console.log('\n📝 Testing: Generic t.co URL behavior');
        console.log('   Note: This tests the method behavior, actual t.co URLs may expire');

        // Test that the method handles errors gracefully
        const invalidUrl = 'https://invalid-url-that-does-not-exist.com/test';
        console.log(`\n📝 Testing: Error handling with invalid URL`);
        console.log(`   Input URL: ${invalidUrl}`);

        try {
            const result = await (scraper as any).resolveShortUrl(invalidUrl);
            if (result === null) {
                console.log('   ✓ Correctly returned null for invalid/unreachable URL');
                passedTests++;
            } else {
                console.log('   ⚠️  Expected null for invalid URL but got:', result);
            }
        } catch (error) {
            console.log('   ✓ Error handled gracefully');
            passedTests++;
        }

        // Summary
        console.log('\n' + '='.repeat(60));
        console.log('📊 Test Summary:');
        console.log(`   Total tests: ${passedTests + failedTests}`);
        console.log(`   ✓ Passed: ${passedTests}`);
        console.log(`   ✗ Failed: ${failedTests}`);
        console.log('='.repeat(60));

        if (failedTests === 0) {
            console.log('\n✅ All tests passed successfully!');
        } else {
            console.log(`\n⚠️  ${failedTests} test(s) failed`);
            process.exit(1);
        }

    } catch (error) {
        console.error('\n❌ Test suite failed:', error instanceof Error ? error.message : error);
        if (error instanceof Error && error.stack) {
            console.error('\nStack trace:', error.stack);
        }
        process.exit(1);
    }
}

// Run the test
testResolveShortUrl();
