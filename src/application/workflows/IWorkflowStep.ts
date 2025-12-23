/**
 * Generic context passed through workflow steps
 * @typeParam T - The type of items being processed in the workflow
 */
export interface WorkflowContext<T> {
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
    sourcePath?: string,
    outputPath?: string
): WorkflowContext<T> {
    return {
        sourcePath,
        outputPath,
        items: [],
        updatedIds: new Set(),
        metadata: {},
    };
}
