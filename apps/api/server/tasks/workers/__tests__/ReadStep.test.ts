/**
 * Unit Tests: ReadStep
 *
 * Tests the read step functionality:
 * 1. Fetches items from source reader
 * 2. Transfers metadata (pendingContentIds, userId) to context
 * 3. Reports progress for each item
 */

import { describe, test, expect } from 'bun:test';
import {
    BaseContent,
    type ILogger,
    type ISourceReader,
    type SourceReaderConfig,
    type WorkflowContext,
} from '@platform/platform-domain';
import { ReadStep } from '../steps/ReadStep';
import type { StepFactoryConfig } from '../presets';

/**
 * Create a test logger
 */
function createTestLogger(): ILogger {
    return {
        info: () => {},
        warning: () => {},
        error: () => {},
        debug: () => {},
        await: () => ({ start: () => {}, update: () => {}, stop: () => {} }),
    };
}

/**
 * Create a test config for ReadStep
 */
function createTestConfig(overrides: Partial<StepFactoryConfig> = {}): StepFactoryConfig {
    return {
        logger: createTestLogger(),
        preset: 'bookmarkEnrichment',
        ...overrides,
    };
}

/**
 * Create a mock source reader that returns items and optionally attaches pendingContentIds
 */
function createMockSourceReader(
    items: BaseContent[],
    pendingContentIds?: Record<string, string>
): ISourceReader {
    return {
        read: async (config: SourceReaderConfig): Promise<BaseContent[]> => {
            // Simulate what PendingContentSourceReader does - attach pendingContentIds to config
            if (pendingContentIds) {
                (config as any).pendingContentIds = pendingContentIds;
            }
            return items;
        },
    };
}

describe('ReadStep', () => {
    test('should have correct step name', () => {
        const config = createTestConfig();
        const step = new ReadStep(config);
        expect(step.name).toBe('read');
    });

    test('should return empty items when no source reader configured', async () => {
        const config = createTestConfig({ sourceReader: undefined });
        const step = new ReadStep(config);

        const context: WorkflowContext<BaseContent> = {
            items: [],
            outputPath: '',
            updatedIds: new Set<string>(),
            metadata: {},
        };

        const result = await step.execute(context);

        expect(result.continue).toBe(true);
        expect(result.context.items).toHaveLength(0);
        expect(result.message).toContain('No source reader configured');
    });

    test('should read items from source reader', async () => {
        const items = [
            new BaseContent('https://example.com/1', 'Gmail', [], '', 'content1'),
            new BaseContent('https://example.com/2', 'Gmail', [], '', 'content2'),
        ];

        const sourceReader = createMockSourceReader(items);
        const config = createTestConfig({ sourceReader });
        const step = new ReadStep(config);

        const context: WorkflowContext<BaseContent> = {
            items: [],
            outputPath: '',
            updatedIds: new Set<string>(),
            metadata: {},
        };

        const result = await step.execute(context);

        expect(result.continue).toBe(true);
        expect(result.context.items).toHaveLength(2);
        expect(result.context.items[0].url).toBe('https://example.com/1');
        expect(result.context.items[1].url).toBe('https://example.com/2');
    });

    test('should transfer pendingContentIds from source reader to context metadata', async () => {
        const items = [
            new BaseContent('https://example.com/1', 'Gmail', [], '', 'content1'),
            new BaseContent('https://example.com/2', 'Gmail', [], '', 'content2'),
        ];

        const pendingContentIds = {
            'https://example.com/1': 'pending-123',
            'https://example.com/2': 'pending-456',
        };

        const sourceReader = createMockSourceReader(items, pendingContentIds);
        const config = createTestConfig({ sourceReader });
        const step = new ReadStep(config);

        const context: WorkflowContext<BaseContent> = {
            items: [],
            outputPath: '',
            updatedIds: new Set<string>(),
            metadata: {},
        };

        const result = await step.execute(context);

        expect(result.continue).toBe(true);
        expect(result.context.metadata.pendingContentIds).toEqual(pendingContentIds);
        expect(result.context.metadata.pendingContentIds['https://example.com/1']).toBe('pending-123');
        expect(result.context.metadata.pendingContentIds['https://example.com/2']).toBe('pending-456');
    });

    test('should transfer userId to context metadata', async () => {
        const items = [new BaseContent('https://example.com/1', 'Gmail', [], '', 'content1')];
        const sourceReader = createMockSourceReader(items);
        const config = createTestConfig({ sourceReader, userId: 'user-abc' });
        const step = new ReadStep(config);

        const context: WorkflowContext<BaseContent> = {
            items: [],
            outputPath: '',
            updatedIds: new Set<string>(),
            metadata: {},
        };

        const result = await step.execute(context);

        expect(result.context.metadata.userId).toBe('user-abc');
    });

    test('should preserve existing metadata when adding new metadata', async () => {
        const items = [new BaseContent('https://example.com/1', 'Gmail', [], '', 'content1')];
        const pendingContentIds = { 'https://example.com/1': 'pending-123' };
        const sourceReader = createMockSourceReader(items, pendingContentIds);
        const config = createTestConfig({ sourceReader, userId: 'user-abc' });
        const step = new ReadStep(config);

        const context: WorkflowContext<BaseContent> = {
            items: [],
            outputPath: '',
            updatedIds: new Set<string>(),
            metadata: { existingKey: 'existingValue' },
        };

        const result = await step.execute(context);

        expect(result.context.metadata.existingKey).toBe('existingValue');
        expect(result.context.metadata.pendingContentIds).toEqual(pendingContentIds);
        expect(result.context.metadata.userId).toBe('user-abc');
    });

    test('should report progress for each item via callback', async () => {
        const items = [
            new BaseContent('https://example.com/1', 'Gmail', [], '', 'content1'),
            new BaseContent('https://example.com/2', 'Gmail', [], '', 'content2'),
        ];
        const sourceReader = createMockSourceReader(items);
        const config = createTestConfig({ sourceReader });
        const step = new ReadStep(config);

        const progressCalls: { index: number; total: number; stepName: string }[] = [];

        const context: WorkflowContext<BaseContent> = {
            items: [],
            outputPath: '',
            updatedIds: new Set<string>(),
            metadata: {},
            onItemProcessed: async (info) => {
                progressCalls.push({ index: info.index, total: info.total, stepName: info.stepName });
            },
        };

        await step.execute(context);

        expect(progressCalls).toHaveLength(2);
        expect(progressCalls[0]).toEqual({ index: 0, total: 2, stepName: 'read' });
        expect(progressCalls[1]).toEqual({ index: 1, total: 2, stepName: 'read' });
    });
});
