-- Chunk 9: idempotent trade expiry notifications
ALTER TABLE `trades` ADD COLUMN `expiredNotifiedAt` DATETIME(3) NULL;
