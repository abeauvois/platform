/**
 * Consumer: The endpoint of a workflow that processes final output items
 */
export interface IConsumer<T> {
    /**
     * Process/consume a single output item
     * @param item - The item to consume
     */
    consume(item: T): Promise<void>;

    /**
     * Optional: Called before consuming any items
     */
    onStart?(): Promise<void>;

    /**
     * Optional: Called after all items have been consumed
     */
    onComplete?(): Promise<void>;
}
