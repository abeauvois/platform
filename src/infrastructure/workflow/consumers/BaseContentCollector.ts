import { IConsumer } from '../../../domain/workflow/IConsumer.js';
import { BaseContent } from '../../../domain/entities/BaseContent.js';
import { ILogger } from '../../../domain/ports/ILogger.js';

/**
 * Consumer: Collects BaseContent items into an array
 */
export class BaseContentCollector implements IConsumer<BaseContent> {
    private items: BaseContent[] = [];

    constructor(private readonly logger: ILogger) { }

    async onStart(): Promise<void> {
        this.items = [];
        this.logger.debug('📝 Starting to collect items...');
    }

    async consume(item: BaseContent): Promise<void> {
        this.items.push(item);
    }

    async onComplete(): Promise<void> {
        this.logger.debug(`✅ Collected ${this.items.length} items`);
    }

    /**
     * Get all collected items
     */
    getItems(): BaseContent[] {
        return this.items;
    }

    /**
     * Clear collected items
     */
    clear(): void {
        this.items = [];
    }
}
