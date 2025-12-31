import {
    type IWorkflowStep,
    type WorkflowContext,
    type StepResult,
    type ILogger,
    BaseContent,
} from '@platform/platform-domain';
import type { StepFactoryConfig } from '../presets';
import { reportProgress } from './utils/progress';

/**
 * Abstract base class for workflow steps.
 * Provides common functionality:
 * - Empty items guard (skip execution if no items)
 * - Logger access
 * - UserId access and validation
 * - Progress reporting utility
 *
 * Subclasses implement doExecute() with their specific logic.
 */
export abstract class BaseWorkflowStep<T = BaseContent> implements IWorkflowStep<T> {
    abstract readonly name: string;

    constructor(protected readonly config: StepFactoryConfig) {}

    /**
     * Get the logger from config.
     */
    protected get logger(): ILogger {
        return this.config.logger;
    }

    /**
     * Get the userId from config.
     */
    protected get userId(): string | undefined {
        return this.config.userId;
    }

    /**
     * Main execute method - handles common patterns before delegating to doExecute.
     */
    async execute(context: WorkflowContext<T>): Promise<StepResult<T>> {
        // Early return for empty items (unless step opts out)
        if (this.shouldSkipIfEmpty() && context.items.length === 0) {
            return this.emptyResult(context);
        }

        // Delegate to subclass implementation
        return this.doExecute(context);
    }

    /**
     * Subclasses implement this method with their specific logic.
     */
    protected abstract doExecute(context: WorkflowContext<T>): Promise<StepResult<T>>;

    /**
     * Override this to return false if the step should run even with empty items.
     * Default: true (skip if no items).
     */
    protected shouldSkipIfEmpty(): boolean {
        return true;
    }

    /**
     * Returns a standard result for when there are no items to process.
     */
    protected emptyResult(context: WorkflowContext<T>): StepResult<T> {
        return {
            context,
            continue: true,
            message: `No items to ${this.name}`,
        };
    }

    /**
     * Report progress for each item.
     * Wraps the reportProgress utility with step name.
     */
    protected async reportProgress(
        context: WorkflowContext<T>,
        items: T[],
        getResult?: (item: T, index: number) => { success: boolean; error?: string }
    ): Promise<void> {
        await reportProgress(context, items, this.name, getResult);
    }

    /**
     * Get userId or throw if not configured.
     * Use this when userId is required for the operation.
     */
    protected requireUserId(): string {
        if (!this.userId) {
            throw new Error(`userId is required for ${this.name}`);
        }
        return this.userId;
    }
}
