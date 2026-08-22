"use server";

import { refresh } from "next/cache";
import { prisma } from "@/lib/prisma";
import { wajibAdmin } from "@/lib/auth";
import { simpanFoto } from "@/lib/unggah";
import { asetSchema, errorField, gagal } from "@/lib/validasi";
import { STATUS_MEMAKAI_ASET } from "@/lib/status";
import type { HasilAksi } from "@/lib/validasi";

export type StatusAset = HasilAksi<null> | null;

export async function aksiSimpanAset(
  _sebelum: StatusAset,
  data: FormData
): Promise<StatusAset> {
  await wajibAdmin();

  const id = String(data.get("id") ?? "").trim();

  const hasil = asetSchema.safeParse({
    nama: data.get("nama"),
    tipe: data.get("tipe"),
    kategori: data.get("kategori"),
    deskripsi: data.get("deskripsi") ?? "",
    lokasi: data.get("lokasi") ?? "",
    kapasitasAtauStok: data.get("kapasitasAtauStok"),
  });
  if (!hasil.success) {
    return gagal("Periksa lagi isian kamu.", errorField(hasil.error));
  }

  const foto = await simpanFoto(data.get("foto"));
  if (!foto.ok) return gagal(foto.pesan, { foto: [foto.pesan] });

  const ruang = hasil.data.tipe === "RUANG";
  const isi = {
    nama: hasil.data.nama,
    tipe: hasil.data.tipe,
    kategori: hasil.data.kategori,
    deskripsi: hasil.data.deskripsi,
    lokasi: hasil.data.lokasi,
    // Ruang selalu berstok 1: satu ruang tidak bisa dipakai dua acara
    // sekaligus, dan itulah yang membuat cek bentroknya jadi sederhana.
    stok: ruang ? 1 : hasil.data.kapasitasAtauStok,
    kapasitas: ruang ? hasil.data.kapasitasAtauStok : null,
    // Foto lama dipertahankan kalau admin tidak mengunggah yang baru.
    ...(foto.jalur ? { foto: foto.jalur } : {}),
  };

  if (id) {
    const ada = await prisma.aset.findUnique({ where: { id }, select: { id: true } });
    if (!ada) return gagal("Aset tidak ditemukan.");
    await prisma.aset.update({ where: { id }, data: isi });
  } else {
    await prisma.aset.create({ data: isi });
  }

  refresh();
  return {
    ok: true,
    data: null,
    pesan: id ? `${isi.nama} diperbarui.` : `${isi.nama} ditambahkan ke katalog.`,
  };
}

export async function aksiHapusAset(
  _sebelum: StatusAset,
  data: FormData
): Promise<StatusAset> {
  await wajibAdmin();

  const id = String(data.get("id") ?? "");
  const aset = await prisma.aset.findUnique({
    where: { id },
    select: { id: true, nama: true },
  });
  if (!aset) return gagal("Aset tidak ditemukan.");

  // Aset yang sedang dipakai tidak boleh hilang dari katalog di tengah jalan,
  // karena pengajuan berjalan masih menggantung padanya.
  const dipakai = await prisma.pengajuanItem.count({
    where: { asetId: id, pengajuan: { status: { in: STATUS_MEMAKAI_ASET } } },
  });
  if (dipakai > 0) {
    return gagal(
      `${aset.nama} masih terikat ${dipakai} pengajuan yang disetujui atau sedang dipinjam. Selesaikan dulu pengajuannya.`
    );
  }

  // Dinonaktifkan, bukan dihapus, supaya riwayat peminjaman lama tetap bisa
  // menampilkan namanya.
  await prisma.aset.update({ where: { id }, data: { aktif: false } });

  refresh();
  return { ok: true, data: null, pesan: `${aset.nama} dinonaktifkan dari katalog.` };
}

export async function aksiAktifkanAset(
  _sebelum: StatusAset,
  data: FormData
): Promise<StatusAset> {
  await wajibAdmin();
  const id = String(data.get("id") ?? "");
  const aset = await prisma.aset.findUnique({ where: { id }, select: { nama: true } });
  if (!aset) return gagal("Aset tidak ditemukan.");

  await prisma.aset.update({ where: { id }, data: { aktif: true } });
  refresh();
  return { ok: true, data: null, pesan: `${aset.nama} diaktifkan lagi.` };
}
