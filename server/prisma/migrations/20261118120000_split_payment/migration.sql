-- Ödənişin bir hissəsi nağd, qalanı kartla
ALTER TABLE "Visit" ADD COLUMN "cashAmount" DECIMAL(8,2);
ALTER TABLE "VisitPerson" ADD COLUMN "cashAmount" DECIMAL(8,2);
