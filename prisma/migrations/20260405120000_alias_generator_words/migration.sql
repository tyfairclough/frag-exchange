-- Alias generator vocabulary (onboarding default aliases)
CREATE TABLE `alias_generator_words` (
    `id` VARCHAR(191) NOT NULL,
    `word` VARCHAR(64) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `alias_generator_words_word_key`(`word`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `alias_generator_words` (`id`, `word`, `createdAt`) VALUES
    ('aliasgen_reefer', 'reefer', CURRENT_TIMESTAMP(3)),
    ('aliasgen_idle', 'idle', CURRENT_TIMESTAMP(3)),
    ('aliasgen_boss', 'boss', CURRENT_TIMESTAMP(3)),
    ('aliasgen_reef', 'reef', CURRENT_TIMESTAMP(3)),
    ('aliasgen_fishy', 'fishy', CURRENT_TIMESTAMP(3)),
    ('aliasgen_business', 'business', CURRENT_TIMESTAMP(3)),
    ('aliasgen_tang', 'tang', CURRENT_TIMESTAMP(3)),
    ('aliasgen_gang', 'gang', CURRENT_TIMESTAMP(3)),
    ('aliasgen_tank', 'tank', CURRENT_TIMESTAMP(3)),
    ('aliasgen_coral', 'coral', CURRENT_TIMESTAMP(3)),
    ('aliasgen_acro', 'acro', CURRENT_TIMESTAMP(3)),
    ('aliasgen_stripper', 'stripper', CURRENT_TIMESTAMP(3)),
    ('aliasgen_lobo', 'lobo', CURRENT_TIMESTAMP(3)),
    ('aliasgen_millie', 'millie', CURRENT_TIMESTAMP(3)),
    ('aliasgen_mandarin', 'mandarin', CURRENT_TIMESTAMP(3)),
    ('aliasgen_guest', 'guest', CURRENT_TIMESTAMP(3)),
    ('aliasgen_lps', 'lps', CURRENT_TIMESTAMP(3)),
    ('aliasgen_collector', 'collector', CURRENT_TIMESTAMP(3)),
    ('aliasgen_diver', 'diver', CURRENT_TIMESTAMP(3)),
    ('aliasgen_aquarist', 'aquarist', CURRENT_TIMESTAMP(3)),
    ('aliasgen_old', 'old', CURRENT_TIMESTAMP(3)),
    ('aliasgen_young', 'young', CURRENT_TIMESTAMP(3)),
    ('aliasgen_hot', 'hot', CURRENT_TIMESTAMP(3)),
    ('aliasgen_critters', 'critters', CURRENT_TIMESTAMP(3)),
    ('aliasgen_crab', 'crab', CURRENT_TIMESTAMP(3)),
    ('aliasgen_rabbit', 'rabbit', CURRENT_TIMESTAMP(3)),
    ('aliasgen_anthia', 'anthia', CURRENT_TIMESTAMP(3)),
    ('aliasgen_mushroom', 'mushroom', CURRENT_TIMESTAMP(3)),
    ('aliasgen_birdsnest', 'birdsnest', CURRENT_TIMESTAMP(3)),
    ('aliasgen_stylo', 'stylo', CURRENT_TIMESTAMP(3)),
    ('aliasgen_monti', 'monti', CURRENT_TIMESTAMP(3));
