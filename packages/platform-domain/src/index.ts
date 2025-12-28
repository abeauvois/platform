/**
 * Public entrypoint for the shared domain package.
 */

// Re-export from platform-task for convenience
export * from '@platform/task'

// Entities
export * from './domain/entities/BaseContent'
export * from './domain/entities/Bookmark'
export * from './domain/entities/EmailFile'
export * from './domain/entities/GmailMessage'
export * from './domain/entities/SourceAdapter'
export * from './domain/entities/BackgroundTask'

// Core ports commonly needed across apps
export * from './domain/ports/IConfigProvider'
export * from './domain/ports/ILinkRepository'
export * from './domain/ports/ILogger'
export * from './domain/ports/IBackgroundTaskRepository'
export * from './domain/ports/IRateLimitedClient'
export * from './domain/ports/ISourceReader'

// Application Services
export * from './application/services/GetBookmarksByUserIdService'
export * from './application/services/BackgroundTaskService'

// Workflows
export * from './application/workflows'
