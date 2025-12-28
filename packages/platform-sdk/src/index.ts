/**
 * Platform SDK
 * Generic client SDK for interacting with the platform API
 */

// API Client
export { PlatformApiClient } from './PlatformApiClient.js';

// Individual Clients
export {
    BaseClient,
    AuthClient,
    BookmarkClient,
    ConfigClient,
    IngestClient,
    SourcesClient,
    type BaseClientConfig,
    type Bookmark,
    type GmailReadOptions,
    type SourceContentItem,
} from './clients/index.js';

// Config Providers
export { EnvConfigProvider, ApiConfigProvider } from './config/index.js';

// Workflow
export { IngestWorkflow } from './IngestWorkflow.js';

// Types
export type {
    SignUpData,
    SignInData,
    AuthResponse,
    BookmarkData,
    ConfigResponse,
    ConfigValueResponse,
    ConfigBatchRequest,
    ConfigBatchResponse,
    ConfigKeysResponse,
    // Ingest/Workflow types
    WorkflowPreset,
    IngestFilter,
    IngestOptions,
    WorkflowHookInfo,
    WorkflowExecuteOptions,
    WorkflowCompleteInfo,
    ItemProcessedInfo,
    ProcessedItem,
    IIngestWorkflow,
    ILogger,
} from './types.js';
