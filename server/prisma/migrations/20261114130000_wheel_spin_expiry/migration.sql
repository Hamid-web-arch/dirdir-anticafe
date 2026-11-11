-- Hədiyyənin istifadə müddəti
ALTER TABLE "WheelSpin" ADD COLUMN "expiresAt" TIMESTAMP(3);

-- Köhnə hədiyyələr: istifadə olunmayanlara bu gündən 7 gün, qalanlarına qazanılandan 7 gün
UPDATE "WheelSpin" SET "expiresAt" = CASE
  WHEN "usedAt" IS NULL THEN NOW() + INTERVAL '7 days'
  ELSE "createdAt" + INTERVAL '7 days'
END;
