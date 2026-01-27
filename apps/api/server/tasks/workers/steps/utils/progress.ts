import type { WorkflowContext } from '@abeauvois/platform-domain';

/**
 * Report progress for each item in the workflow context.
 * Extracts the common progress notification loop used across all workflow steps.
 *
 * @param context - The workflow context containing the onItemProcessed callback
 * @param items - The items to report progress for
 * @param stepName - The name of the current step
 * @param getItemResult - Optional function to get success/error status for each item
 */
export async function reportProgress<T>(
    context: WorkflowContext<T>,
    items: T[],
    stepName: string,
    getItemResult?: (item: T, index: number) => { success: boolean; error?: string }
): Promise<void> {
    if (!context.onItemProcessed) return;

    for (let i = 0; i < items.length; i++) {
        const result = getItemResult?.(items[i], i) ?? { success: true };
        await context.onItemProcessed({
            item: items[i],
            index: i,
            total: items.length,
            stepName,
            ...result,
        });
    }
}
