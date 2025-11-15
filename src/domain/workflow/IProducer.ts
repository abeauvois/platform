/**
 * Producer: Generates a stream of data items
 * This is the starting point of any workflow
 */
export interface IProducer<T> {
    /**
     * Produces an async iterable stream of items
     */
    produce(): AsyncIterable<T>;
}
