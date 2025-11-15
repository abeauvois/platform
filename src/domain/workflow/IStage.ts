/**
 * Stage: Transforms data items in the pipeline
 * Each stage receives an item and can output zero, one, or multiple items
 */
export interface IStage<TInput, TOutput> {
    /**
     * Process an input item and yield transformed output items
     * Can yield multiple items (one-to-many), filter items (one-to-zero), or transform (one-to-one)
     * 
     * @param item - The input item to process
     * @returns AsyncIterable of transformed items
     */
    process(item: TInput): AsyncIterable<TOutput>;
}
