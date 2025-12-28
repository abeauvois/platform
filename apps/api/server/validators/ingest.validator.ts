import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

/**
 * Workflow presets available for ingestion
 */
const workflowPresets = ['gmail', 'bookmark', 'analyzeOnly', 'twitterFocus', 'csvOnly', 'gmail'] as const;

/**
 * Schema for ingest filter options
 */
const ingestFilterSchema = z.object({
    email: z.string().email().optional(),
    limitDays: z.number().int().positive().max(365).optional(),
    withUrl: z.boolean().optional(),
}).optional();

/**
 * Schema for ingest request body
 */
export const ingestSchema = z.object({
    preset: z.enum(workflowPresets),
    filter: ingestFilterSchema,
    skipAnalysis: z.boolean().optional(),
    skipTwitter: z.boolean().optional(),
    csvOnly: z.boolean().optional(),
});

export type IngestRequest = z.infer<typeof ingestSchema>;

export const ingestValidator = zValidator(
    'json',
    ingestSchema,
    (result, c) => {
        if (!result.success) {
            return c.json(
                {
                    error: 'Invalid ingest request',
                    details: result.error.issues.map((issue) => ({
                        field: issue.path.join('.'),
                        message: issue.message,
                    })),
                },
                400
            );
        }
    }
);
