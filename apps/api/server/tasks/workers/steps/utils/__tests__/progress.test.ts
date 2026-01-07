import { describe, test, expect, mock } from 'bun:test';
import { reportProgress } from '../progress';
import type { WorkflowContext, BaseContent } from '@platform/platform-domain';

describe('reportProgress', () => {
    const createMockContext = (onItemProcessed?: WorkflowContext<BaseContent>['onItemProcessed']): WorkflowContext<BaseContent> => ({
        userId: 'test-user',
        items: [],
        updatedIds: new Set(),
        metadata: {},
        onItemProcessed,
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

    test('should not call callback when onItemProcessed is undefined', async () => {
        const context = createMockContext(undefined);
        const items = [createMockItem('https://example.com')];

        // Should not throw
        await reportProgress(context, items, 'test-step');
    });

    test('should call onItemProcessed for each item with correct parameters', async () => {
        const onItemProcessed = mock(() => Promise.resolve());
        const context = createMockContext(onItemProcessed);
        const items = [
            createMockItem('https://example1.com'),
            createMockItem('https://example2.com'),
            createMockItem('https://example3.com'),
        ];

        await reportProgress(context, items, 'test-step');

        expect(onItemProcessed).toHaveBeenCalledTimes(3);

        const calls = onItemProcessed.mock.calls as unknown as Array<[unknown]>;

        // Check first call
        expect(calls[0][0]).toEqual({
            item: items[0],
            index: 0,
            total: 3,
            stepName: 'test-step',
            success: true,
        });

        // Check second call
        expect(calls[1][0]).toEqual({
            item: items[1],
            index: 1,
            total: 3,
            stepName: 'test-step',
            success: true,
        });

        // Check third call
        expect(calls[2][0]).toEqual({
            item: items[2],
            index: 2,
            total: 3,
            stepName: 'test-step',
            success: true,
        });
    });

    test('should use custom getItemResult function when provided', async () => {
        const onItemProcessed = mock(() => Promise.resolve());
        const context = createMockContext(onItemProcessed);
        const items = [
            createMockItem('https://success.com'),
            createMockItem('https://failure.com'),
        ];

        const getItemResult = (item: BaseContent, index: number) => {
            if (index === 1) {
                return { success: false, error: 'Failed to process' };
            }
            return { success: true };
        };

        await reportProgress(context, items, 'test-step', getItemResult);

        expect(onItemProcessed).toHaveBeenCalledTimes(2);

        const calls = onItemProcessed.mock.calls as unknown as Array<[unknown]>;

        // First item: success
        expect(calls[0][0]).toEqual({
            item: items[0],
            index: 0,
            total: 2,
            stepName: 'test-step',
            success: true,
        });

        // Second item: failure with error
        expect(calls[1][0]).toEqual({
            item: items[1],
            index: 1,
            total: 2,
            stepName: 'test-step',
            success: false,
            error: 'Failed to process',
        });
    });

    test('should handle empty items array', async () => {
        const onItemProcessed = mock(() => Promise.resolve());
        const context = createMockContext(onItemProcessed);

        await reportProgress(context, [], 'test-step');

        expect(onItemProcessed).not.toHaveBeenCalled();
    });

    test('should await async onItemProcessed callback', async () => {
        const callOrder: number[] = [];
        const onItemProcessed = mock(async ({ index }: { index: number }) => {
            await new Promise(resolve => setTimeout(resolve, 10));
            callOrder.push(index);
        });
        const context = createMockContext(onItemProcessed);
        const items = [
            createMockItem('https://example1.com'),
            createMockItem('https://example2.com'),
        ];

        await reportProgress(context, items, 'test-step');

        // Should be called in order since we await each call
        expect(callOrder).toEqual([0, 1]);
    });
});
