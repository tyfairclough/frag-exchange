-- REEFX MySQL schema bootstrap
-- Creates all tables required by the current Prisma schema.
-- Run first on an empty database, then run mock-seed.sql.

-- Optional database bootstrap (edit database name as needed)
CREATE DATABASE IF NOT EXISTS `u158443370_reefx` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `u158443370_reefx`;

SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(191) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `alias` VARCHAR(80) NULL,
  `avatarEmoji` VARCHAR(12) NULL,
  `tosAcceptedAt` DATETIME(3) NULL,
  `tosVersion` VARCHAR(40) NULL,
  `privacyAcceptedAt` DATETIME(3) NULL,
  `privacyVersion` VARCHAR(40) NULL,
  `contactPreference` ENUM('EMAIL', 'SMS') NOT NULL DEFAULT 'EMAIL',
  `onboardingPath` ENUM('EVENT_ONLY', 'GROUP_AND_EVENT') NULL,
  `onboardingCompletedAt` DATETIME(3) NULL,
  `globalRole` ENUM('MEMBER', 'SUPER_ADMIN') NOT NULL DEFAULT 'MEMBER',
  `passwordHash` VARCHAR(255) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `users_email_key` (`email`),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `alias_generator_words` (
  `id` VARCHAR(191) NOT NULL,
  `word` VARCHAR(64) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `alias_generator_words_word_key` (`word`),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `exchanges` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(160) NOT NULL,
  `description` TEXT NULL,
  `logo40Url` VARCHAR(2048) NULL,
  `logo80Url` VARCHAR(2048) NULL,
  `logo512Url` VARCHAR(2048) NULL,
  `logoUpdatedAt` DATETIME(3) NULL,
  `kind` ENUM('EVENT', 'GROUP') NOT NULL,
  `visibility` ENUM('PUBLIC', 'PRIVATE') NOT NULL,
  `eventDate` DATETIME(3) NULL,
  `createdById` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX `exchanges_visibility_kind_idx` (`visibility`, `kind`),
  PRIMARY KEY (`id`),
  CONSTRAINT `exchanges_createdById_fkey`
    FOREIGN KEY (`createdById`) REFERENCES `users`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `corals` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `description` TEXT NOT NULL,
  `imageUrl` VARCHAR(2048) NULL,
  `listingMode` ENUM('POST', 'MEET', 'BOTH') NOT NULL DEFAULT 'BOTH',
  `freeToGoodHome` BOOLEAN NOT NULL DEFAULT FALSE,
  `profileStatus` ENUM('UNLISTED', 'TRADED') NOT NULL DEFAULT 'UNLISTED',
  `coralType` VARCHAR(120) NULL,
  `colour` VARCHAR(120) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX `corals_userId_idx` (`userId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `corals_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `users`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `trades` (
  `id` VARCHAR(191) NOT NULL,
  `exchangeId` VARCHAR(191) NOT NULL,
  `initiatorUserId` VARCHAR(191) NOT NULL,
  `peerUserId` VARCHAR(191) NOT NULL,
  `status` ENUM('OFFER', 'REJECTED', 'COUNTERED', 'APPROVED', 'EXPIRED') NOT NULL DEFAULT 'OFFER',
  `version` INT NOT NULL DEFAULT 0,
  `expiresAt` DATETIME(3) NOT NULL,
  `expiredNotifiedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX `trades_exchangeId_status_idx` (`exchangeId`, `status`),
  INDEX `trades_initiatorUserId_idx` (`initiatorUserId`),
  INDEX `trades_peerUserId_idx` (`peerUserId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `trades_exchangeId_fkey`
    FOREIGN KEY (`exchangeId`) REFERENCES `exchanges`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `trades_initiatorUserId_fkey`
    FOREIGN KEY (`initiatorUserId`) REFERENCES `users`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `trades_peerUserId_fkey`
    FOREIGN KEY (`peerUserId`) REFERENCES `users`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `exchange_memberships` (
  `id` VARCHAR(191) NOT NULL,
  `exchangeId` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `role` ENUM('MEMBER', 'EVENT_MANAGER') NOT NULL DEFAULT 'MEMBER',
  `joinedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `exchange_memberships_exchangeId_userId_key` (`exchangeId`, `userId`),
  INDEX `exchange_memberships_userId_idx` (`userId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `exchange_memberships_exchangeId_fkey`
    FOREIGN KEY (`exchangeId`) REFERENCES `exchanges`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `exchange_memberships_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `users`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `exchange_invites` (
  `id` VARCHAR(191) NOT NULL,
  `exchangeId` VARCHAR(191) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `tokenHash` VARCHAR(64) NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `usedAt` DATETIME(3) NULL,
  `lastSentAt` DATETIME(3) NULL,
  `invitedById` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `exchange_invites_tokenHash_key` (`tokenHash`),
  INDEX `exchange_invites_exchangeId_email_idx` (`exchangeId`, `email`),
  PRIMARY KEY (`id`),
  CONSTRAINT `exchange_invites_exchangeId_fkey`
    FOREIGN KEY (`exchangeId`) REFERENCES `exchanges`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `exchange_invites_invitedById_fkey`
    FOREIGN KEY (`invitedById`) REFERENCES `users`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `exchange_listings` (
  `id` VARCHAR(191) NOT NULL,
  `exchangeId` VARCHAR(191) NOT NULL,
  `coralId` VARCHAR(191) NOT NULL,
  `listedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `expiresAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `exchange_listings_exchangeId_coralId_key` (`exchangeId`, `coralId`),
  INDEX `exchange_listings_exchangeId_expiresAt_idx` (`exchangeId`, `expiresAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `exchange_listings_exchangeId_fkey`
    FOREIGN KEY (`exchangeId`) REFERENCES `exchanges`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `exchange_listings_coralId_fkey`
    FOREIGN KEY (`coralId`) REFERENCES `corals`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `trade_corals` (
  `id` VARCHAR(191) NOT NULL,
  `tradeId` VARCHAR(191) NOT NULL,
  `coralId` VARCHAR(191) NOT NULL,
  `side` ENUM('INITIATOR', 'PEER') NOT NULL,
  `eventHandoffStatus` ENUM('AWAITING_CHECKIN', 'CHECKED_IN', 'CHECKED_OUT') NULL,
  UNIQUE INDEX `trade_corals_tradeId_coralId_key` (`tradeId`, `coralId`),
  INDEX `trade_corals_coralId_idx` (`coralId`),
  INDEX `trade_corals_eventHandoffStatus_idx` (`eventHandoffStatus`),
  PRIMARY KEY (`id`),
  CONSTRAINT `trade_corals_tradeId_fkey`
    FOREIGN KEY (`tradeId`) REFERENCES `trades`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `trade_corals_coralId_fkey`
    FOREIGN KEY (`coralId`) REFERENCES `corals`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_addresses` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `line1` VARCHAR(255) NOT NULL,
  `line2` VARCHAR(255) NULL,
  `town` VARCHAR(120) NOT NULL,
  `region` VARCHAR(120) NULL,
  `postalCode` VARCHAR(40) NOT NULL,
  `countryCode` VARCHAR(2) NOT NULL,
  `townLatitude` DOUBLE NULL,
  `townLongitude` DOUBLE NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `user_addresses_userId_key` (`userId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `user_addresses_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `users`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sessions` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `tokenHash` VARCHAR(64) NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `revokedAt` DATETIME(3) NULL,
  UNIQUE INDEX `sessions_tokenHash_key` (`tokenHash`),
  INDEX `sessions_userId_expiresAt_idx` (`userId`, `expiresAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `sessions_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `users`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `magic_link_tokens` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `tokenHash` VARCHAR(64) NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `usedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `requestedIp` VARCHAR(80) NULL,
  UNIQUE INDEX `magic_link_tokens_tokenHash_key` (`tokenHash`),
  INDEX `magic_link_tokens_userId_expiresAt_idx` (`userId`, `expiresAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `magic_link_tokens_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `users`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `admin_audit_logs` (
  `id` VARCHAR(191) NOT NULL,
  `actorUserId` VARCHAR(191) NOT NULL,
  `action` VARCHAR(120) NOT NULL,
  `targetType` VARCHAR(80) NULL,
  `targetId` VARCHAR(40) NULL,
  `metadata` JSON NULL,
  `ip` VARCHAR(80) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `admin_audit_logs_actorUserId_createdAt_idx` (`actorUserId`, `createdAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `admin_audit_logs_actorUserId_fkey`
    FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
