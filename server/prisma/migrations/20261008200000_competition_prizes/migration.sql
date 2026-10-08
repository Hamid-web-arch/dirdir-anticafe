-- AlterTable
ALTER TABLE "Competition" ADD COLUMN "prizes" JSONB NOT NULL DEFAULT '[]';
