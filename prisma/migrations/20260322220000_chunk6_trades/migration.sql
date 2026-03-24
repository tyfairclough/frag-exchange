-- Chunk 6: trades FSM, coral sides, version column for race-safe accept

CREATE TABLE `trades` (
    `id` VARCHAR(191) NOT NULL,
    `exchangeId` VARCHAR(191) NOT NULL,
    `initiatorUserId` VARCHAR(191) NOT NULL,
    `peerUserId` VARCHAR(191) NOT NULL,
    `status` ENUM('OFFER', 'REJECTED', 'COUNTERED', 'APPROVED', 'EXPIRED') NOT NULL DEFAULT 'OFFER',
    `version` INTEGER NOT NULL DEFAULT 0,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `trade_corals` (
    `id` VARCHAR(191) NOT NULL,
    `tradeId` VARCHAR(191) NOT NULL,
    `coralId` VARCHAR(191) NOT NULL,
    `side` ENUM('INITIATOR', 'PEER') NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE UNIQUE INDEX `trade_corals_tradeId_coralId_key` ON `trade_corals`(`tradeId`, `coralId`);
CREATE INDEX `trade_corals_coralId_idx` ON `trade_corals`(`coralId`);

CREATE INDEX `trades_exchangeId_status_idx` ON `trades`(`exchangeId`, `status`);
CREATE INDEX `trades_initiatorUserId_idx` ON `trades`(`initiatorUserId`);
CREATE INDEX `trades_peerUserId_idx` ON `trades`(`peerUserId`);

ALTER TABLE `trades` ADD CONSTRAINT `trades_exchangeId_fkey` FOREIGN KEY (`exchangeId`) REFERENCES `exchanges`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `trades` ADD CONSTRAINT `trades_initiatorUserId_fkey` FOREIGN KEY (`initiatorUserId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `trades` ADD CONSTRAINT `trades_peerUserId_fkey` FOREIGN KEY (`peerUserId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `trade_corals` ADD CONSTRAINT `trade_corals_tradeId_fkey` FOREIGN KEY (`tradeId`) REFERENCES `trades`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `trade_corals` ADD CONSTRAINT `trade_corals_coralId_fkey` FOREIGN KEY (`coralId`) REFERENCES `corals`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
