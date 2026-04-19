/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS script */
require("dotenv").config({ path: ".env" });
require("dotenv").config({ path: ".env.development", override: true });
require("dotenv").config({ path: ".env.local", override: true });

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { Client } = require("pg");

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const rows = (
      await client.query(
        "SELECT migration_name FROM _prisma_migrations ORDER BY migration_name ASC",
      )
    ).rows;
    let updated = 0;
    for (const row of rows) {
      const migrationName = row.migration_name;
      const filePath = path.join(
        process.cwd(),
        "prisma",
        "migrations",
        migrationName,
        "migration.sql",
      );
      if (!fs.existsSync(filePath)) continue;
      const hash = crypto
        .createHash("sha256")
        .update(fs.readFileSync(filePath))
        .digest("hex");
      await client.query(
        "UPDATE _prisma_migrations SET checksum = $1 WHERE migration_name = $2",
        [hash, migrationName],
      );
      updated += 1;
    }
    console.log(`Updated checksums: ${updated}`);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
