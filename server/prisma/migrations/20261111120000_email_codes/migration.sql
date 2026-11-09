-- Qeydiyyatı təsdiqləmək və şifrəni bərpa etmək üçün emailə göndərilən kodlar
CREATE TABLE "EmailCode" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "data" JSONB,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailCode_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EmailCode_email_purpose_idx" ON "EmailCode"("email", "purpose");
CREATE INDEX "EmailCode_expiresAt_idx" ON "EmailCode"("expiresAt");
