-- DırDır Club: admin əl ilə verdiyi status
ALTER TABLE "User" ADD COLUMN "clubTier" TEXT;
ALTER TABLE "User" ADD COLUMN "clubTierSetAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "clubTierSetById" TEXT;
