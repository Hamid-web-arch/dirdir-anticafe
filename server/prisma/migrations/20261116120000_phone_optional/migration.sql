-- Telefon nömrəsi könüllüdür (email ilə qeydiyyat kifayətdir)
ALTER TABLE "User" ALTER COLUMN "phone" DROP NOT NULL;
