/**
 * Environment Variable Configuration and Validation
 *
 * Provides a type-safe way to define, validate, and access environment variables.
 */

export interface EnvVarConfig {
    /** Description of what this variable is used for */
    description: string;
    /** Whether this variable is required (default: true) */
    required?: boolean;
    /** Default value if not provided (makes the variable optional) */
    default?: string;
    /** Custom validation function */
    validate?: (value: string) => boolean | string;
}

export type EnvSchema = Record<string, EnvVarConfig>;

export type ValidatedEnv<T extends EnvSchema> = {
    [K in keyof T]: string;
};

interface ValidationError {
    key: string;
    message: string;
}

/**
 * Validates environment variables against a schema
 *
 * @param schema - The env var schema to validate against
 * @param env - The environment object (defaults to process.env)
 * @returns Array of validation errors (empty if valid)
 */
export function validateEnv<T extends EnvSchema>(
    schema: T,
    env: Record<string, string | undefined> = process.env
): ValidationError[] {
    const errors: ValidationError[] = [];

    for (const [key, config] of Object.entries(schema)) {
        const value = env[key];
        const isRequired = config.required !== false && config.default === undefined;

        // Check required
        if (isRequired && (value === undefined || value === '')) {
            errors.push({
                key,
                message: `Missing required environment variable: ${key} - ${config.description}`,
            });
            continue;
        }

        // Run custom validation if value exists
        const finalValue = value || config.default;
        if (finalValue && config.validate) {
            const result = config.validate(finalValue);
            if (result !== true) {
                errors.push({
                    key,
                    message: typeof result === 'string'
                        ? result
                        : `Invalid value for ${key}: ${finalValue}`,
                });
            }
        }
    }

    return errors;
}

/**
 * Creates a validated environment configuration object
 *
 * @param schema - The env var schema
 * @param options - Configuration options
 * @returns Validated environment object with typed access
 * @throws Error if validation fails and throwOnError is true (default)
 */
export function createEnvConfig<T extends EnvSchema>(
    schema: T,
    options: {
        /** Environment object to validate (default: process.env) */
        env?: Record<string, string | undefined>;
        /** Whether to throw on validation errors (default: true) */
        throwOnError?: boolean;
        /** App name for error messages */
        appName?: string;
    } = {}
): ValidatedEnv<T> {
    const {
        env = process.env,
        throwOnError = true,
        appName = 'App',
    } = options;

    const errors = validateEnv(schema, env);

    if (errors.length > 0 && throwOnError) {
        const errorMessages = errors.map((e) => `  - ${e.message}`).join('\n');
        throw new Error(
            `\n[${appName}] Environment validation failed:\n${errorMessages}\n\n` +
            `Please check your .env file and ensure all required variables are set.\n`
        );
    }

    // Build the validated env object
    const validatedEnv: Record<string, string> = {};

    for (const [key, config] of Object.entries(schema)) {
        const value = env[key];
        validatedEnv[key] = value || config.default || '';
    }

    return validatedEnv as ValidatedEnv<T>;
}

/**
 * Common validators for environment variables
 */
export const validators = {
    /** Validates that value is a valid URL */
    url: (value: string): boolean | string => {
        try {
            new URL(value);
            return true;
        } catch {
            return `Invalid URL: ${value}`;
        }
    },

    /** Validates that value is a positive integer */
    port: (value: string): boolean | string => {
        const num = parseInt(value, 10);
        if (isNaN(num) || num < 1 || num > 65535) {
            return `Invalid port number: ${value} (must be 1-65535)`;
        }
        return true;
    },

    /** Validates that value is one of the allowed options */
    oneOf:
        (options: string[]) =>
        (value: string): boolean | string => {
            if (!options.includes(value)) {
                return `Invalid value: ${value} (must be one of: ${options.join(', ')})`;
            }
            return true;
        },

    /** Validates that value is not empty */
    notEmpty: (value: string): boolean | string => {
        if (!value || value.trim() === '') {
            return 'Value cannot be empty';
        }
        return true;
    },
};
