-- Add exchange-level allowed item type flags.
ALTER TABLE `exchanges`
  ADD COLUMN `allowCoral` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `allowFish` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `allowEquipment` BOOLEAN NOT NULL DEFAULT true;
