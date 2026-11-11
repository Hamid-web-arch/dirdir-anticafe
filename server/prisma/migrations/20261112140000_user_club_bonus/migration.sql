-- DırDır Club: admin status verəndə "bonus ziyarət" (müştəri həmin statusdan adi qayda ilə davam edir)
ALTER TABLE "User" ADD COLUMN "clubBonus" INTEGER;
ALTER TABLE "User" ADD COLUMN "clubBonusUntil" TEXT;
