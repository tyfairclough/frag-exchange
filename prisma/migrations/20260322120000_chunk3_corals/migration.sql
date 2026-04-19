-- CreateTable
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CoralListingMode') THEN
    CREATE TYPE "CoralListingMode" AS ENUM ('POST', 'MEET', 'BOTH');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CoralProfileStatus') THEN
    CREATE TYPE "CoralProfileStatus" AS ENUM ('UNLISTED', 'TRADED');
  END IF;
END
$$;

CREATE TABLE "corals" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" TEXT NOT NULL,
    "imageUrl" VARCHAR(2048),
    "listingMode" "CoralListingMode" NOT NULL DEFAULT 'BOTH',
    "freeToGoodHome" BOOLEAN NOT NULL DEFAULT false,
    "profileStatus" "CoralProfileStatus" NOT NULL DEFAULT 'UNLISTED',
    "coralType" VARCHAR(120),
    "colour" VARCHAR(120),
    "sizeLabel" VARCHAR(80),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "corals_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "corals_userId_idx" ON "corals"("userId");

-- AddForeignKey
ALTER TABLE "corals" ADD CONSTRAINT "corals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
