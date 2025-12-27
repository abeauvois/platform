import type { IIdGenerator } from '../ports.js';

export class TimestampIdGenerator implements IIdGenerator {
    generate(prefix: string): string {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }
}
