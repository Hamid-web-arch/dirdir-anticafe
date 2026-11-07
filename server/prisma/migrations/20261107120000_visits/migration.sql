-- CreateTable
CREATE TABLE "Visit" (
    "id" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "minutes" INTEGER,
    "amount" DECIMAL(8,2),
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Visit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Visit_day_startedAt_idx" ON "Visit"("day", "startedAt");

-- CreateIndex
CREATE INDEX "Visit_userId_startedAt_idx" ON "Visit"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "Visit_endedAt_idx" ON "Visit"("endedAt");

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

