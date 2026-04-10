# MariaDB to Neon Migration Runbook

This runbook migrates `frag-exchange` from MariaDB to Neon Postgres using Docker MariaDB data as source.

## 1) Prerequisites

- Neon project exists (`floral-field-24091236`) and target DB is empty.
- App code is deployed with Postgres Prisma provider changes.
- Hostinger app environment is ready with Neon URLs (see section 4).

## 2) Initial Neon database setup

1. Get Neon connection URLs:
   - `DATABASE_URL`: pooled URL for app runtime.
   - `DIRECT_URL`: direct URL for Prisma migrate and import scripts.
2. Apply schema:
   - `npm run db:migrate` (or `npx prisma migrate deploy`) using `DIRECT_URL`.
3. Validate schema:
   - Run app health check (`/api/health`).
   - Optionally inspect tables with Neon MCP tools (`get_database_tables`, `describe_table_schema`).

## 3) Docker MariaDB to Neon data load

### Full load

Run the migration script from `frag-exchange/`:

```bash
SOURCE_MARIADB_URL="mysql://frag:fraglocaldev@127.0.0.1:3306/frag_exchange" \
TARGET_NEON_DIRECT_URL="postgresql://<direct-neon-url>" \
npm run db:migrate:docker-to-neon
```

Notes:
- Script copies rows in foreign-key-safe order.
- Script runs in one transaction and rolls back on failure.
- Script truncates target tables unless `MIGRATION_APPEND_ONLY=true`.

### Optional short delta pass

For a second pass close to cutover, rerun with append mode:

```bash
MIGRATION_APPEND_ONLY=true \
SOURCE_MARIADB_URL="mysql://frag:fraglocaldev@127.0.0.1:3306/frag_exchange" \
TARGET_NEON_DIRECT_URL="postgresql://<direct-neon-url>" \
npm run db:migrate:docker-to-neon
```

Because your cutover allows a small gap, this optional pass can be skipped.

## 4) Hostinger environment variables (final state)

### Required database variables

- `DATABASE_URL` = Neon **pooled** Postgres URL
- `DIRECT_URL` = Neon **direct** Postgres URL
- `NODE_ENV=production`

### Remove (MariaDB-only)

- `PRISMA_SHADOW_DATABASE_URL`
- `DATABASE_POOL_CONNECTION_LIMIT`
- `DATABASE_POOL_MINIMUM_IDLE`

### Keep existing non-DB variables

- `NEXT_PUBLIC_APP_URL`
- `APP_BASE_URL`
- `CRON_SECRET`
- `MAILTRAP_API_KEY`
- `EMAIL_FROM`
- `OPENAI_API_KEY`
- `CORAL_AI_MODEL`
- `REEFX_IDEAL_POSTCODES_API_KEY`
- `REEFX_SUPER_ADMIN_EMAILS`
- `REEFX_BOOTSTRAP_ADMIN_EMAIL`
- `REEFX_BOOTSTRAP_ADMIN_PASSWORD`
- `NOTIFY_WEBHOOK_URL`
- `NOTIFY_WEBHOOK_SECRET`

## 5) Cutover steps

1. Deploy new app build (Postgres-ready).
2. Set Hostinger `DATABASE_URL` + `DIRECT_URL`.
3. Run full Docker->Neon load.
4. Validate key table counts and login/create flows.
5. Restart app on Hostinger.
6. Verify `/api/health`, auth, exchanges, trades, cron endpoint.

## 6) Rollback

If needed:
- Restore previous app build.
- Restore old Hostinger DB variables.
- Restart app.
