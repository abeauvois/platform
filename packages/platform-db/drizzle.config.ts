import { defineConfig } from 'drizzle-kit';

export default defineConfig({
    out: './migrations',
    schema: './src/schema/index.ts',
    dialect: 'postgresql',
    dbCredentials: {
        url: process.env.DATABASE_URL || 'postgresql://platform:platform@localhost:5432/platform',
    },
});
