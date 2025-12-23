import { test, expect, describe, afterEach } from 'bun:test';
import { join } from 'node:path';
import { existsSync, unlinkSync } from 'node:fs';
import { LinkExtractionBuilder, LinkExtractionDependencies } from '../../../application/workflows/LinkExtractionBuilder';
import { WorkflowPresets } from '../../../application/workflows/presets';
import { ZipEmlFilesBookmarksWorkflowService } from '../../../application/services/ZipEmlFilesBookmarksWorkflowService';
import { RetryHandlerService } from '../../../application/services/RetryHandlerService';
import { ExportService } from '../../../application/services/ExportService';
import { DirectoryReader } from '../../adapters/DirectoryReader';
import { CsvFileWriter } from '../../adapters/CsvFileWriter';
import { ConsoleLogger } from './ConsoleLogger';
import type { IContentAnalyser, TagsAndSummary } from '../../../domain/ports/IContentAnalyser';
import type { ITwitterClient } from '../../../domain/ports/ITwitterClient';
import type { ILinkRepository } from '../../../domain/ports/ILinkRepository';
import { Bookmark } from '../../../domain/entities/Bookmark';

/**
 * Stub content analyser for integration tests
 * Returns predictable results without calling external APIs
 */
class StubContentAnalyser implements IContentAnalyser {
    async analyze(url: string, additionalContext?: string): Promise<TagsAndSummary> {
        return {
            tags: ['integration-test', 'stub'],
            summary: `Stub analysis for: ${url.substring(0, 50)}...`,
        };
    }
}

/**
 * Stub Twitter client for integration tests
 * Returns predictable results without calling Twitter API
 */
class StubTwitterClient implements ITwitterClient {
    async fetchTweetContent(url: string): Promise<string | null> {
        if (url.includes('twitter.com') || url.includes('x.com')) {
            return `Stub tweet content for ${url}`;
        }
        return null;
    }

    getRateLimitResetTime(): number {
        return 0;
    }

    isRateLimited(): boolean {
        return false;
    }

    clearRateLimit(): void {}
}

/**
 * Stub Notion repository for integration tests
 * Stores items in memory without calling Notion API
 */
class StubNotionRepository implements ILinkRepository {
    public items: Bookmark[] = [];

    async exists(url: string): Promise<boolean> {
        return this.items.some(b => b.url === url);
    }

    async save(bookmark: Bookmark): Promise<Bookmark> {
        this.items.push(bookmark);
        return bookmark;
    }

    async saveMany(links: Bookmark[]): Promise<Bookmark[]> {
        this.items.push(...links);
        return links;
    }

    async findByUrl(url: string): Promise<Bookmark | null> {
        return this.items.find(b => b.url === url) || null;
    }

    async findById(id: string): Promise<Bookmark | null> {
        return this.items.find(b => b.id === id) || null;
    }

    async findAll(): Promise<Bookmark[]> {
        return this.items;
    }

    async findByUserId(userId: string): Promise<Bookmark[]> {
        return this.items.filter(b => b.userId === userId);
    }

    async update(id: string, userId: string, updates: Partial<Bookmark>): Promise<Bookmark | null> {
        const index = this.items.findIndex(b => b.id === id && b.userId === userId);
        if (index >= 0) {
            this.items[index] = { ...this.items[index], ...updates } as Bookmark;
            return this.items[index];
        }
        return null;
    }

    async delete(id: string, userId: string): Promise<boolean> {
        const index = this.items.findIndex(b => b.id === id && b.userId === userId);
        if (index >= 0) {
            this.items.splice(index, 1);
            return true;
        }
        return false;
    }

    async clear(): Promise<void> {
        this.items = [];
    }
}

/**
 * Create dependencies for integration tests
 * Uses real infrastructure components where possible, stubs for external APIs
 */
function createIntegrationDependencies(logger: ConsoleLogger): {
    deps: LinkExtractionDependencies;
    notionRepo: StubNotionRepository;
} {
    // Real infrastructure components
    const directoryReader = new DirectoryReader();
    const csvWriter = new CsvFileWriter();

    // Stub components for external services
    const linkAnalyzer = new StubContentAnalyser();
    const tweetClient = new StubTwitterClient();
    const notionRepo = new StubNotionRepository();

    // Application services with real and stub components
    const extractionService = new ZipEmlFilesBookmarksWorkflowService(
        directoryReader,
        linkAnalyzer,
        logger
    );
    const retryHandler = new RetryHandlerService(tweetClient, linkAnalyzer, logger);
    const exportService = new ExportService(csvWriter, notionRepo, logger);

    return {
        deps: {
            extractionService,
            linkAnalyzer,
            tweetClient,
            retryHandler,
            exportService,
            logger,
        },
        notionRepo,
    };
}

describe('Link Extraction Workflow Integration Tests', () => {
    const logger = new ConsoleLogger();
    const fixturesPath = join(__dirname, '../../../../data/fixtures');
    const testOutputPath = join(__dirname, '../../../../data/fixtures/test_workflow_output.csv');

    afterEach(() => {
        if (existsSync(testOutputPath)) {
            unlinkSync(testOutputPath);
        }
    });

    describe('LinkExtractionBuilder with real components', () => {
        test('should extract bookmarks from directory with .eml files', async () => {
            const { deps } = createIntegrationDependencies(logger);
            const inputPath = join(fixturesPath, 'test_mylinks_no_twitter');

            const workflow = new LinkExtractionBuilder(deps)
                .extract()
                .exportTo({ csv: true, notion: false })
                .build();

            await workflow.execute(inputPath, testOutputPath);

            expect(existsSync(testOutputPath)).toBe(true);
            console.log(`✅ Workflow exported bookmarks to ${testOutputPath}`);
        });

        test('should extract bookmarks from zip file', async () => {
            const { deps } = createIntegrationDependencies(logger);
            const inputPath = join(fixturesPath, 'test_mylinks.zip');

            const workflow = new LinkExtractionBuilder(deps)
                .extract()
                .exportTo({ csv: true, notion: false })
                .build();

            await workflow.execute(inputPath, testOutputPath);

            expect(existsSync(testOutputPath)).toBe(true);
            console.log(`✅ Workflow extracted bookmarks from zip file`);
        });

        test('should run full workflow with analysis step', async () => {
            const { deps } = createIntegrationDependencies(logger);
            const inputPath = join(fixturesPath, 'test_mylinks_no_twitter');

            const workflow = new LinkExtractionBuilder(deps)
                .extract()
                .analyze()
                .exportTo({ csv: true, notion: false })
                .build();

            await workflow.execute(inputPath, testOutputPath);

            expect(existsSync(testOutputPath)).toBe(true);
            console.log(`✅ Full workflow with analysis completed`);
        });

        test('should export to both CSV and Notion repository', async () => {
            const { deps, notionRepo } = createIntegrationDependencies(logger);
            const inputPath = join(fixturesPath, 'test_mylinks_no_twitter');

            const workflow = new LinkExtractionBuilder(deps)
                .extract()
                .exportTo({ csv: true, notion: true })
                .build();

            await workflow.execute(inputPath, testOutputPath);

            expect(existsSync(testOutputPath)).toBe(true);
            expect(notionRepo.items.length).toBeGreaterThan(0);
            console.log(`✅ Exported to CSV and ${notionRepo.items.length} items to Notion repository`);
        });

        test('should use conditional steps with when()', async () => {
            const { deps } = createIntegrationDependencies(logger);
            const inputPath = join(fixturesPath, 'test_mylinks_no_twitter');
            const skipAnalysis = true;
            const skipTwitter = true;

            const workflow = new LinkExtractionBuilder(deps)
                .extract()
                .when(!skipAnalysis, b => b.analyze())
                .when(!skipTwitter, b => b.enrichTwitter().withRetry())
                .exportTo({ csv: true, notion: false })
                .build();

            await workflow.execute(inputPath, testOutputPath);

            expect(existsSync(testOutputPath)).toBe(true);
            console.log(`✅ Conditional workflow executed with skipped steps`);
        });
    });

    describe('Workflow presets', () => {
        test('should execute quick preset', async () => {
            const { deps } = createIntegrationDependencies(logger);
            const inputPath = join(fixturesPath, 'test_mylinks_no_twitter');

            const workflow = WorkflowPresets.quick(deps);

            await workflow.execute(inputPath, testOutputPath);

            expect(existsSync(testOutputPath)).toBe(true);
            console.log(`✅ Quick preset executed successfully`);
        });

        test('should execute csvOnly preset', async () => {
            const { deps } = createIntegrationDependencies(logger);
            const inputPath = join(fixturesPath, 'test_mylinks_no_twitter');

            const workflow = WorkflowPresets.csvOnly(deps);

            await workflow.execute(inputPath, testOutputPath);

            expect(existsSync(testOutputPath)).toBe(true);
            console.log(`✅ CSV-only preset executed successfully`);
        });

        test('should execute analyzeOnly preset', async () => {
            const { deps, notionRepo } = createIntegrationDependencies(logger);
            const inputPath = join(fixturesPath, 'test_mylinks_no_twitter');

            const workflow = WorkflowPresets.analyzeOnly(deps);

            await workflow.execute(inputPath, testOutputPath);

            expect(existsSync(testOutputPath)).toBe(true);
            expect(notionRepo.items.length).toBeGreaterThan(0);
            console.log(`✅ Analyze-only preset executed with ${notionRepo.items.length} items`);
        });
    });

    describe('Error handling', () => {
        test('should throw error for non-existent input path', async () => {
            const { deps } = createIntegrationDependencies(logger);
            const nonExistentPath = join(fixturesPath, 'does-not-exist');

            const workflow = new LinkExtractionBuilder(deps)
                .extract()
                .exportTo({ csv: true, notion: false })
                .build();

            await expect(workflow.execute(nonExistentPath, testOutputPath)).rejects.toThrow();
            console.log(`✅ Correctly throws error for non-existent path`);
        });

        test('should handle empty directory gracefully', async () => {
            const { deps } = createIntegrationDependencies(logger);
            const emptyPath = join(fixturesPath, 'test_throwing');

            const workflow = new LinkExtractionBuilder(deps)
                .extract()
                .exportTo({ csv: true, notion: false })
                .build();

            // Should complete without error (may produce 0 items)
            await workflow.execute(emptyPath, testOutputPath);
            console.log(`✅ Empty directory handled gracefully`);
        });
    });

    describe('Real file operations', () => {
        test('should create valid CSV output file', async () => {
            const { deps } = createIntegrationDependencies(logger);
            const inputPath = join(fixturesPath, 'test_mylinks_no_twitter');

            const workflow = new LinkExtractionBuilder(deps)
                .extract()
                .exportTo({ csv: true, notion: false })
                .build();

            await workflow.execute(inputPath, testOutputPath);

            expect(existsSync(testOutputPath)).toBe(true);

            // Verify CSV content
            const csvContent = await Bun.file(testOutputPath).text();
            expect(csvContent.length).toBeGreaterThan(0);
            expect(csvContent).toContain('url'); // Should have header
            console.log(`✅ Valid CSV file created with ${csvContent.split('\n').length - 1} data rows`);
        });

        test('should process multiple email files from directory', async () => {
            const { deps, notionRepo } = createIntegrationDependencies(logger);
            const inputPath = join(fixturesPath, 'test_mylinks');

            const workflow = new LinkExtractionBuilder(deps)
                .extract()
                .exportTo({ csv: true, notion: true })
                .build();

            await workflow.execute(inputPath, testOutputPath);

            expect(existsSync(testOutputPath)).toBe(true);
            expect(notionRepo.items.length).toBeGreaterThan(0);
            console.log(`✅ Processed ${notionRepo.items.length} bookmarks from test_mylinks directory`);
        });
    });
});
