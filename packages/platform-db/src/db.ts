import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { drizzle as neonDrizzle } from 'drizzle-orm/neon-http';
import { neon, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

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

    if (process.env.APP_ENV === 'development') {
        // Use node-postgres Pool for development
        return drizzle(pool);
    }

    // Use Neon serverless for production
    const sql = neon(process.env.DATABASE_URL);
    return neonDrizzle({ client: sql });
};

export const db = getDbConn();
