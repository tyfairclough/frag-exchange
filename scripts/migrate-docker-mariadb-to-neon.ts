import mysql from "mysql2/promise";
import { Client } from "pg";

const SOURCE_URL = process.env.SOURCE_MARIADB_URL ?? process.env.DOCKER_MARIADB_URL ?? "";
const TARGET_URL = process.env.TARGET_NEON_DIRECT_URL ?? process.env.DIRECT_URL ?? "";
const APPEND_ONLY = process.env.MIGRATION_APPEND_ONLY === "true";
const BATCH_SIZE = Number(process.env.MIGRATION_BATCH_SIZE ?? "500");

const TABLE_ORDER = [
  "users",
  "admin_audit_logs",
  "alias_generator_words",
  "exchanges",
  "exchange_memberships",
  "exchange_invites",
  "inventory_items",
  "exchange_listings",
  "trades",
  "trade_inventory_lines",
  "user_addresses",
  "sessions",
  "magic_link_tokens",
] as const;

function quoteId(value: string): string {
  return `"${value.replace(/"/g, "\"\"")}"`;
}

function normalizeValue(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value;
  if (Buffer.isBuffer(value)) return value;
  if (typeof value === "object") return JSON.stringify(value);
  return value;
}

async function fetchColumnOrder(pg: Client, tableName: string): Promise<string[]> {
  const sql = `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = $1
    ORDER BY ordinal_position;
  `;
  const rows = await pg.query<{ column_name: string }>(sql, [tableName]);
  return rows.rows.map((r) => r.column_name);
}

async function copyTable(
  maria: mysql.Connection,
  pg: Client,
  tableName: string,
  canTruncate: boolean,
): Promise<void> {
  const [sourceRows] = await maria.query<mysql.RowDataPacket[]>(`SELECT * FROM \`${tableName}\``);
  const targetColumns = await fetchColumnOrder(pg, tableName);

  if (targetColumns.length === 0) {
    throw new Error(`Target table "${tableName}" not found in Neon.`);
  }

  if (!APPEND_ONLY && canTruncate) {
    await pg.query(`TRUNCATE TABLE ${quoteId(tableName)} RESTART IDENTITY CASCADE`);
  }

  if (sourceRows.length === 0) {
    console.log(`[migrate] ${tableName}: no rows to copy`);
    return;
  }

  const sourceColumnSet = new Set(Object.keys(sourceRows[0] ?? {}));
  const selectedColumns = targetColumns.filter((c) => sourceColumnSet.has(c));
  if (selectedColumns.length === 0) {
    throw new Error(`No overlapping columns for table "${tableName}"`);
  }

  const selectedColumnList = selectedColumns.map(quoteId).join(", ");
  console.log(`[migrate] ${tableName}: ${sourceRows.length} rows, ${selectedColumns.length} columns`);

  for (let start = 0; start < sourceRows.length; start += BATCH_SIZE) {
    const slice = sourceRows.slice(start, start + BATCH_SIZE);
    const params: unknown[] = [];
    const valuesSql = slice
      .map((row, rowIndex) => {
        const placeholders = selectedColumns.map((column, colIndex) => {
          params.push(normalizeValue(row[column]));
          return `$${rowIndex * selectedColumns.length + colIndex + 1}`;
        });
        return `(${placeholders.join(", ")})`;
      })
      .join(", ");

    const insertSql = `
      INSERT INTO ${quoteId(tableName)} (${selectedColumnList})
      VALUES ${valuesSql}
    `;
    await pg.query(insertSql, params);
    console.log(`[migrate] ${tableName}: copied ${Math.min(start + BATCH_SIZE, sourceRows.length)} / ${sourceRows.length}`);
  }

}

async function main() {
  if (!SOURCE_URL) {
    throw new Error("SOURCE_MARIADB_URL (or DOCKER_MARIADB_URL) is required.");
  }
  if (!TARGET_URL) {
    throw new Error("TARGET_NEON_DIRECT_URL (or DIRECT_URL) is required.");
  }

  const maria = await mysql.createConnection(SOURCE_URL);
  const pg = new Client({ connectionString: TARGET_URL });
  await pg.connect();

  try {
    await pg.query("BEGIN");
    for (let i = 0; i < TABLE_ORDER.length; i += 1) {
      const tableName = TABLE_ORDER[i];
      await copyTable(maria, pg, tableName, i === 0);
    }
    await pg.query("COMMIT");
    console.log("[migrate] Migration completed successfully.");
  } catch (err) {
    await pg.query("ROLLBACK");
    throw err;
  } finally {
    await maria.end();
    await pg.end();
  }
}

main().catch((err) => {
  console.error("[migrate] Failed:", err);
  process.exit(1);
});
