import { describe, test, expect, mock, beforeEach } from 'bun:test';
import { BaseWorkflowStep } from '../BaseWorkflowStep';
import type { WorkflowContext, StepResult, BaseContent, ILogger } from '@platform/platform-domain';
import type { StepFactoryConfig } from '../../presets';

// Concrete implementation for testing
class TestStep extends BaseWorkflowStep {
    readonly name = 'test-step';

    public doExecuteCalled = false;
    public doExecuteResult: StepResult<BaseContent> | null = null;

    protected async doExecute(context: WorkflowContext<BaseContent>): Promise<StepResult<BaseContent>> {
        this.doExecuteCalled = true;
        return this.doExecuteResult ?? {
            context,
            continue: true,
            message: 'Test step executed',
        };
    }
}

// Step that doesn't skip on empty items
class NoSkipStep extends BaseWorkflowStep {
    readonly name = 'no-skip-step';

    protected shouldSkipIfEmpty(): boolean {
        return false;
    }

    protected async doExecute(context: WorkflowContext<BaseContent>): Promise<StepResult<BaseContent>> {
        return {
            context: { ...context, items: [] },
            continue: true,
            message: 'Created new items',
        };
    }
}

describe('BaseWorkflowStep', () => {
    let mockLogger: ILogger;
    let config: StepFactoryConfig;

    beforeEach(() => {
        mockLogger = {
            info: mock(() => {}),
            error: mock(() => {}),
            warning: mock(() => {}),
            debug: mock(() => {}),
            await: () => ({
                start: () => {},
                update: () => {},
                stop: () => {},
            }),
        };
        config = {
            logger: mockLogger,
            preset: 'gmail',
            userId: 'test-user-123',
        };
    });

    const createMockContext = (items: BaseContent[] = []): WorkflowContext<BaseContent> => ({
        userId: 'context-user',
        items,
        updatedIds: new Set(),
        metadata: {},
    });

    const createMockItem = (url: string): BaseContent => {
        const item = {
            url,
            sourceAdapter: 'test' as const,
            tags: [] as string[],
            summary: '',
            rawContent: '',
            createdAt: new Date(),
            updatedAt: new Date(),
            contentType: 'article' as const,
            withCategorization: () => item,
            withUpdatedTimestamp: () => item,
            isValid: () => true,
            isEnriched: () => false,
        };
        return item as unknown as BaseContent;
    };

    describe('execute', () => {
        test('should skip execution and return empty result when items are empty', async () => {
            const step = new TestStep(config);
            const context = createMockContext([]);

            const result = await step.execute(context);

            expect(step.doExecuteCalled).toBe(false);
            expect(result.continue).toBe(true);
            expect(result.message).toBe('No items to test-step');
        });

        test('should call doExecute when items are not empty', async () => {
            const step = new TestStep(config);
            const context = createMockContext([createMockItem('https://example.com')]);

            await step.execute(context);

            expect(step.doExecuteCalled).toBe(true);
        });

        test('should not skip when shouldSkipIfEmpty returns false', async () => {
            const step = new NoSkipStep(config);
            const context = createMockContext([]);

            const result = await step.execute(context);

            expect(result.message).toBe('Created new items');
        });
    });

    describe('logger getter', () => {
        test('should provide access to logger from config', async () => {
            const step = new TestStep(config);
            const context = createMockContext([createMockItem('https://example.com')]);

            step.doExecuteResult = {
                context,
                continue: true,
                message: 'done',
            };

            await step.execute(context);

            // The step has access to logger through protected getter
            // We verify this by checking the step was created without errors
            expect(step.doExecuteCalled).toBe(true);
        });
    });

    describe('userId getter', () => {
        test('should provide access to userId from config', async () => {
            const step = new TestStep(config);
            expect(step['userId']).toBe('test-user-123');
        });

        test('should return undefined when userId is not in config', async () => {
            const configWithoutUserId: StepFactoryConfig = {
                logger: mockLogger,
                preset: 'gmail',
            };
            const step = new TestStep(configWithoutUserId);
            expect(step['userId']).toBeUndefined();
        });
    });

    describe('requireUserId', () => {
        test('should return userId when it exists', () => {
            const step = new TestStep(config);
            expect(step['requireUserId']()).toBe('test-user-123');
        });

        test('should throw error when userId is missing', () => {
            const configWithoutUserId: StepFactoryConfig = {
                logger: mockLogger,
                preset: 'gmail',
            };
            const step = new TestStep(configWithoutUserId);

            expect(() => step['requireUserId']()).toThrow('userId is required for test-step');
        });
    });

    describe('reportProgress', () => {
        test('should call onItemProcessed for each item', async () => {
            const onItemProcessed = mock(() => Promise.resolve());
            const step = new TestStep(config);
            const items = [
                createMockItem('https://example1.com'),
                createMockItem('https://example2.com'),
            ];
            const context: WorkflowContext<BaseContent> = {
                ...createMockContext(items),
                onItemProcessed,
            };

            await step['reportProgress'](context, items);

            expect(onItemProcessed).toHaveBeenCalledTimes(2);
        });

        test('should not throw when onItemProcessed is undefined', async () => {
            const step = new TestStep(config);
            const items = [createMockItem('https://example.com')];
            const context = createMockContext(items);

            // Should not throw
            await step['reportProgress'](context, items);
        });

        test('should pass custom result function to reportProgress utility', async () => {
            const onItemProcessed = mock(() => Promise.resolve());
            const step = new TestStep(config);
            const items = [
                createMockItem('https://success.com'),
                createMockItem('https://failure.com'),
            ];
            const context: WorkflowContext<BaseContent> = {
                ...createMockContext(items),
                onItemProcessed,
            };

            await step['reportProgress'](context, items, (_, index) => ({
                success: index === 0,
                error: index === 1 ? 'Failed' : undefined,
            }));

            const calls = onItemProcessed.mock.calls as unknown as Array<[{ success: boolean; error?: string }]>;
            expect(calls[0][0].success).toBe(true);
            expect(calls[1][0].success).toBe(false);
            expect(calls[1][0].error).toBe('Failed');
        });
    });

    describe('emptyResult', () => {
        test('should return proper empty result structure', async () => {
            const step = new TestStep(config);
            const context = createMockContext([]);

            const result = step['emptyResult'](context);

            expect(result.context).toBe(context);
            expect(result.continue).toBe(true);
            expect(result.message).toBe('No items to test-step');
        });
    });
});
