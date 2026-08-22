-- CreateEnum
CREATE TYPE "JenisPenutupan" AS ENUM ('LIBUR', 'PERAWATAN', 'LAIN');

-- CreateTable
CREATE TABLE "Penutupan" (
    "id" TEXT NOT NULL,
    "tanggal" DATE NOT NULL,
    "alasan" TEXT NOT NULL,
    "jenis" "JenisPenutupan" NOT NULL DEFAULT 'LIBUR',
    "olehId" TEXT,
    "dibuatPada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Penutupan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pengaturan" (
    "id" TEXT NOT NULL DEFAULT 'tunggal',
    "hariLayanan" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5, 6]::INTEGER[],
    "jamBuka" TEXT NOT NULL DEFAULT '08.00',
    "jamTutup" TEXT NOT NULL DEFAULT '16.00',
    "diubahPada" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pengaturan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Penutupan_tanggal_key" ON "Penutupan"("tanggal");

-- CreateIndex
CREATE INDEX "Penutupan_tanggal_idx" ON "Penutupan"("tanggal");

-- AddForeignKey
ALTER TABLE "Penutupan" ADD CONSTRAINT "Penutupan_olehId_fkey" FOREIGN KEY ("olehId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
