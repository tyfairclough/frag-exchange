-- Add exchange logo variants for fast UI rendering.
ALTER TABLE `exchanges`
  ADD COLUMN `logo40Url` VARCHAR(2048) NULL,
  ADD COLUMN `logo80Url` VARCHAR(2048) NULL,
  ADD COLUMN `logo512Url` VARCHAR(2048) NULL,
  ADD COLUMN `logoUpdatedAt` DATETIME(3) NULL;
