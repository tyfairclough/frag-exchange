-- CreateTable
CREATE TABLE `corals` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `description` TEXT NOT NULL,
    `imageUrl` VARCHAR(2048) NULL,
    `listingMode` ENUM('POST', 'MEET', 'BOTH') NOT NULL DEFAULT 'BOTH',
    `freeToGoodHome` BOOLEAN NOT NULL DEFAULT false,
    `profileStatus` ENUM('UNLISTED', 'TRADED') NOT NULL DEFAULT 'UNLISTED',
    `coralType` VARCHAR(120) NULL,
    `colour` VARCHAR(120) NULL,
    `sizeLabel` VARCHAR(80) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `corals_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `corals` ADD CONSTRAINT `corals_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
