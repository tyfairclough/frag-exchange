-- Add uploaded avatar image variants while keeping emoji fallback.
ALTER TABLE "users"
ADD COLUMN "avatar40Url" VARCHAR(2048),
ADD COLUMN "avatar80Url" VARCHAR(2048),
ADD COLUMN "avatar256Url" VARCHAR(2048),
ADD COLUMN "avatarUpdatedAt" TIMESTAMP(3);
