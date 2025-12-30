/**
 * Generic context passed through workflow steps
 * @typeParam T - The type of items being processed in the workflow
 */
export interface WorkflowContext<T> {
    userId: string;
    /** Source path for input (e.g., zip file or directory) */
    sourcePath?: string;
    /** Output path for export */
    outputPath?: string;
    /** Items being processed */
    items: T[];
    /** IDs of items that were updated during processing */
    updatedIds: Set<string>;
    /** Metadata for tracking workflow state */
    metadata: Record<string, unknown>;
    /** Callback when an item is processed (set by WorkflowBuilder) */
    onItemProcessed?: (info: ItemProcessedInfo<T>) => Promise<void> | void;
}

/**
 * Information about a processed item
 * @typeParam T - The type of item that was processed
 */
export interface ItemProcessedInfo<T> {
    /** The processed item */
    item: T;
    /** Index of the item (0-based) */
    index: number;
    /** Total number of items being processed */
    total: number;
    /** Name of the step that processed the item */
    stepName: string;
    /** Whether the item was processed successfully */
    success: boolean;
    /** Error message if processing failed */
    error?: string;
}

/**
 * Result of a workflow step execution
 * @typeParam T - The type of items being processed in the workflow
 */
export interface StepResult<T> {
    /** Updated context after step execution */
    context: WorkflowContext<T>;
    /** Whether to continue to next step */
    continue: boolean;
    /** Optional message describing what happened */
    message?: string;
}

/**
 * Interface for composable workflow steps
 * Each step receives context, performs work, and returns updated context
 * @typeParam T - The type of items being processed in the workflow
 */
export interface IWorkflowStep<T> {
    /** Unique name for this step */
    readonly name: string;

    /**
     * Execute this workflow step
     * @param context Current workflow context
     * @returns Updated context and continuation flag
     */
    execute(context: WorkflowContext<T>): Promise<StepResult<T>>;
}

/**
 * Create an initial workflow context
 * @typeParam T - The type of items being processed in the workflow
 */
export function createWorkflowContext<T>(
    userId: string,
    sourcePath?: string,
    outputPath?: string
): WorkflowContext<T> {
    return {
        userId,
        sourcePath,
        outputPath,
        items: [],
        updatedIds: new Set(),
        metadata: {},
    };
}
