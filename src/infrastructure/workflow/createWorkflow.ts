import { join } from "path";
import { Logger } from "@poppinss/cliui";
import { EnvConfig } from "../config/EnvConfig";

import { ILogger } from "../../domain/ports/ILogger";
import { FileTimestampRepository } from "../repositories/FileTimestampRepository";
import { GmailClient } from "../adapters/GmailClient";
import { AnthropicClient } from "../adapters/AnthropicClient";

import { GmailBookmarksWorkflowService } from "../../application/services/GmailBookmarksWorkflowService";
import { ZipEmlFilesBookmarksWorkflowService } from "../../application/services/ZipEmlFilesBookmarksWorkflowService";
import { ZipExtractor } from "../adapters/ZipExtractor";
// import { TwitterClient } from "../adapters/TwitterClient";
// import { UrlsBookmarksWorkflowService } from "../../application/services/UrlsBookmarksWorkflowService.wip";

class WorkflowCreator {
    constructor(
        private useCaseName: string,
        private readonly logger: ILogger,
    ) {
        this.useCaseName = useCaseName;
        this.logger = logger;
    }

    async run() {
        const { clientId, clientSecret, refreshToken, filterEmail, anthropicApiKey, /* twitterBearerToken */ } = await this.checkConfig();

        const gmailClient = new GmailClient(clientId, clientSecret, refreshToken, this.logger);
        const anthropicClient = new AnthropicClient(anthropicApiKey, '', this.logger);
        // const twitterClient = new TwitterClient(twitterBearerToken, this.logger);

        const timestampRepository = new FileTimestampRepository('.gmail-last-run');

        switch (this.useCaseName) {
            case "bookmarksFromGmail":
                const gmailWorkflow = new GmailBookmarksWorkflowService(
                    gmailClient,
                    anthropicClient,
                    timestampRepository,
                    filterEmail,
                    this.logger,
                );

                gmailWorkflow.fetchRecentMessages()

                break;
            case "bookmarksFromZipEmlFiles":
                const zipExtractor = new ZipExtractor();
                const zipWorkflow = new ZipEmlFilesBookmarksWorkflowService(
                    zipExtractor,
                    anthropicClient,
                    this.logger,
                );
                // const path = join(__dirname, '../../../data/fixtures/test_mylinks.zip');
                const path = join(__dirname, '../../../data/fixtures/test_mylinks_no_twitter');
                zipWorkflow.extractAndParseEmails(path);
                break;
            // case "bookmarksFromUrl":

            //     const twitterWorkflow = new UrlsBookmarksWorkflowService(
            //         twitterClient,
            //         anthropicClient,
            //         this.logger,
            //     );

            //     twitterWorkflow.processUrls();
            //     break;
            default:
                throw new Error(`Unknown use case: ${this.useCaseName}`);
        }
    }
    async checkConfig() {
        const config = new EnvConfig();
        await config.load();
        const clientId = config.get('GMAIL_CLIENT_ID');
        const clientSecret = config.get('GMAIL_CLIENT_SECRET');
        const refreshToken = config.get('GMAIL_REFRESH_TOKEN');
        const anthropicApiKey = config.get('ANTHROPIC_API_KEY');
        const twitterBearerToken = config.get('TWITTER_BEARER_TOKEN');
        // Get optional filter email from env
        const filterEmail = config.get('MY_EMAIL_ADDRESS');

        if (!clientId || !clientSecret || !refreshToken) {
            throw new Error('Gmail credentials not found in .env file');
            //         p.log.error('Gmail credentials not found in .env file');
            //         p.note(
            //             `Please add the following to your .env file:

            // GMAIL_CLIENT_ID=your_client_id
            // GMAIL_CLIENT_SECRET=your_client_secret
            // GMAIL_REFRESH_TOKEN=your_refresh_token

            // To get these credentials:
            // 1. Go to Google Cloud Console (https://console.cloud.google.com)
            // 2. Create a project and enable Gmail API
            // 3. Create OAuth 2.0 credentials
            // 4. Generate a refresh token using OAuth playground`,
            //             'Missing Gmail Credentials'
            //         );
            //         p.outro('❌ Configuration incomplete');
        }
        return { clientId, clientSecret, refreshToken, filterEmail, anthropicApiKey, twitterBearerToken };
    }
}

function main() {
    const logger: ILogger = new Logger();
    // const workflow = new WorkflowCreator("bookmarksFromGmailToNotion", logger);
    const workflow = new WorkflowCreator("bookmarksFromZipEmlFiles", logger);
    return workflow.run();
}

main()


// export { WorkflowCreator };

