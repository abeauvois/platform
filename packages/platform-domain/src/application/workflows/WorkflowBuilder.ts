import { ILogger } from '../../domain/ports/ILogger';
import { IWorkflowStep, WorkflowContext, createWorkflowContext, ItemProcessedInfo } from './IWorkflowStep';

/**
 * Statistics about workflow execution
 */
export interface WorkflowExecutionStats {
    /** Total number of steps in the workflow */
    totalSteps: number;
    /** Number of steps successfully completed */
    completedSteps: number;
    /** Names of steps that were executed */
    executedStepNames: string[];
    /** Duration of the workflow execution in milliseconds */
    durationMs: number;
    /** Whether the workflow completed successfully */
    success: boolean;
    /** Number of items processed (from final context) */
    itemsProcessed: number;
}

/**
 * Information passed to the onStart hook
 */
export interface WorkflowStartInfo {
    /** Names of all steps that will be executed */
    stepNames: string[];
    /** Source path for input */
    sourcePath: string;
    /** Output path for export */
    outputPath: string;
}

/**
 * Information passed to the onError hook
 */
export interface WorkflowErrorInfo<T> {
    /** The error that occurred */
    error: Error;
    /** Name of the step where the error occurred */
    stepName: string;
    /** Current workflow context at the time of error */
    context: WorkflowContext<T>;
    /** Index of the step (0-based) */
    stepIndex: number;
}

/**
 * Result of error handler - determines whether to continue or stop
 */
export interface ErrorHandlerResult {
    /** Whether to continue executing the workflow after the error */
    continue: boolean;
    /** Optional replacement context to use if continuing */
    context?: WorkflowContext<unknown>;
}

/**
 * Information passed to the onComplete hook
 */
export interface WorkflowCompleteInfo<T> {
    /** Execution statistics */
    stats: WorkflowExecutionStats;
    /** Final workflow context */
    context: WorkflowContext<T>;
    /** All items that were processed during the workflow */
    processedItems: T[];
}

/**
 * Lifecycle hooks for workflow execution
 */
export interface WorkflowLifecycleHooks<T> {
    /**
     * Called before the first step executes
     * Use for initialization, logging, or setup
     */
    onStart?: (info: WorkflowStartInfo) => Promise<void> | void;

    /**
     * Called when an item is processed within a step
     * Use for progress updates, logging, or real-time feedback to outer apps
     */
    onItemProcessed?: (info: ItemProcessedInfo<T>) => Promise<void> | void;

    /**
     * Called when an error occurs during step execution
     * Return { continue: true } to continue execution, or { continue: false } to stop
     * If not provided, errors will stop the workflow
     */
    onError?: (info: WorkflowErrorInfo<T>) => Promise<ErrorHandlerResult> | ErrorHandlerResult;

    /**
     * Called after the workflow completes (success or failure)
     * Always called, even if an error occurred
     * Provides access to all processed items for display by outer apps (CLI, API, web)
     */
    onComplete?: (info: WorkflowCompleteInfo<T>) => Promise<void> | void;
}

/**
 * Executable workflow that runs a sequence of steps
 * @typeParam T - The type of items being processed in the workflow
 */
export interface IWorkflow<T> {
    /** Execute the workflow */
    execute(userId: string, sourcePath: string, outputPath: string): Promise<void>;
    /** Get the names of steps in this workflow */
    getStepNames(): string[];
}

/**
 * Generic fluent builder for composing workflows
 * @typeParam T - The type of items being processed in the workflow
 *
 * @example
 * ```typescript
 * const workflow = new WorkflowBuilder<MyItem>(logger)
 *     .addStep(new ReadStep())
 *     .addStep(new ProcessStep())
 *     .addStep(new ExportStep())
 *     .build();
 *
 * await workflow.execute(inputPath, outputPath);
 * ```
 */
export class WorkflowBuilder<T> {
    protected steps: IWorkflowStep<T>[] = [];
    protected hooks: WorkflowLifecycleHooks<T> = {};

    constructor(protected readonly logger: ILogger) { }

    /**
     * Register a callback to be called before workflow execution starts
     */
    onStart(callback: WorkflowLifecycleHooks<T>['onStart']): this {
        this.hooks.onStart = callback;
        return this;
    }

    /**
     * Register a callback to be called when an item is processed
     * Use for progress updates and real-time feedback
     */
    onItemProcessed(callback: WorkflowLifecycleHooks<T>['onItemProcessed']): this {
        this.hooks.onItemProcessed = callback;
        return this;
    }

    /**
     * Register a callback to be called when an error occurs
     * Return { continue: true } to continue execution after the error
     */
    onError(callback: WorkflowLifecycleHooks<T>['onError']): this {
        this.hooks.onError = callback;
        return this;
    }

    /**
     * Register a callback to be called after workflow completes
     */
    onComplete(callback: WorkflowLifecycleHooks<T>['onComplete']): this {
        this.hooks.onComplete = callback;
        return this;
    }

    /**
     * Add a workflow step
     */
    addStep(step: IWorkflowStep<T>): this {
        this.steps.push(step);
        return this;
    }

    /**
     * Conditionally add steps
     * @example
     * builder.when(includeAnalysis, b => b.addStep(new BookmarkAnalysisStep()))
     */
    when(condition: boolean, configure: (builder: this) => this): this {
        if (condition) {
            configure(this);
        }
        return this;
    }

    /**
     * Build the workflow
     */
    build(): IWorkflow<T> {
        const steps = [...this.steps];
        const logger = this.logger;
        const hooks = { ...this.hooks };

        return {
            getStepNames: () => steps.map(s => s.name),

            execute: async (userId: string, sourcePath: string, outputPath: string) => {
                const startTime = Date.now();
                let context: WorkflowContext<T> = createWorkflowContext<T>(userId, sourcePath, outputPath);
                const executedStepNames: string[] = [];
                let success = true;

                // Inject onItemProcessed callback into context for steps to use
                if (hooks.onItemProcessed) {
                    context.onItemProcessed = hooks.onItemProcessed;
                }

                // Call onStart hook
                if (hooks.onStart) {
                    await hooks.onStart({
                        stepNames: steps.map(s => s.name),
                        sourcePath,
                        outputPath,
                    });
                }

                logger.info(`\n🚀 Starting workflow with ${steps.length} steps: ${steps.map(s => s.name).join(' → ')}`);

                try {
                    for (let i = 0; i < steps.length; i++) {
                        const step = steps[i];
                        logger.debug(`\n--- Running step: ${step.name} ---`);

                        try {
                            const result = await step.execute(context);
                            context = result.context;
                            executedStepNames.push(step.name);

                            if (result.message) {
                                logger.debug(`Step ${step.name}: ${result.message}`);
                            }

                            if (!result.continue) {
                                logger.warning(`Workflow stopped at step ${step.name}: ${result.message}`);
                                success = false;
                                break;
                            }
                        } catch (error) {
                            // Call onError hook
                            if (hooks.onError) {
                                const errorResult = await hooks.onError({
                                    error: error as Error,
                                    stepName: step.name,
                                    context,
                                    stepIndex: i,
                                });

                                if (errorResult.continue) {
                                    // Update context if provided
                                    if (errorResult.context) {
                                        context = errorResult.context as WorkflowContext<T>;
                                    }
                                    executedStepNames.push(step.name);
                                    continue;
                                }
                            }

                            // Error stops workflow (either no handler or handler said stop)
                            success = false;
                            throw error;
                        }
                    }

                    if (success) {
                        logger.info('\n✅ Workflow complete!');
                    }
                } finally {
                    // Always call onComplete hook with all processed items
                    if (hooks.onComplete) {
                        const stats: WorkflowExecutionStats = {
                            totalSteps: steps.length,
                            completedSteps: executedStepNames.length,
                            executedStepNames,
                            durationMs: Date.now() - startTime,
                            success,
                            itemsProcessed: context.items.length,
                        };
                        await hooks.onComplete({
                            stats,
                            context,
                            processedItems: context.items,
                        });
                    }
                }
            },
        };
    }
}
