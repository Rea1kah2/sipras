-- CreateEnum
CREATE TYPE "JenisPengingat" AS ENUM ('SEHARI_LAGI', 'HARI_INI', 'TERLAMBAT');

-- CreateTable
CREATE TABLE "Pengingat" (
    "id" TEXT NOT NULL,
    "pengajuanId" TEXT NOT NULL,
    "jenis" "JenisPengingat" NOT NULL,
    "dibuatPada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pengingat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Pengingat_pengajuanId_jenis_key" ON "Pengingat"("pengajuanId", "jenis");

-- AddForeignKey
ALTER TABLE "Pengingat" ADD CONSTRAINT "Pengingat_pengajuanId_fkey" FOREIGN KEY ("pengajuanId") REFERENCES "Pengajuan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
