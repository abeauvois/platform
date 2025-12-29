/**
 * Platform SDK
 * Generic client SDK for interacting with the platform API
 */

// API Client
export { PlatformApiClient } from './PlatformApiClient.js';

// Individual Clients
export {
    ApiClient,
    BaseClient,
    AuthClient,
    BookmarkClient,
    ConfigClient,
    WorkflowClient,
    SourcesClient,
    type ApiClientConfig,
    type BaseClientConfig,
    type Bookmark,
    type GmailReadOptions,
    type SourceContentItem,
} from './clients/index.js';

// Config Providers
export { EnvConfigProvider, ApiConfigProvider } from './config/index.js';

// Workflow
export { Workflow } from './Workflow.js';

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
    // Workflow types
    WorkflowPreset,
    SaveToDestination,
    WorkflowFilter,
    WorkflowOptions,
    WorkflowHookInfo,
    WorkflowExecuteOptions,
    WorkflowCompleteInfo,
    ItemProcessedInfo,
    ProcessedItem,
    IWorkflow,
    ILogger,
} from './types.js';

// Constants
export { SAVE_TO_DESTINATIONS } from './types.js';
