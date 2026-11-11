-- Günün hesabatı: beh (əvvəlcədən alınan məbləğ) və onun ödəniş üsulu
ALTER TABLE "Visit" ADD COLUMN "deposit" DECIMAL(8,2);
ALTER TABLE "Visit" ADD COLUMN "depositMethod" TEXT;
