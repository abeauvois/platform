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
    WorkflowClient,
    SourcesClient,
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
