import { IConsumer } from './IConsumer.js';
import { IProducer } from './IProducer.js';
import { Pipeline } from './Pipeline.js';

/**
 * Error handler function type for workflow errors
 */
export type ErrorHandler<T> = (error: Error, item: T) => Promise<void>;

/**
 * Options for workflow execution
 */
export interface WorkflowOptions<T> {
    /**
     * Error handler for processing errors
     * If not provided, errors will stop the workflow
     */
    onError?: ErrorHandler<T>;

    /**
     * Called when workflow starts
     */
    onStart?(): Promise<void>;

    /**
     * Called when workflow completes (success or failure)
     */
    onComplete?(stats: WorkflowStats): Promise<void>;
}

/**
 * Statistics about workflow execution
 */
export interface WorkflowStats {
    itemsProduced: number;
    itemsProcessed: number;
    itemsConsumed: number;
    errors: number;
}

/**
 * WorkflowExecutor: Orchestrates the complete workflow
 * Producer → Pipeline → Consumer with error handling
 */
export class WorkflowExecutor<TInput, TOutput> {
    constructor(
        private readonly producer: IProducer<TInput>,
        private readonly pipeline: Pipeline<TInput, TOutput>,
        private readonly consumer: IConsumer<TOutput>
    ) { }

    /**
     * Execute the complete workflow
     * @param options - Optional workflow configuration
     */
    async execute(options?: WorkflowOptions<TInput>): Promise<WorkflowStats> {
        const stats: WorkflowStats = {
            itemsProduced: 0,
            itemsProcessed: 0,
            itemsConsumed: 0,
            errors: 0,
        };

        try {
            // Notify start
            if (options?.onStart) {
                await options.onStart();
            }

            // Call consumer start hook
            if (this.consumer.onStart) {
                await this.consumer.onStart();
            }

            // Process items from producer through pipeline to consumer
            for await (const item of this.producer.produce()) {
                stats.itemsProduced++;

                try {
                    // Execute pipeline on the item
                    for await (const result of this.pipeline.execute(item)) {
                        stats.itemsProcessed++;

                        try {
                            await this.consumer.consume(result);
                            stats.itemsConsumed++;
                        } catch (error) {
                            stats.errors++;
                            if (options?.onError) {
                                await options.onError(error as Error, item as TInput);
                            } else {
                                throw error;
                            }
                        }
                    }
                } catch (error) {
                    stats.errors++;
                    if (options?.onError) {
                        await options.onError(error as Error, item as TInput);
                    } else {
                        throw error;
                    }
                }
            }

            // Call consumer complete hook
            if (this.consumer.onComplete) {
                await this.consumer.onComplete();
            }

            // Notify completion
            if (options?.onComplete) {
                await options.onComplete(stats);
            }

            return stats;
        } catch (error) {
            // Final error handler for unhandled errors
            if (options?.onComplete) {
                await options.onComplete(stats);
            }
            throw error;
        }
    }
}
