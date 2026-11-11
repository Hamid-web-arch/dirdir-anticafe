-- Günün hesabatı: bir sifarişdə bir neçə nəfər (Club üzvləri və qonaqlar), hər birinin öz payı və ödənişi
CREATE TABLE "VisitPerson" (
    "id" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "userId" TEXT,
    "student" BOOLEAN NOT NULL DEFAULT false,
    "club" JSONB,
    "amount" DECIMAL(8,2),
    "discount" DECIMAL(8,2),
    "paymentMethod" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisitPerson_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "VisitPerson_visitId_idx" ON "VisitPerson"("visitId");
CREATE INDEX "VisitPerson_userId_idx" ON "VisitPerson"("userId");

ALTER TABLE "VisitPerson" ADD CONSTRAINT "VisitPerson_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VisitPerson" ADD CONSTRAINT "VisitPerson_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
