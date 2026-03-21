-- AlterTable
ALTER TABLE `users`
    ADD COLUMN `privacyAcceptedAt` DATETIME(3) NULL,
    ADD COLUMN `privacyVersion` VARCHAR(40) NULL;
