-- Expand corals into multi-kind inventory, repoint listings and trades.

-- 1) Add inventory columns to legacy `corals` table
ALTER TABLE `corals`
  ADD COLUMN `kind` ENUM('CORAL', 'FISH', 'EQUIPMENT') NOT NULL DEFAULT 'CORAL' AFTER `userId`,
  ADD COLUMN `species` VARCHAR(200) NULL,
  ADD COLUMN `reefSafe` BOOLEAN NULL,
  ADD COLUMN `equipmentCategory` ENUM('LIGHTS', 'PUMPS', 'MONITORS_CONTROLLERS', 'FILTRATION', 'DOSING', 'OTHER') NULL,
  ADD COLUMN `equipmentCondition` ENUM('LIKE_NEW', 'GOOD_CONDITION', 'WORKING', 'SPARES_REPAIRS') NULL;

-- 2) Rename inventory table
RENAME TABLE `corals` TO `inventory_items`;

-- 3) Exchange listings: coralId -> inventoryItemId
ALTER TABLE `exchange_listings` DROP FOREIGN KEY `exchange_listings_coralId_fkey`;
ALTER TABLE `exchange_listings` DROP INDEX `exchange_listings_exchangeId_coralId_key`;
ALTER TABLE `exchange_listings` CHANGE `coralId` `inventoryItemId` VARCHAR(191) NOT NULL;
CREATE UNIQUE INDEX `exchange_listings_exchangeId_inventoryItemId_key` ON `exchange_listings`(`exchangeId`, `inventoryItemId`);
ALTER TABLE `exchange_listings` ADD CONSTRAINT `exchange_listings_inventoryItemId_fkey` FOREIGN KEY (`inventoryItemId`) REFERENCES `inventory_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- 4) Trade lines: rename table and coralId -> inventoryItemId (side / handoff enums unchanged)
-- MySQL: `trade_corals_tradeId_fkey` uses the left-prefix of `trade_corals_tradeId_coralId_key` as its
-- supporting index — drop that FK *before* dropping the unique index, then drop coral FK, then indexes.
ALTER TABLE `trade_corals` DROP FOREIGN KEY `trade_corals_tradeId_fkey`;
ALTER TABLE `trade_corals` DROP FOREIGN KEY `trade_corals_coralId_fkey`;
ALTER TABLE `trade_corals` DROP INDEX `trade_corals_tradeId_coralId_key`;
ALTER TABLE `trade_corals` DROP INDEX `trade_corals_coralId_idx`;
ALTER TABLE `trade_corals` CHANGE `coralId` `inventoryItemId` VARCHAR(191) NOT NULL;
RENAME TABLE `trade_corals` TO `trade_inventory_lines`;
CREATE UNIQUE INDEX `trade_inventory_lines_tradeId_inventoryItemId_key` ON `trade_inventory_lines`(`tradeId`, `inventoryItemId`);
CREATE INDEX `trade_inventory_lines_inventoryItemId_idx` ON `trade_inventory_lines`(`inventoryItemId`);
ALTER TABLE `trade_inventory_lines` ADD CONSTRAINT `trade_inventory_lines_tradeId_fkey` FOREIGN KEY (`tradeId`) REFERENCES `trades`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `trade_inventory_lines` ADD CONSTRAINT `trade_inventory_lines_inventoryItemId_fkey` FOREIGN KEY (`inventoryItemId`) REFERENCES `inventory_items`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
