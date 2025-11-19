/**
 * Unit Test: CSV Link Repository
 * Tests CSV file-based storage and retrieval
 */

import { CsvLinkRepository } from '../../repositories/CsvLinkRepository.js';
import { Bookmark } from '../../../domain/entities/Bookmark.js';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';

const TEST_CSV_PATH = './test-links-temp.csv';

async function cleanupTestFile() {
    if (existsSync(TEST_CSV_PATH)) {
        await unlink(TEST_CSV_PATH);
    }
}

async function runTests() {
    console.log('🧪 Testing CSV Link Repository\n');

    try {
        // Test 1: Save and retrieve a link
        console.log('Test 1: Save and retrieve a link');
        {
            await cleanupTestFile();
            const repo = new CsvLinkRepository(TEST_CSV_PATH);

            const link = new Bookmark('https://example.com/test', 'Tech', 'A test article', 'test.eml');
            await repo.save(link);

            const found = await repo.findByUrl('https://example.com/test');
            if (!found) {
                throw new Error('❌ FAILED: Link not found after saving');
            }

            if (found.url !== link.url || found.tag !== link.tag || found.description !== link.description) {
                throw new Error('❌ FAILED: Retrieved link does not match saved link');
            }

            console.log('  ✓ Link saved and retrieved correctly');
        }

        // Test 2: exists() method
        console.log('\nTest 2: Check if link exists');
        {
            await cleanupTestFile();
            const repo = new CsvLinkRepository(TEST_CSV_PATH);

            const exists1 = await repo.exists('https://example.com/test');
            if (exists1) {
                throw new Error('❌ FAILED: Link should not exist in empty repository');
            }

            await repo.save(new Bookmark('https://example.com/test', '', '', ''));

            const exists2 = await repo.exists('https://example.com/test');
            if (!exists2) {
                throw new Error('❌ FAILED: Link should exist after saving');
            }

            console.log('  ✓ exists() works correctly');
        }

        // Test 3: saveMany()
        console.log('\nTest 3: Save multiple links');
        {
            await cleanupTestFile();
            const repo = new CsvLinkRepository(TEST_CSV_PATH);

            const links = [
                new Bookmark('https://example.com/1', 'Tech', 'First', 'email1.eml'),
                new Bookmark('https://example.com/2', 'Business', 'Second', 'email2.eml'),
                new Bookmark('https://example.com/3', 'Science', 'Third', 'email3.eml'),
            ];

            await repo.saveMany(links);

            const allLinks = await repo.findAll();
            if (allLinks.length !== 3) {
                throw new Error(`❌ FAILED: Expected 3 links, got ${allLinks.length}`);
            }

            console.log('  ✓ Multiple links saved correctly');
        }

        // Test 4: findAll()
        console.log('\nTest 4: Retrieve all links');
        {
            await cleanupTestFile();
            const repo = new CsvLinkRepository(TEST_CSV_PATH);

            await repo.save(new Bookmark('https://a.com', 'A', 'Link A', 'a.eml'));
            await repo.save(new Bookmark('https://b.com', 'B', 'Link B', 'b.eml'));

            const allLinks = await repo.findAll();
            if (allLinks.length !== 2) {
                throw new Error(`❌ FAILED: Expected 2 links, got ${allLinks.length}`);
            }

            const urls = allLinks.map(l => l.url).sort();
            if (urls[0] !== 'https://a.com' || urls[1] !== 'https://b.com') {
                throw new Error('❌ FAILED: Retrieved URLs do not match');
            }

            console.log('  ✓ findAll() returns all links');
        }

        // Test 5: Update existing link
        console.log('\nTest 5: Update existing link');
        {
            await cleanupTestFile();
            const repo = new CsvLinkRepository(TEST_CSV_PATH);

            await repo.save(new Bookmark('https://example.com', 'OldTag', 'Old description', 'old.eml'));
            await repo.save(new Bookmark('https://example.com', 'NewTag', 'New description', 'new.eml'));

            const found = await repo.findByUrl('https://example.com');
            if (!found || found.tag !== 'NewTag' || found.description !== 'New description') {
                throw new Error('❌ FAILED: Link was not updated correctly');
            }

            const allLinks = await repo.findAll();
            if (allLinks.length !== 1) {
                throw new Error(`❌ FAILED: Should have 1 link after update, got ${allLinks.length}`);
            }

            console.log('  ✓ Link updated correctly (no duplicates)');
        }

        // Test 6: CSV escaping (commas, quotes, newlines)
        console.log('\nTest 6: CSV escaping of special characters');
        {
            await cleanupTestFile();
            const repo = new CsvLinkRepository(TEST_CSV_PATH);

            const complexLink = new Bookmark(
                'https://example.com/article?param=value&other=test',
                'Tag, with, commas',
                'Description with "quotes" and\nnewlines',
                'file.eml'
            );

            await repo.save(complexLink);

            const found = await repo.findByUrl('https://example.com/article?param=value&other=test');
            if (!found) {
                throw new Error('❌ FAILED: Link with special characters not found');
            }

            if (found.tag !== complexLink.tag) {
                throw new Error(`❌ FAILED: Tag not preserved. Expected: "${complexLink.tag}", Got: "${found.tag}"`);
            }

            if (found.description !== complexLink.description) {
                throw new Error(`❌ FAILED: Description not preserved`);
            }

            console.log('  ✓ Special characters handled correctly');
        }

        // Test 7: Persistence across instances
        console.log('\nTest 7: Data persists across repository instances');
        {
            await cleanupTestFile();

            // First instance
            const repo1 = new CsvLinkRepository(TEST_CSV_PATH);
            await repo1.save(new Bookmark('https://persist.com', 'Persistent', 'Persisted data', 'test.eml'));

            // Second instance (should read from file)
            const repo2 = new CsvLinkRepository(TEST_CSV_PATH);
            const found = await repo2.findByUrl('https://persist.com');

            if (!found || found.tag !== 'Persistent') {
                throw new Error('❌ FAILED: Data not persisted to file');
            }

            console.log('  ✓ Data persists across instances');
        }

        // Test 8: clear()
        console.log('\nTest 8: Clear repository');
        {
            await cleanupTestFile();
            const repo = new CsvLinkRepository(TEST_CSV_PATH);

            await repo.save(new Bookmark('https://a.com', '', '', ''));
            await repo.save(new Bookmark('https://b.com', '', '', ''));

            let allLinks = await repo.findAll();
            if (allLinks.length !== 2) {
                throw new Error(`❌ FAILED: Expected 2 links before clear, got ${allLinks.length}`);
            }

            await repo.clear();

            allLinks = await repo.findAll();
            if (allLinks.length !== 0) {
                throw new Error(`❌ FAILED: Expected 0 links after clear, got ${allLinks.length}`);
            }

            console.log('  ✓ Repository cleared successfully');
        }

        console.log('\n✅ All CSV repository tests passed!\n');

    } finally {
        // Cleanup
        await cleanupTestFile();
    }
}

// Run tests
runTests()
    .then(() => {
        console.log('🎉 Test suite completed successfully');
        process.exit(0);
    })
    .catch(error => {
        console.error('❌ Test suite failed:', error.message);
        console.error(error);
        process.exit(1);
    });
