import { IConsumer } from '../../../domain/workflow/IConsumer.js';
import { EmailLink } from '../../../domain/entities/EmailLink.js';
import { ILogger } from '../../../domain/ports/ILogger.js';

/**
 * Consumer: Collects EmailLink objects and logs them
 */
export class EmailLinkCollector implements IConsumer<EmailLink> {
    private emailLinks: EmailLink[] = [];

    constructor(
        private readonly logger: ILogger
    ) { }

    async onStart(): Promise<void> {
        this.emailLinks = [];
        this.logger.info('\n🔍 Parsing emails and extracting links...');
    }

    async consume(emailLink: EmailLink): Promise<void> {
        this.emailLinks.push(emailLink);
        this.logger.info(`  📧 ${emailLink.sourceFile.slice(0, 80)}: ${emailLink.url.slice(0, 50)}`);
    }

    async onComplete(): Promise<void> {
        this.logger.info(`\n✅ Extracted ${this.emailLinks.length} links`);
    }

    /**
     * Get all collected email links
     */
    getEmailLinks(): EmailLink[] {
        return [...this.emailLinks];
    }
}
