/**
 * End-to-End Test for Workflow Pipeline with ZipFileProducer
 * 
 * Tests the complete workflow from actual zip file through to extracted links:
 * - ZipFileProducer (reads from test_mylinks.zip file)
 * - EmailParserStage (parses email content)
 * - BookmarkCollector (collects links)
 * - WorkflowExecutor (orchestrates the pipeline)
 * 
 * No mocking - uses real fixtures and adapters
 */

import { ZipExtractor } from '../../adapters/ZipExtractor.js';
import { HttpLinksParser } from '../../adapters/HttpLinksParser.js';
import { ZipFileProducer } from '../../workflow/producers/ZipFileProducer.js';
import { EmailParserStage } from '../../workflow/stages/EmailParserStage.js';
import { BookmarkCollector } from '../../workflow/consumers/BookmarkCollector.js';
import { Pipeline } from '../../../domain/workflow/Pipeline.js';
import { WorkflowExecutor } from '../../../domain/workflow/WorkflowExecutor.js';
import { ILogger } from '../../../domain/ports/ILogger.js';
import { join } from 'path';

// Simple console logger for test
class TestLogger implements ILogger {
    info(message: string): void {
        console.log(message);
    }
    warning(message: string): void {
        console.warn(message);
    }
    error(message: string): void {
        console.error(message);
    }
    debug(message: string): void {
        console.log(message);
    }
    await(message: string): { start(): void; update(message: string): void; stop(): void } {
        return {
            start: () => console.log(message),
            update: (msg: string) => console.log(msg),
            stop: () => { }
        };
    }
}

async function runWorkflowTest() {
    console.log('🧪 Starting Workflow Pipeline E2E Test (ZipFileProducer)\n');

    // Setup: Get path to test zip file
    const testZipPath = join(process.cwd(), 'data', 'fixtures', 'test_mylinks.zip');
    console.log(`📦 Test zip file: ${testZipPath}\n`);

    // Initialize real adapters (no mocking)
    const zipExtractor = new ZipExtractor();
    const linksExtractor = new HttpLinksParser();
    const logger = new TestLogger();

    // Create workflow components using ZipFileProducer
    const producer = new ZipFileProducer(testZipPath, zipExtractor);
    const stage = new EmailParserStage(linksExtractor);
    const pipeline = new Pipeline(stage);
    const consumer = new BookmarkCollector(logger);

    // Create workflow executor
    const workflow = new WorkflowExecutor(producer, pipeline, consumer);

    // Track statistics
    let errorCount = 0;
    const errors: Array<{ filename: string; error: string }> = [];

    // Execute workflow
    await workflow.execute({
        onStart: async () => {
            console.log('▶️  Starting workflow execution...\n');
        },
        onError: async (error: Error, item: any) => {
            errorCount++;
            errors.push({ filename: item.filename, error: error.message });
            console.log(`  ⚠️  Error processing ${item.filename}: ${error.message}`);
        },
        onComplete: async (stats) => {
            console.log(`\n✅ Workflow completed!`);
            console.log(`   Items produced: ${stats.itemsProduced}`);
            console.log(`   Items consumed: ${stats.itemsConsumed}`);
        }
    });

    // Get results
    const Bookmarks = consumer.getBookmarks();

    // Display results
    console.log('\n📊 Results Summary:');
    console.log(`   Total links extracted: ${Bookmarks.length}`);
    console.log(`   Errors encountered: ${errorCount}`);

    // Group links by source file
    const linksBySource = new Map<string, string[]>();
    Bookmarks.forEach(link => {
        const urls = linksBySource.get(link.sourceUri) || [];
        urls.push(link.url);
        linksBySource.set(link.sourceUri, urls);
    });

    console.log(`   Unique emails with links: ${linksBySource.size}`);

    // Display sample results
    if (Bookmarks.length > 0) {
        console.log('\n📝 Sample Results:');
        Bookmarks.slice(0, 3).forEach(link => {
            console.log(`\n   Source: ${link.sourceUri}`);
            console.log(`   URL: ${link.url}`);
        });
    }

    // Assertions
    console.log('\n🔍 Running Assertions:');

    // Assert: Should extract some links
    if (Bookmarks.length === 0) {
        throw new Error('❌ FAILED: No links were extracted');
    }
    console.log(`   ✓ Extracted ${Bookmarks.length} link(s)`);

    // Assert: Should have processed multiple source files
    if (linksBySource.size === 0) {
        throw new Error('❌ FAILED: No source files were processed');
    }
    console.log(`   ✓ Processed ${linksBySource.size} email file(s)`);

    // Assert: Known emails should be present
    const linkedinBookmarks = Array.from(linksBySource.keys()).find(filename =>
        filename.includes('Cette architecture divise par 5 le temps de livraison')
    );
    if (!linkedinBookmarks) {
        throw new Error('❌ FAILED: Expected LinkedIn email not found');
    }
    console.log(`   ✓ Found expected LinkedIn email`);

    // Assert: Links should be valid URLs
    const hasValidUrls = Bookmarks.some(link => link.url.startsWith('http'));
    if (!hasValidUrls) {
        throw new Error('❌ FAILED: No valid HTTP URLs found');
    }
    console.log(`   ✓ Found valid HTTP URLs`);

    // Assert: Should contain expected domains
    const hasLinkedIn = Bookmarks.some(link => link.url.includes('linkedin.com'));
    const hasTwitter = Bookmarks.some(link => link.url.includes('x.com') || link.url.includes('twitter.com'));

    if (!hasLinkedIn) {
        console.warn('   ⚠️  Warning: No LinkedIn links found (expected some)');
    } else {
        console.log(`   ✓ Found LinkedIn links`);
    }

    if (!hasTwitter) {
        console.warn('   ⚠️  Warning: No Twitter/X links found (expected some)');
    } else {
        console.log(`   ✓ Found Twitter/X links`);
    }

    // Display error summary if any
    if (errors.length > 0) {
        console.log('\n⚠️  Errors encountered:');
        errors.forEach(e => {
            console.log(`   - ${e.filename}: ${e.error}`);
        });
    }

    console.log('\n✅ All assertions passed!');
    console.log('🎉 Workflow Pipeline E2E Test (ZipFileProducer) completed successfully!\n');

    return {
        totalLinks: Bookmarks.length,
        totalsourceUris: linksBySource.size,
        errors: errorCount,
        Bookmarks
    };
}

// Run the test
runWorkflowTest()
    .then(results => {
        console.log('Test completed successfully ✅');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Test failed:', error.message);
        console.error(error);
        process.exit(1);
    });
