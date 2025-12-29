import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

/**
 * Workflow presets available
 */
const workflowPresets = ['gmail', 'bookmark', 'analyzeOnly', 'twitterFocus', 'csvOnly'] as const;

/**
 * Available destinations for saving processed items
 */
export const SAVE_TO_DESTINATIONS = ['console', 'database', 'csv', 'notion'] as const;

/**
 * Schema for workflow filter options
 */
const workflowFilterSchema = z.object({
    email: z.string().email().optional(),
    limitDays: z.number().int().positive().max(365).optional(),
    withUrl: z.boolean().optional(),
}).optional();

/**
 * Schema for workflow request body
 */
export const workflowSchema = z.object({
    preset: z.enum(workflowPresets),
    filter: workflowFilterSchema,
    skipAnalysis: z.boolean().optional(),
    skipTwitter: z.boolean().optional(),
    csvOnly: z.boolean().optional(),
    saveTo: z.enum(SAVE_TO_DESTINATIONS).optional(),
});

export type WorkflowRequest = z.infer<typeof workflowSchema>;

export const workflowValidator = zValidator(
    'json',
    workflowSchema,
    (result, c) => {
        if (!result.success) {
            return c.json(
                {
                    error: 'Invalid workflow request',
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
