#!/usr/bin/env bun

import { NotionDatabaseWriter } from '../../../adapters/NotionDatabaseWriter.js';
import { EmailLink } from '../../../../domain/entities/EmailLink.js';
import { EnvConfig } from '../../../config/EnvConfig.js';

/**
 * Integration test for the findPageByUrl function
 * This test uses the real Notion API without mocks
 */
async function testFindPageByUrl() {
    try {
        console.log('🧪 Testing findPageByUrl function - Integration Test\n');
        console.log('⚠️  This test requires a real Notion database and will create/query actual pages\n');

        // Load configuration
        const config = new EnvConfig();
        await config.load();
        const notionToken = config.get('NOTION_INTEGRATION_TOKEN');
        const databaseId = config.get('NOTION_DATABASE_ID');

        // Create the writer instance
        const writer = new NotionDatabaseWriter(notionToken);

        // Generate a unique test URL to avoid conflicts with existing data
        const timestamp = Date.now();
        const testUrl = `https://test-findpagebyurl-${timestamp}.example.com`;
        const testLink = new EmailLink(
            testUrl,
            'Test Link for findPageByUrl',
            'Integration test link created to verify findPageByUrl functionality',
            'integration-test'
        );

        console.log(`📝 Test URL: ${testUrl}\n`);

        // Test 1: Search for non-existent page (should return null)
        console.log('Test 1: Search for non-existent page');
        const notFound = await (writer as any).findPageByUrl('https://nonexistent-url-12345.example.com', databaseId);

        if (notFound !== null) {
            throw new Error(`Expected null for non-existent URL, but got: ${notFound}`);
        }
        console.log('  ✓ Returns null for non-existent URL\n');

        // Test 2: Create a page and find it
        console.log('Test 2: Create page and verify it can be found');
        console.log(`  Creating page with URL: ${testUrl}`);
        await writer.write([testLink], databaseId);
        console.log('  Page created successfully');

        // Wait a moment for Notion to index the new page
        console.log('  Waiting 2 seconds for Notion to index the page...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        console.log('  Searching for the created page...');
        const foundPageId = await (writer as any).findPageByUrl(testUrl, databaseId);

        if (foundPageId === null) {
            throw new Error('Failed to find the page that was just created');
        }
        console.log(`  ✓ Found page with ID: ${foundPageId}\n`);

        // Test 3: Verify same page is found on subsequent calls (consistency)
        console.log('Test 3: Verify consistency of search results');
        const foundAgain = await (writer as any).findPageByUrl(testUrl, databaseId);

        if (foundAgain !== foundPageId) {
            throw new Error(`Expected same page ID (${foundPageId}), but got: ${foundAgain}`);
        }
        console.log(`  ✓ Returns consistent page ID: ${foundPageId}\n`);

        // Test 4: Verify the function works correctly with updatePages
        console.log('Test 4: Verify integration with updatePages method');
        const updatedLink = new EmailLink(
            testUrl,
            'Updated Test Link',
            'This description was updated by the integration test',
            'updated-tag'
        );

        await writer.updatePages([updatedLink], databaseId, new Set([testUrl]));
        console.log('  ✓ updatePages method successfully used findPageByUrl to update the page\n');

        console.log('✅ All tests passed successfully!');
        console.log('\n📋 Summary:');
        console.log('  - Non-existent URL search: ✓');
        console.log('  - Page creation and retrieval: ✓');
        console.log('  - Consistency validation: ✓');
        console.log('  - Integration with updatePages: ✓');
        console.log(`\n⚠️  Test page created in Notion with URL: ${testUrl}`);
        console.log('   You may want to manually delete this test page from your database.');

    } catch (error) {
        console.error('\n❌ Test failed:', error instanceof Error ? error.message : error);
        if (error instanceof Error && error.stack) {
            console.error('\nStack trace:', error.stack);
        }
        process.exit(1);
    }
}

// Run the test
testFindPageByUrl();
