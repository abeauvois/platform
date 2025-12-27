export interface BackgroundTaskOptions {
    retryLimit?: number;
    retryDelay?: number;
    retryBackoff?: boolean;
}

export interface IBackgroundTaskRunner {
    submit<T extends object>(taskType: string, payload: T, options?: BackgroundTaskOptions): Promise<string | null>;
}

export interface IIdGenerator {
    generate(prefix: string): string;
}
