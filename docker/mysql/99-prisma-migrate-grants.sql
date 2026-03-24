-- Local Docker MySQL only (docker-entrypoint-initdb.d). Also applied via `npm run db:grant`.

-- Dedicated DB for Prisma Migrate `dev` when using PRISMA_SHADOW_DATABASE_URL (root user in .env.development).
CREATE DATABASE IF NOT EXISTS prisma_shadow;

-- Fallback: allow `frag` to create ephemeral shadow DBs if shadow URL is not used.
GRANT CREATE, DROP ON *.* TO 'frag'@'%';
FLUSH PRIVILEGES;
