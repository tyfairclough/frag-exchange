-- CreateEnum
CREATE TYPE "UserPostingRole" AS ENUM ('LFS', 'ONLINE_RETAILER');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "postingRole" "UserPostingRole";
