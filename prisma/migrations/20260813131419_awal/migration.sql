-- CreateEnum
CREATE TYPE "Peran" AS ENUM ('PEMINJAM', 'ADMIN');

-- CreateEnum
CREATE TYPE "TipeAset" AS ENUM ('BARANG', 'RUANG');

-- CreateEnum
CREATE TYPE "StatusPengajuan" AS ENUM ('MENUNGGU', 'DISETUJUI', 'DITOLAK', 'DIPINJAM', 'DIKEMBALIKAN', 'SELESAI');

-- CreateEnum
CREATE TYPE "KondisiKembali" AS ENUM ('BAIK', 'RUSAK_RINGAN', 'RUSAK_HILANG');

-- CreateEnum
CREATE TYPE "JenisNotifikasi" AS ENUM ('IN_APP', 'EMAIL');

-- CreateEnum
CREATE TYPE "StatusKirim" AS ENUM ('TERTUNDA', 'TERKIRIM', 'GAGAL');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "peran" "Peran" NOT NULL DEFAULT 'PEMINJAM',
    "whatsapp" TEXT,
    "identitas" TEXT,
    "unit" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "dibuatPada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Aset" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "tipe" "TipeAset" NOT NULL,
    "kategori" TEXT NOT NULL,
    "deskripsi" TEXT NOT NULL DEFAULT '',
    "foto" TEXT,
    "stok" INTEGER NOT NULL DEFAULT 1,
    "kapasitas" INTEGER,
    "lokasi" TEXT NOT NULL DEFAULT '',
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "dibuatPada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diubahPada" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Aset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pengajuan" (
    "id" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "pemohonId" TEXT NOT NULL,
    "mulai" DATE NOT NULL,
    "selesai" DATE NOT NULL,
    "namaKegiatan" TEXT,
    "keperluan" TEXT NOT NULL,
    "kontakWhatsapp" TEXT,
    "status" "StatusPengajuan" NOT NULL DEFAULT 'MENUNGGU',
    "catatanAdmin" TEXT,
    "diajukanPada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diubahPada" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pengajuan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PengajuanItem" (
    "id" TEXT NOT NULL,
    "pengajuanId" TEXT NOT NULL,
    "asetId" TEXT NOT NULL,
    "jumlah" INTEGER NOT NULL DEFAULT 1,
    "namaAset" TEXT NOT NULL,

    CONSTRAINT "PengajuanItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pengembalian" (
    "id" TEXT NOT NULL,
    "pengajuanId" TEXT NOT NULL,
    "tanggalKembali" DATE NOT NULL,
    "kondisiRingkas" "KondisiKembali" NOT NULL DEFAULT 'BAIK',
    "catatan" TEXT,
    "foto" TEXT[],
    "diverifikasi" BOOLEAN NOT NULL DEFAULT false,
    "verifikatorId" TEXT,
    "catatanVerifikasi" TEXT,
    "dibuatPada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diverifikasiPada" TIMESTAMP(3),

    CONSTRAINT "Pengembalian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PengembalianItem" (
    "id" TEXT NOT NULL,
    "pengembalianId" TEXT NOT NULL,
    "pengajuanItemId" TEXT NOT NULL,
    "kondisi" "KondisiKembali" NOT NULL DEFAULT 'BAIK',
    "catatan" TEXT,

    CONSTRAINT "PengembalianItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiwayatStatus" (
    "id" TEXT NOT NULL,
    "pengajuanId" TEXT NOT NULL,
    "dari" "StatusPengajuan",
    "ke" "StatusPengajuan" NOT NULL,
    "olehId" TEXT,
    "catatan" TEXT,
    "waktu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiwayatStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notifikasi" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jenis" "JenisNotifikasi" NOT NULL DEFAULT 'IN_APP',
    "judul" TEXT NOT NULL,
    "isi" TEXT NOT NULL,
    "tautan" TEXT,
    "dibaca" BOOLEAN NOT NULL DEFAULT false,
    "statusKirim" "StatusKirim" NOT NULL DEFAULT 'TERKIRIM',
    "errorKirim" TEXT,
    "dibuatPada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notifikasi_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Aset_tipe_aktif_idx" ON "Aset"("tipe", "aktif");

-- CreateIndex
CREATE INDEX "Aset_kategori_idx" ON "Aset"("kategori");

-- CreateIndex
CREATE UNIQUE INDEX "Pengajuan_kode_key" ON "Pengajuan"("kode");

-- CreateIndex
CREATE INDEX "Pengajuan_status_idx" ON "Pengajuan"("status");

-- CreateIndex
CREATE INDEX "Pengajuan_pemohonId_status_idx" ON "Pengajuan"("pemohonId", "status");

-- CreateIndex
CREATE INDEX "Pengajuan_mulai_selesai_idx" ON "Pengajuan"("mulai", "selesai");

-- CreateIndex
CREATE INDEX "PengajuanItem_asetId_idx" ON "PengajuanItem"("asetId");

-- CreateIndex
CREATE UNIQUE INDEX "PengajuanItem_pengajuanId_asetId_key" ON "PengajuanItem"("pengajuanId", "asetId");

-- CreateIndex
CREATE UNIQUE INDEX "Pengembalian_pengajuanId_key" ON "Pengembalian"("pengajuanId");

-- CreateIndex
CREATE UNIQUE INDEX "PengembalianItem_pengajuanItemId_key" ON "PengembalianItem"("pengajuanItemId");

-- CreateIndex
CREATE INDEX "RiwayatStatus_pengajuanId_waktu_idx" ON "RiwayatStatus"("pengajuanId", "waktu");

-- CreateIndex
CREATE INDEX "Notifikasi_userId_dibaca_idx" ON "Notifikasi"("userId", "dibaca");

-- CreateIndex
CREATE INDEX "Notifikasi_userId_dibuatPada_idx" ON "Notifikasi"("userId", "dibuatPada");

-- AddForeignKey
ALTER TABLE "Pengajuan" ADD CONSTRAINT "Pengajuan_pemohonId_fkey" FOREIGN KEY ("pemohonId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PengajuanItem" ADD CONSTRAINT "PengajuanItem_pengajuanId_fkey" FOREIGN KEY ("pengajuanId") REFERENCES "Pengajuan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PengajuanItem" ADD CONSTRAINT "PengajuanItem_asetId_fkey" FOREIGN KEY ("asetId") REFERENCES "Aset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pengembalian" ADD CONSTRAINT "Pengembalian_pengajuanId_fkey" FOREIGN KEY ("pengajuanId") REFERENCES "Pengajuan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pengembalian" ADD CONSTRAINT "Pengembalian_verifikatorId_fkey" FOREIGN KEY ("verifikatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PengembalianItem" ADD CONSTRAINT "PengembalianItem_pengembalianId_fkey" FOREIGN KEY ("pengembalianId") REFERENCES "Pengembalian"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PengembalianItem" ADD CONSTRAINT "PengembalianItem_pengajuanItemId_fkey" FOREIGN KEY ("pengajuanItemId") REFERENCES "PengajuanItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiwayatStatus" ADD CONSTRAINT "RiwayatStatus_pengajuanId_fkey" FOREIGN KEY ("pengajuanId") REFERENCES "Pengajuan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiwayatStatus" ADD CONSTRAINT "RiwayatStatus_olehId_fkey" FOREIGN KEY ("olehId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notifikasi" ADD CONSTRAINT "Notifikasi_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
