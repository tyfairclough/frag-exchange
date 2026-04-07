/**
 * One-time recovery: if migration `20260407120000_inventory_items_and_trade_lines` failed after
 * renaming `corals` → `inventory_items` and updating `exchange_listings`, but before finishing
 * `trade_corals` → `trade_inventory_lines`, run this script then:
 *   npx prisma migrate resolve --applied "20260407120000_inventory_items_and_trade_lines"
 */
import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getPrisma } from "../src/lib/db";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, "../.env.development") });
config({ path: path.join(__dirname, "../.env.local") });
config({ path: path.join(__dirname, "../.env") });

async function fkExists(table: string, name: string): Promise<boolean> {
  const p = getPrisma();
  const rows = await p.$queryRawUnsafe<{ c: bigint }[]>(
    `SELECT COUNT(*) AS c FROM information_schema.TABLE_CONSTRAINTS
     WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ? AND CONSTRAINT_TYPE = 'FOREIGN KEY'`,
    table,
    name,
  );
  return Number(rows[0]?.c ?? 0) > 0;
}

async function main() {
  const p = getPrisma();
  const drops: [string, string][] = [
    ["trade_corals", "trade_corals_tradeId_fkey"],
    ["trade_corals", "trade_corals_coralId_fkey"],
  ];
  for (const [table, fk] of drops) {
    if (await fkExists(table, fk)) {
      await p.$executeRawUnsafe(`ALTER TABLE \`${table}\` DROP FOREIGN KEY \`${fk}\``);
      console.log(`Dropped FK ${fk} on ${table}`);
    } else {
      console.log(`Skip FK ${fk} (not present)`);
    }
  }

  await p.$executeRawUnsafe(`ALTER TABLE \`trade_corals\` DROP INDEX \`trade_corals_tradeId_coralId_key\``);
  await p.$executeRawUnsafe(`ALTER TABLE \`trade_corals\` DROP INDEX \`trade_corals_coralId_idx\``);
  await p.$executeRawUnsafe(
    `ALTER TABLE \`trade_corals\` CHANGE \`coralId\` \`inventoryItemId\` VARCHAR(191) NOT NULL`,
  );
  await p.$executeRawUnsafe(`RENAME TABLE \`trade_corals\` TO \`trade_inventory_lines\``);
  await p.$executeRawUnsafe(
    `CREATE UNIQUE INDEX \`trade_inventory_lines_tradeId_inventoryItemId_key\` ON \`trade_inventory_lines\`(\`tradeId\`, \`inventoryItemId\`)`,
  );
  await p.$executeRawUnsafe(
    `CREATE INDEX \`trade_inventory_lines_inventoryItemId_idx\` ON \`trade_inventory_lines\`(\`inventoryItemId\`)`,
  );
  await p.$executeRawUnsafe(
    `ALTER TABLE \`trade_inventory_lines\` ADD CONSTRAINT \`trade_inventory_lines_tradeId_fkey\` FOREIGN KEY (\`tradeId\`) REFERENCES \`trades\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE`,
  );
  await p.$executeRawUnsafe(
    `ALTER TABLE \`trade_inventory_lines\` ADD CONSTRAINT \`trade_inventory_lines_inventoryItemId_fkey\` FOREIGN KEY (\`inventoryItemId\`) REFERENCES \`inventory_items\`(\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE`,
  );
  console.log("Recovery complete: trade_inventory_lines ready.");
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
