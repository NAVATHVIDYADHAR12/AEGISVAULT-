import dotenv from 'dotenv';
import path from 'node:path';
import { defineConfig } from 'prisma/config';

dotenv.config({ path: path.resolve('apps/api/.env') });

const localDatabaseUrl =
  'postgresql://vault_user:replace_me@localhost:5432/centralized_secret_vault?schema=public';
process.env.DATABASE_URL ??= localDatabaseUrl;
process.env.DATABASE_URL_UNPOOLED ??=
  process.env.VERCEL_ENV === 'production'
    ? localDatabaseUrl
    : process.env.DATABASE_URL;

export default defineConfig({
  engine: 'classic',
  schema: 'apps/api/prisma/schema.prisma',
  migrations: {
    path: 'apps/api/prisma/migrations',
    seed: 'node apps/api/prisma/seed.js',
  },
  datasource: {
    // Use the direct connection for schema operations. Serverless runtime
    // requests continue to use DATABASE_URL, which may be Neon pooled.
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? '',
  },
});
