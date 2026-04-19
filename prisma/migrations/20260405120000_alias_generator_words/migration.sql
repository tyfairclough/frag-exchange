-- Alias generator vocabulary (onboarding default aliases)
CREATE TABLE "alias_generator_words" (
    "id" TEXT NOT NULL,
    "word" VARCHAR(64) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "alias_generator_words_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "alias_generator_words_word_key" ON "alias_generator_words"("word");

INSERT INTO "alias_generator_words" ("id", "word", "createdAt") VALUES
    ('aliasgen_reefer', 'reefer', CURRENT_TIMESTAMP),
    ('aliasgen_idle', 'idle', CURRENT_TIMESTAMP),
    ('aliasgen_boss', 'boss', CURRENT_TIMESTAMP),
    ('aliasgen_reef', 'reef', CURRENT_TIMESTAMP),
    ('aliasgen_fishy', 'fishy', CURRENT_TIMESTAMP),
    ('aliasgen_business', 'business', CURRENT_TIMESTAMP),
    ('aliasgen_tang', 'tang', CURRENT_TIMESTAMP),
    ('aliasgen_gang', 'gang', CURRENT_TIMESTAMP),
    ('aliasgen_tank', 'tank', CURRENT_TIMESTAMP),
    ('aliasgen_coral', 'coral', CURRENT_TIMESTAMP),
    ('aliasgen_acro', 'acro', CURRENT_TIMESTAMP),
    ('aliasgen_stripper', 'stripper', CURRENT_TIMESTAMP),
    ('aliasgen_lobo', 'lobo', CURRENT_TIMESTAMP),
    ('aliasgen_millie', 'millie', CURRENT_TIMESTAMP),
    ('aliasgen_mandarin', 'mandarin', CURRENT_TIMESTAMP),
    ('aliasgen_guest', 'guest', CURRENT_TIMESTAMP),
    ('aliasgen_lps', 'lps', CURRENT_TIMESTAMP),
    ('aliasgen_collector', 'collector', CURRENT_TIMESTAMP),
    ('aliasgen_diver', 'diver', CURRENT_TIMESTAMP),
    ('aliasgen_aquarist', 'aquarist', CURRENT_TIMESTAMP),
    ('aliasgen_old', 'old', CURRENT_TIMESTAMP),
    ('aliasgen_young', 'young', CURRENT_TIMESTAMP),
    ('aliasgen_hot', 'hot', CURRENT_TIMESTAMP),
    ('aliasgen_critters', 'critters', CURRENT_TIMESTAMP),
    ('aliasgen_crab', 'crab', CURRENT_TIMESTAMP),
    ('aliasgen_rabbit', 'rabbit', CURRENT_TIMESTAMP),
    ('aliasgen_anthia', 'anthia', CURRENT_TIMESTAMP),
    ('aliasgen_mushroom', 'mushroom', CURRENT_TIMESTAMP),
    ('aliasgen_birdsnest', 'birdsnest', CURRENT_TIMESTAMP),
    ('aliasgen_stylo', 'stylo', CURRENT_TIMESTAMP),
    ('aliasgen_monti', 'monti', CURRENT_TIMESTAMP);
