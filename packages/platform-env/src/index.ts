/**
 * Platform Environment Validation
 *
 * Provides runtime validation of environment variables with clear error messages.
 * Use this at server startup to fail fast if required configuration is missing.
 */

export { createEnvConfig, validateEnv, validators } from './env-config';
export type { EnvSchema, EnvVarConfig, ValidatedEnv } from './env-config';
