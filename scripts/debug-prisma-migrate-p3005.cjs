/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS diagnostic CLI */
/**
 * Run with the SAME DATABASE_URL (and DIRECT_URL if used) as the failing deploy
 * to capture migration history vs public table counts. Does not print connection strings.
 */
require("dotenv").config({ path: ".env" });
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config({ path: ".env.development" });
}
require("dotenv").config({ path: ".env.local" });

const { Client } = require("pg");
const { spawnSync } = require("child_process");

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  const status = spawnSync("npx", ["prisma", "migrate", "status"], {
    encoding: "utf8",
    shell: true,
    env: process.env,
  });
  const statusOut = `${status.stdout || ""}${status.stderr || ""}`.slice(
    0,
    4000,
  );
  console.error("[debug] prisma migrate status exit:", status.status);
  console.error(statusOut || "(no output)");

  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    const hasMig = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = '_prisma_migrations'
      ) AS ok
    `);
    const migCount = hasMig.rows[0]?.ok
      ? (await client.query(`SELECT COUNT(*)::int AS c FROM _prisma_migrations`))
          .rows[0].c
      : null;
    const tableCount = (
      await client.query(`
        SELECT COUNT(*)::int AS c
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      `)
    ).rows[0].c;

    console.error("[debug] _prisma_migrations exists:", !!hasMig.rows[0]?.ok);
    console.error("[debug] _prisma_migrations rows:", migCount);
    console.error("[debug] public BASE TABLE count:", tableCount);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
