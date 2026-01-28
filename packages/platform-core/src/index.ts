/**
 * Platform Core — generic infrastructure types and services.
 */

// Entities
export * from './domain/entities/BackgroundTask'

// Core ports
export * from './domain/ports/IConfigProvider'
export * from './domain/ports/ILogger'
export * from './domain/ports/IBackgroundTaskRepository'
export * from './domain/ports/IUserSettingsRepository'

// Application Services
export * from './application/services/BackgroundTaskService'

// Workflows
export * from './application/workflows'
