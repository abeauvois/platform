/**
 * Public entrypoint for the shared domain package.
 */

// Re-export all core infrastructure types (ILogger, IConfigProvider, tasks, workflows, etc.)
export * from '@abeauvois/platform-core'

// Re-export all ingestion types (BaseContent, PendingContent, SourceAdapter, ports, etc.)
// This maintains backward compatibility for consumers
export * from '@abeauvois/platform-ingestion'

// Domain Entities (platform-domain specific)
export * from './domain/entities/Bookmark'

// Domain Ports (platform-domain specific)
export * from './domain/ports/ILinkRepository'
export * from './domain/ports/IBookmarkEnricher'

// Application Services
export * from './application/services/GetBookmarksByUserIdService'
