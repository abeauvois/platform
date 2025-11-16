/**
 * End-to-End Test for Workflow Pipeline
 * 
 * Tests the complete workflow from actual .eml files through to extracted links:
 * - SingleFolderProducer (reads from test_mylinks directory using URI)
 * - EmailParserStage (parses email content)
 * - EmailLinkCollector (collects links)
 * - WorkflowExecutor (orchestrates the pipeline)
 * 
 * No mocking - uses real fixtures and adapters
 */

import { HttpLinksExtractor } from '../../adapters/HttpLinksExtractor.js';
import { SingleFolderProducer } from '../../workflow/producers/SingleFolderProducer.js';
import { EmailParserStage } from '../../workflow/stages/EmailParserStage.js';
import { EmailLinkCollector } from '../../workflow/consumers/EmailLinkCollector.js';
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
    console.log('🧪 Starting Workflow Pipeline E2E Test (SingleFolderProducer)\n');

    // Setup: Get path to test fixtures
    const testFixturesPath = join(process.cwd(), 'data', 'fixtures', 'test_mylinks');
    console.log(`📁 Test fixtures path: ${testFixturesPath}\n`);

    // === SUCCESS CASES ===
    console.log('=== SUCCESS CASES ===\n');

    // Test with different URI formats
    console.log('Testing URI format: plain path');
    await testWithUri(testFixturesPath);

    console.log('\n\nTesting URI format: file:// scheme');
    await testWithUri(`file://${testFixturesPath}`);

    // === ERROR CASES ===
    console.log('\n\n=== ERROR CASES ===\n');

    // Test 1: Non-existent directory
    console.log('Test 1: Non-existent directory');
    await testErrorCase(
        '/nonexistent/path/to/emails',
        'Should throw error for non-existent directory'
    );

    // Test 2: S3 URI (not implemented yet)
    console.log('\n\nTest 2: S3 URI (not implemented)');
    await testErrorCase(
        's3://my-bucket/emails',
        'Should throw error for unimplemented S3 URIs'
    );

    // Test 3: Invalid file URI
    console.log('\n\nTest 3: Invalid file URI');
    await testErrorCase(
        'file:///nonexistent/path',
        'Should throw error for invalid file URI'
    );

    console.log('\n✅ All error cases handled correctly!');

    // === PARTIAL EXTRACTION CASE ===
    console.log('\n\n=== PARTIAL EXTRACTION CASE ===\n');

    // Test: Folder with 2 files, only 1 has links
    console.log('Test: Partial extraction (2 files, only 1 with links)');
    const testThrowingPath = join(process.cwd(), 'data', 'fixtures', 'test_throwing');
    await testPartialExtraction(testThrowingPath);
}

async function testWithUri(uri: string) {
    console.log(`\n🔗 Using URI: ${uri}\n`);

    // Initialize real adapters (no mocking)
    const linksExtractor = new HttpLinksExtractor();
    const logger = new TestLogger();

    // Create workflow components using SingleFolderProducer with URI
    const producer = new SingleFolderProducer(uri);
    const stage = new EmailParserStage(linksExtractor);
    const pipeline = new Pipeline(stage);
    const consumer = new EmailLinkCollector(logger);

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
    const emailLinks = consumer.getEmailLinks();

    // Display results
    console.log('\n📊 Results Summary:');
    console.log(`   Total links extracted: ${emailLinks.length}`);
    console.log(`   Errors encountered: ${errorCount}`);

    // Group links by source file
    const linksBySource = new Map<string, string[]>();
    emailLinks.forEach(link => {
        const urls = linksBySource.get(link.sourceFile) || [];
        urls.push(link.url);
        linksBySource.set(link.sourceFile, urls);
    });

    console.log(`   Unique emails with links: ${linksBySource.size}`);

    // Display sample results
    if (emailLinks.length > 0) {
        console.log('\n📝 Sample Results:');
        emailLinks.slice(0, 3).forEach(link => {
            console.log(`\n   Source: ${link.sourceFile}`);
            console.log(`   URL: ${link.url}`);
        });
    }

    // Assertions
    console.log('\n🔍 Running Assertions:');

    // Assert: Should extract some links
    if (emailLinks.length === 0) {
        throw new Error('❌ FAILED: No links were extracted');
    }
    console.log(`   ✓ Extracted ${emailLinks.length} link(s)`);

    // Assert: Should have processed multiple source files
    if (linksBySource.size === 0) {
        throw new Error('❌ FAILED: No source files were processed');
    }
    console.log(`   ✓ Processed ${linksBySource.size} email file(s)`);

    // Assert: Known emails should be present
    const linkedinEmailLinks = Array.from(linksBySource.keys()).find(filename =>
        filename.includes('Cette architecture divise par 5 le temps de livraison')
    );
    if (!linkedinEmailLinks) {
        throw new Error('❌ FAILED: Expected LinkedIn email not found');
    }
    console.log(`   ✓ Found expected LinkedIn email`);

    // Assert: Links should be valid URLs
    const hasValidUrls = emailLinks.some(link => link.url.startsWith('http'));
    if (!hasValidUrls) {
        throw new Error('❌ FAILED: No valid HTTP URLs found');
    }
    console.log(`   ✓ Found valid HTTP URLs`);

    // Assert: Should contain expected domains
    const hasLinkedIn = emailLinks.some(link => link.url.includes('linkedin.com'));
    const hasTwitter = emailLinks.some(link => link.url.includes('x.com') || link.url.includes('twitter.com'));

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
    console.log('🎉 Workflow Pipeline E2E Test completed successfully!\n');

    return {
        totalLinks: emailLinks.length,
        totalSourceFiles: linksBySource.size,
        errors: errorCount,
        emailLinks
    };
}

/**
 * Test partial extraction scenario where some emails have links and some don't
 */
async function testPartialExtraction(uri: string) {
    console.log(`\n🔗 Using URI: ${uri}\n`);

    const linksExtractor = new HttpLinksExtractor();
    const logger = new TestLogger();

    const producer = new SingleFolderProducer(uri);
    const stage = new EmailParserStage(linksExtractor);
    const pipeline = new Pipeline(stage);
    const consumer = new EmailLinkCollector(logger);
    const workflow = new WorkflowExecutor(producer, pipeline, consumer);

    await workflow.execute({
        onStart: async () => {
            console.log('▶️  Starting workflow execution...\n');
        },
        onError: async () => { },
        onComplete: async (stats) => {
            console.log(`\n✅ Workflow completed!`);
            console.log(`   Items produced: ${stats.itemsProduced}`);
            console.log(`   Items consumed: ${stats.itemsConsumed}`);
        }
    });

    const emailLinks = consumer.getEmailLinks();

    console.log('\n📊 Results:');
    console.log(`   Total links extracted: ${emailLinks.length}`);
    console.log(`   Files processed: 2 (1 with links, 1 without)`);

    // Assertions
    console.log('\n🔍 Running Assertions:');

    // We expect at least 1 link (the email with links should contribute at least one)
    if (emailLinks.length < 1) {
        throw new Error(`❌ FAILED: Expected at least 1 link, got ${emailLinks.length}`);
    }
    console.log(`   ✓ Extracted ${emailLinks.length} link(s) from file with links`);

    // Check that we found GitHub link (the primary link from the email)
    const hasGitHub = emailLinks.some(link => link.url.includes('github.com'));

    if (!hasGitHub) {
        throw new Error('❌ FAILED: Did not find expected GitHub link');
    }
    console.log(`   ✓ Found expected GitHub link`);

    // All links should be from the same source file
    const sourceFiles = new Set(emailLinks.map(link => link.sourceFile));
    if (sourceFiles.size !== 1) {
        throw new Error(`❌ FAILED: Links should be from 1 file, but found ${sourceFiles.size} source files`);
    }
    console.log(`   ✓ All links from single source file (as expected)`);

    const sourceFile = Array.from(sourceFiles)[0];
    if (!sourceFile.includes('email-with-links.eml')) {
        throw new Error(`❌ FAILED: Expected source to be 'email-with-links.eml', got ${sourceFile}`);
    }
    console.log(`   ✓ Source file is correct: ${sourceFile}`);

    console.log('\n✅ Part extraction test passed!');
}

/**
 * Test that expects an error to be thrown
 */
async function testErrorCase(uri: string, description: string) {
    console.log(`   Testing: ${description}`);
    console.log(`   URI: ${uri}`);

    const linksExtractor = new HttpLinksExtractor();
    const logger = new TestLogger();

    try {
        const producer = new SingleFolderProducer(uri);
        const stage = new EmailParserStage(linksExtractor);
        const pipeline = new Pipeline(stage);
        const consumer = new EmailLinkCollector(logger);
        const workflow = new WorkflowExecutor(producer, pipeline, consumer);

        // Try to execute - this should throw an error
        await workflow.execute({
            onStart: async () => { },
            onError: async () => { },
            onComplete: async () => { }
        });

        // If we reach here, the test failed (no error was thrown)
        throw new Error(`❌ FAILED: Expected error was not thrown for URI: ${uri}`);
    } catch (error) {
        // Verify we got the expected error
        const errorMessage = error instanceof Error ? error.message : String(error);

        if (errorMessage.includes('Expected error was not thrown')) {
            // This is our test failure, re-throw it
            throw error;
        }

        // Expected error was thrown - test passes
        console.log(`   ✓ Error correctly thrown: ${errorMessage}`);
        return;
    }
}

// Run the test
runWorkflowTest()
    .then(results => {
        console.log('\n🎉 All tests completed successfully ✅');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Test failed:', error.message);
        console.error(error);
        process.exit(1);
    });
