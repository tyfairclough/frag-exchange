-- Add exchange logo variants for fast UI rendering.
ALTER TABLE "exchanges"
  ADD COLUMN "logo40Url" VARCHAR(2048),
  ADD COLUMN "logo80Url" VARCHAR(2048),
  ADD COLUMN "logo512Url" VARCHAR(2048),
  ADD COLUMN "logoUpdatedAt" TIMESTAMP(3);
