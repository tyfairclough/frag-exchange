# REEFX SQL Bootstrap (Legacy MariaDB)

These scripts are legacy helpers for MariaDB/MySQL snapshots only.
Primary production database is now Neon Postgres via Prisma migrations.

## Files

- `schema-setup.sql` - Creates all tables, indexes, constraints, and enum columns.
- `mock-seed.sql` - Inserts deterministic mock data for users, exchanges, listings, and trades.

## Import Order

1. Import `schema-setup.sql`
2. Import `mock-seed.sql`

## Command Examples

From the `frag-exchange/sql` directory:

```bash
mysql -u YOUR_USER -p < schema-setup.sql
mysql -u YOUR_USER -p < mock-seed.sql
```

If you need a specific host/port/database:

```bash
mysql -h YOUR_HOST -P 3306 -u YOUR_USER -p YOUR_DATABASE < schema-setup.sql
mysql -h YOUR_HOST -P 3306 -u YOUR_USER -p YOUR_DATABASE < mock-seed.sql
```

## Notes

- `schema-setup.sql` includes `CREATE DATABASE IF NOT EXISTS reefx; USE reefx;`.
- If your production DB name is not `reefx`, either:
  - edit those two lines in `schema-setup.sql`, or
  - run against your target database and remove/change the `USE` statement.
- `mock-seed.sql` uses `@mock.example.test` addresses and fixed IDs for predictable QA data.
- The optional delete block in `mock-seed.sql` is commented out and should stay disabled in production.
