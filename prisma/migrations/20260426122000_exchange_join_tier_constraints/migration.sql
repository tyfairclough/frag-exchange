ALTER TABLE "exchanges"
ADD COLUMN "allowNormalMembersToJoin" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "allowOnlineRetailersToJoin" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "allowLocalFishStoresToJoin" BOOLEAN NOT NULL DEFAULT true;
