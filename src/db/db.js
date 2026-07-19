import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

const databaseUrl = process.env.DATABASE_URL;

if (
  !databaseUrl ||
  databaseUrl.includes('[user]') ||
  databaseUrl.includes('[password]') ||
  databaseUrl.includes('[neon_hostname]') ||
  databaseUrl.includes('[dbname]')
) {
  throw new Error('DATABASE_URL must be set to your Neon connection string in .env');
}

export const pool = new Pool({
  connectionString: databaseUrl,
});

export const db = drizzle(pool);
