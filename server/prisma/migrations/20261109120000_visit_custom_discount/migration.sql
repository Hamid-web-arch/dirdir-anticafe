-- Günün hesabatı: müştəriyə xüsusi endirim (faizlə və ya manatla)
ALTER TABLE "Visit" ADD COLUMN "discountType" TEXT;
ALTER TABLE "Visit" ADD COLUMN "discountValue" DECIMAL(8,2);
