-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[];


-- Hazırkı admin(lər) baş admin olur — digər adminləri onlar idarə edir
UPDATE "User" SET "isSuperAdmin" = true WHERE "role" = 'ADMIN';
