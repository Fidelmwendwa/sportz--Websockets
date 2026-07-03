import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

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

export default defineConfig({
  schema: './src/db/schema.js',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl,
  },
});
