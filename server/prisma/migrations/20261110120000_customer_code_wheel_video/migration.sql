-- Müştəri kodu: hər istifadəçiyə nömrə (1001-dən), köhnə istifadəçilər qeydiyyat sırası ilə
ALTER TABLE "User" ADD COLUMN "customerNo" SERIAL NOT NULL;

UPDATE "User" AS u SET "customerNo" = s.rn + 1000
FROM (SELECT id, row_number() OVER (ORDER BY "createdAt", id) AS rn FROM "User") AS s
WHERE u.id = s.id;

SELECT setval(pg_get_serial_sequence('"User"', 'customerNo'), (SELECT COALESCE(MAX("customerNo"), 1000) FROM "User") + 1, false);

CREATE UNIQUE INDEX "User_customerNo_key" ON "User"("customerNo");

-- Hədiyyə çarxı
CREATE TABLE "WheelSpin" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "prize" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMP(3),
    "usedById" TEXT,

    CONSTRAINT "WheelSpin_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WheelSpin_userId_createdAt_idx" ON "WheelSpin"("userId", "createdAt");
CREATE INDEX "WheelSpin_usedAt_createdAt_idx" ON "WheelSpin"("usedAt", "createdAt");

ALTER TABLE "WheelSpin" ADD CONSTRAINT "WheelSpin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Ana səhifənin fon videosu
CREATE TABLE "Video" (
    "id" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Video_pkey" PRIMARY KEY ("id")
);
