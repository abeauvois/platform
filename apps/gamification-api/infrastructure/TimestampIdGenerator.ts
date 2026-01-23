/**
 * Timestamp-based ID Generator
 * Generates unique IDs using timestamp and random suffix
 */

import type { IIdGenerator } from '@platform/gamification-domain';

export class TimestampIdGenerator implements IIdGenerator {
    generate(prefix?: string): string {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 9);
        const base = `${timestamp}_${random}`;
        return prefix ? `${prefix}_${base}` : base;
    }
}
