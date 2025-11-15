import { IStage } from './IStage.js';

/**
 * Pipeline: Chains multiple stages together to create a data transformation pipeline
 */
export class Pipeline<TInput, TOutput> {
    private stages: IStage<any, any>[] = [];

    /**
     * Create a pipeline with an initial stage
     */
    constructor(initialStage?: IStage<TInput, any>) {
        if (initialStage) {
            this.stages.push(initialStage);
        }
    }

    /**
     * Add a stage to the pipeline
     */
    addStage<TNext>(stage: IStage<any, TNext>): Pipeline<TInput, TNext> {
        this.stages.push(stage);
        return this as any;
    }

    /**
     * Execute the pipeline on an input item
     * Each stage processes items from the previous stage
     */
    async *execute(item: TInput): AsyncIterable<TOutput> {
        // Start with a single item
        let currentStream = this.wrapInGenerator(item);

        // Pass through each stage
        for (const stage of this.stages) {
            currentStream = this.applyStage(currentStream, stage);
        }

        // Yield final results
        yield* currentStream as AsyncIterable<TOutput>;
    }

    /**
     * Helper: Wrap a single item in an async generator
     */
    private async *wrapInGenerator<T>(item: T): AsyncIterable<T> {
        yield item;
    }

    /**
     * Helper: Apply a stage to a stream of items
     */
    private async *applyStage<TIn, TOut>(
        stream: AsyncIterable<TIn>,
        stage: IStage<TIn, TOut>
    ): AsyncIterable<TOut> {
        for await (const item of stream) {
            yield* stage.process(item);
        }
    }

    /**
     * Get the number of stages in the pipeline
     */
    getStageCount(): number {
        return this.stages.length;
    }
}
