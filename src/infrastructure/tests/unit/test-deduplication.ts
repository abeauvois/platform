/**
 * Unit Test: Deduplication Stage with In-Memory Repository
 * Demonstrates duplicate detection without external dependencies
 */

import { DeduplicationStage } from '../../workflow/stages/DeduplicationStage.js';
import { InMemoryLinkRepository } from '../../repositories/InMemoryLinkRepository.js';
import { Bookmark } from '../../../domain/entities/Bookmark.js';
import { ILogger } from '../../../domain/ports/ILogger.js';

// Simple test logger
class TestLogger implements ILogger {
    logs: string[] = [];

    info(message: string): void {
        this.logs.push(`[INFO] ${message}`);
    }
    warning(message: string): void {
        this.logs.push(`[WARN] ${message}`);
    }
    error(message: string): void {
        this.logs.push(`[ERROR] ${message}`);
    }
    debug(message: string): void {
        this.logs.push(`[DEBUG] ${message}`);
    }
    await(message: string) {
        return {
            start: () => { },
            update: () => { },
            stop: () => { }
        };
    }
}

async function runTests() {
    console.log('🧪 Testing Deduplication Stage\n');

    // Test 1: Unique links should pass through
    console.log('Test 1: Unique links pass through');
    {
        const repo = new InMemoryLinkRepository();
        const logger = new TestLogger();
        const stage = new DeduplicationStage(repo, logger);

        const link1 = new Bookmark('https://example.com/1', '', '', 'email1.eml');
        const link2 = new Bookmark('https://example.com/2', '', '', 'email2.eml');

        const results1 = [];
        for await (const result of stage.process(link1)) {
            results1.push(result);
        }

        const results2 = [];
        for await (const result of stage.process(link2)) {
            results2.push(result);
        }

        if (results1.length !== 1 || results2.length !== 1) {
            throw new Error(`❌ FAILED: Expected 2 unique links, got ${results1.length + results2.length}`);
        }

        if (stage.getDuplicateCount() !== 0) {
            throw new Error(`❌ FAILED: Expected 0 duplicates, got ${stage.getDuplicateCount()}`);
        }

        console.log('  ✓ Both unique links passed through');
        console.log(`  ✓ Repository contains ${repo.getCount()} links`);
    }

    // Test 2: Duplicate links should be filtered
    console.log('\nTest 2: Duplicate links are filtered');
    {
        const repo = new InMemoryLinkRepository();
        const logger = new TestLogger();
        const stage = new DeduplicationStage(repo, logger);

        const link1 = new Bookmark('https://example.com/same', 'tag1', 'desc1', 'email1.eml');
        const link2 = new Bookmark('https://example.com/same', 'tag2', 'desc2', 'email2.eml'); // Same URL

        // Process first link
        const results1 = [];
        for await (const result of stage.process(link1)) {
            results1.push(result);
        }

        // Process duplicate link
        const results2 = [];
        for await (const result of stage.process(link2)) {
            results2.push(result);
        }

        if (results1.length !== 1) {
            throw new Error(`❌ FAILED: First link should pass through`);
        }

        if (results2.length !== 0) {
            throw new Error(`❌ FAILED: Duplicate link should be filtered`);
        }

        if (stage.getDuplicateCount() !== 1) {
            throw new Error(`❌ FAILED: Expected 1 duplicate, got ${stage.getDuplicateCount()}`);
        }

        console.log('  ✓ First link passed through');
        console.log('  ✓ Duplicate link was filtered');
        console.log(`  ✓ Duplicate count: ${stage.getDuplicateCount()}`);
    }

    // Test 3: Pre-populated repository
    console.log('\nTest 3: Check against pre-existing links');
    {
        const repo = new InMemoryLinkRepository();
        const logger = new TestLogger();

        // Pre-populate repository with existing links
        const existingLink = new Bookmark('https://already-exists.com', 'Old', 'Old description', 'old.eml');
        await repo.save(existingLink);

        console.log(`  ℹ️  Pre-populated repository with 1 existing link`);

        const stage = new DeduplicationStage(repo, logger);

        // Try to process the same URL
        const newLink = new Bookmark('https://already-exists.com', 'New', 'New description', 'new.eml');
        const results = [];
        for await (const result of stage.process(newLink)) {
            results.push(result);
        }

        if (results.length !== 0) {
            throw new Error(`❌ FAILED: Link already exists in repository, should be filtered`);
        }

        if (stage.getDuplicateCount() !== 1) {
            throw new Error(`❌ FAILED: Expected 1 duplicate detected`);
        }

        console.log('  ✓ Duplicate detected against pre-existing link');
        console.log('  ✓ Link was filtered correctly');
    }

    // Test 4: Multiple duplicates
    console.log('\nTest 4: Multiple duplicates of same URL');
    {
        const repo = new InMemoryLinkRepository();
        const logger = new TestLogger();
        const stage = new DeduplicationStage(repo, logger);

        const urls = [
            'https://example.com/shared',
            'https://example.com/shared', // Duplicate
            'https://example.com/unique',
            'https://example.com/shared', // Duplicate again
        ];

        let passedThrough = 0;
        for (const url of urls) {
            const link = new Bookmark(url, '', '', 'test.eml');
            for await (const result of stage.process(link)) {
                passedThrough++;
            }
        }

        if (passedThrough !== 2) {
            throw new Error(`❌ FAILED: Expected 2 unique links, got ${passedThrough}`);
        }

        if (stage.getDuplicateCount() !== 2) {
            throw new Error(`❌ FAILED: Expected 2 duplicates, got ${stage.getDuplicateCount()}`);
        }

        console.log(`  ✓ Processed 4 links: ${passedThrough} unique, ${stage.getDuplicateCount()} duplicates`);
        console.log(`  ✓ Repository contains ${repo.getCount()} unique links`);
    }

    console.log('\n✅ All deduplication tests passed!\n');
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
