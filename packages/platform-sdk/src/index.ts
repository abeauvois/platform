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
    ScraperClient,
    SettingsClient,
    type ApiClientConfig,
    type BaseClientConfig,
    type Bookmark,
    type GmailReadOptions,
    type SourceContentItem,
    type ScrapedDataItem,
    type SaveScrapedDataOptions,
    type ListScrapedDataOptions,
    // Settings types
    type UserSettings,
    type UserSettingsUpdate,
    type Theme,
    type SettingsNamespace,
    type PlatformSettings,
    type DashboardAppSettings,
    type CliAppSettings,
    type TradingDomainSettings,
    type BookmarksDomainSettings,
    type NamespaceSettingsMap,
    type KnownNamespace,
} from './clients/index.js';

// Config Providers (browser-compatible only)
// Note: EnvConfigProvider is Bun-specific, import from '@abeauvois/platform-sdk/server' for server-side code
export { ApiConfigProvider } from './config/ApiConfigProvider.js';

// Session Storage Port
export type { ISessionStorage } from './ports/ISessionStorage.js';

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
