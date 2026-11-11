-- Hədiyyə çarxının hədiyyəsi sifarişdəki nəfərə tətbiq olunur
ALTER TABLE "VisitPerson" ADD COLUMN "spinId" TEXT;
ALTER TABLE "VisitPerson" ADD COLUMN "gift" JSONB;

CREATE UNIQUE INDEX "VisitPerson_spinId_key" ON "VisitPerson"("spinId");

ALTER TABLE "VisitPerson" ADD CONSTRAINT "VisitPerson_spinId_fkey" FOREIGN KEY ("spinId") REFERENCES "WheelSpin"("id") ON DELETE SET NULL ON UPDATE CASCADE;
