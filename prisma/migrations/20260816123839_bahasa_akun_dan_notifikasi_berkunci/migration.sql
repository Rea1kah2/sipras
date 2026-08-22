-- AlterTable
ALTER TABLE "Notifikasi" ADD COLUMN     "data" JSONB,
ADD COLUMN     "kunci" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "bahasa" TEXT NOT NULL DEFAULT 'id';
