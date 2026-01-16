import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

export const pool = new Pool({
    connectionString: process.env.DATABASE_URL!,
});

const getDbConn = () => {
    if (!process.env.DATABASE_URL)
        throw new Error('No database connection string specified.');

    if (
        process.env.APP_ENV !== 'development' &&
        process.env.APP_ENV !== 'production'
    ) {
        throw new Error('APP_ENV must be either "development" or "production"');
    }

    // Use node-postgres Pool for both development and production
    // Works with Railway PostgreSQL and any standard PostgreSQL database
    return drizzle(pool);
};

export const db = getDbConn();
