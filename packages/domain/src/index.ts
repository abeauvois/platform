/**
 * Public entrypoint for the shared domain package.
 * For now, this re-exports from the existing `src/domain` location.
 * Later you can move the actual domain source into `packages/domain/src`.
 *
 * Keep this surface minimal and grow it as needed.
 */

// Entities
export * from '../../../src/domain/entities/Bookmark.js'
export * from '../../../src/domain/entities/EmailFile.js'
export * from '../../../src/domain/entities/GmailMessage.js'
export * from '../../../src/domain/entities/SourceAdapter.js'

// Core ports commonly needed across apps
export * from '../../../src/domain/ports/IConfigProvider.js'
export * from '../../../src/domain/ports/ILinkRepository.js'
export * from '../../../src/domain/ports/ILogger.js'

// Workflow abstractions
export * from '../../../src/domain/workflow/index.js'

// Repositories
export * from '../../../src/infrastructure/repositories/InMemoryBookmarkRepository.js'

// Application Services
export * from '../../../src/application/services/GetBookmarksByUserIdService.js'
