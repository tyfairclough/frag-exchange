-- AlterTable
ALTER TABLE `users` ADD COLUMN `globalRole` ENUM('MEMBER', 'SUPER_ADMIN') NOT NULL DEFAULT 'MEMBER';

-- CreateTable
CREATE TABLE `exchanges` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(160) NOT NULL,
    `description` TEXT NULL,
    `kind` ENUM('EVENT', 'GROUP') NOT NULL,
    `visibility` ENUM('PUBLIC', 'PRIVATE') NOT NULL,
    `eventDate` DATETIME(3) NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `exchanges_visibility_kind_idx`(`visibility`, `kind`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `exchange_memberships` (
    `id` VARCHAR(191) NOT NULL,
    `exchangeId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `role` ENUM('MEMBER', 'EVENT_MANAGER') NOT NULL DEFAULT 'MEMBER',
    `joinedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `exchange_memberships_userId_idx`(`userId`),
    UNIQUE INDEX `exchange_memberships_exchangeId_userId_key`(`exchangeId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `exchange_invites` (
    `id` VARCHAR(191) NOT NULL,
    `exchangeId` VARCHAR(191) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `tokenHash` VARCHAR(64) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `usedAt` DATETIME(3) NULL,
    `invitedById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `exchange_invites_tokenHash_key`(`tokenHash`),
    INDEX `exchange_invites_exchangeId_email_idx`(`exchangeId`, `email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `exchanges` ADD CONSTRAINT `exchanges_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exchange_memberships` ADD CONSTRAINT `exchange_memberships_exchangeId_fkey` FOREIGN KEY (`exchangeId`) REFERENCES `exchanges`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exchange_memberships` ADD CONSTRAINT `exchange_memberships_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exchange_invites` ADD CONSTRAINT `exchange_invites_exchangeId_fkey` FOREIGN KEY (`exchangeId`) REFERENCES `exchanges`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exchange_invites` ADD CONSTRAINT `exchange_invites_invitedById_fkey` FOREIGN KEY (`invitedById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
