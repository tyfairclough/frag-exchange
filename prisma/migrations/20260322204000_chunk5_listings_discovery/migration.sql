-- CreateTable
CREATE TABLE `exchange_listings` (
    `id` VARCHAR(191) NOT NULL,
    `exchangeId` VARCHAR(191) NOT NULL,
    `coralId` VARCHAR(191) NOT NULL,
    `listedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiresAt` DATETIME(3) NOT NULL,

    INDEX `exchange_listings_exchangeId_expiresAt_idx`(`exchangeId`, `expiresAt`),
    UNIQUE INDEX `exchange_listings_exchangeId_coralId_key`(`exchangeId`, `coralId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `exchange_listings` ADD CONSTRAINT `exchange_listings_exchangeId_fkey` FOREIGN KEY (`exchangeId`) REFERENCES `exchanges`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exchange_listings` ADD CONSTRAINT `exchange_listings_coralId_fkey` FOREIGN KEY (`coralId`) REFERENCES `corals`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
