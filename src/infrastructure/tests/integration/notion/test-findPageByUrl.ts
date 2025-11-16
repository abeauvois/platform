#!/usr/bin/env bun

import { NotionLinkRepository } from '../../../repositories/NotionLinkRepository.js';
import { EmailLink } from '../../../../domain/entities/EmailLink.js';
import { EnvConfig } from '../../../config/EnvConfig.js';

/**
 * Integration test for NotionLinkRepository
 * Tests: exists(), findByUrl(), save() methods
 * This test uses the real Notion API without mocks
 */
async function testNotionLinkRepository() {
    try {
        console.log('🧪 Testing NotionLinkRepository - Integration Test\n');
        console.log('⚠️  This test requires a real Notion database and will create/query actual pages\n');

        // Load configuration
        const config = new EnvConfig();
        await config.load();
        const notionToken = config.get('NOTION_INTEGRATION_TOKEN');
        const databaseId = config.get('NOTION_DATABASE_ID');

        // Create the repository instance
        const repository = new NotionLinkRepository(notionToken, databaseId);

        // Generate a unique test URL to avoid conflicts with existing data
        const timestamp = Date.now();
        const testUrl = `https://test-notion-repo-${timestamp}.example.com`;
        const testLink = new EmailLink(
            testUrl,
            'Test Link for Repository',
            'Integration test link created to verify NotionLinkRepository functionality',
            'integration-test'
        );

        console.log(`📝 Test URL: ${testUrl}\n`);

        // Test 1: Check non-existent page (should return false)
        console.log('Test 1: Check for non-existent page');
        const doesNotExist = await repository.exists('https://nonexistent-url-12345.example.com');

        if (doesNotExist !== false) {
            throw new Error(`Expected false for non-existent URL, but got: ${doesNotExist}`);
        }
        console.log('  ✓ Returns false for non-existent URL\n');

        // Test 2: Create a page and verify it exists
        console.log('Test 2: Create page and verify it exists');
        console.log(`  Creating page with URL: ${testUrl}`);
        await repository.save(testLink);
        console.log('  Page created successfully');

        // Wait a moment for Notion to index the new page
        console.log('  Waiting 2 seconds for Notion to index the page...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        console.log('  Checking if page exists...');
        const exists = await repository.exists(testUrl);

        if (!exists) {
            throw new Error('Failed to find the page that was just created');
        }
        console.log(`  ✓ Page exists in database\n`);

        // Test 3: Retrieve the page using findByUrl
        console.log('Test 3: Retrieve page details using findByUrl');
        const foundLink = await repository.findByUrl(testUrl);

        if (foundLink === null) {
            throw new Error('findByUrl returned null for existing page');
        }
        if (foundLink.url !== testUrl) {
            throw new Error(`URL mismatch: expected ${testUrl}, got ${foundLink.url}`);
        }
        console.log(`  ✓ Retrieved page with URL: ${foundLink.url}\n`);

        // Test 4: Update the page
        console.log('Test 4: Update existing page');
        const updatedLink = new EmailLink(
            testUrl,
            'updated-tag',
            'This description was updated by the integration test',
            'integration-test'
        );

        await repository.save(updatedLink);
        console.log('  ✓ Page updated successfully\n');

        // Test 5: Verify the update
        console.log('Test 5: Verify update was applied');
        const retrievedLink = await repository.findByUrl(testUrl);

        if (retrievedLink === null) {
            throw new Error('Failed to retrieve updated page');
        }
        if (retrievedLink.tag !== 'updated-tag') {
            throw new Error(`Tag not updated: expected 'updated-tag', got '${retrievedLink.tag}'`);
        }
        console.log(`  ✓ Update verified: tag = '${retrievedLink.tag}'\n`);

        console.log('✅ All tests passed successfully!');
        console.log('\n📋 Summary:');
        console.log('  - Non-existent URL check: ✓');
        console.log('  - Page creation and exists check: ✓');
        console.log('  - findByUrl retrieval: ✓');
        console.log('  - Page update: ✓');
        console.log('  - Update verification: ✓');
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
testNotionLinkRepository();
