"use server";

import { refresh } from "next/cache";
import { prisma } from "@/lib/prisma";
import { wajibAdmin } from "@/lib/auth";
import { teks } from "@/lib/preferensi-server";
import { alasanTolakPindah, bolehPindah } from "@/lib/status";
import { kirimNotifikasi } from "@/lib/notifikasi";
import { teksItem } from "@/lib/pengajuan";
import { gagal } from "@/lib/validasi";
import { dariISO, hariIniISO, keISO } from "@/lib/waktu";
import type { HasilAksi } from "@/lib/validasi";

export type StatusSerah = HasilAksi<null> | null;

/**
 * Nyatakan barang sudah diserahkan ke peminjam: DISETUJUI menjadi DIPINJAM.
 *
 * Inilah pengganti perpindahan otomatis berdasarkan tanggal yang dulu ada di
 * lib/pengajuan.ts. Bedanya mendasar: perpindahan ini punya PELAKU. Ada admin
 * yang menyatakan barangnya benar benar berpindah tangan, dan namanya tercatat
 * di RiwayatStatus. Tanpa itu, laporan peminjaman bisa menyatakan barang
 * sedang dipinjam padahal tidak pernah ada yang mengambilnya.
 *
 * Serah terima SEBELUM tanggal mulai sengaja diizinkan, karena orang wajar
 * mengambil barang sore hari sebelum acara pagi. Tanggal serah terima
 * sungguhannya dicatat di `diserahkanPada`, dan begitu lebih awal dari
 * `mulai`, itulah yang dipakai lib/ketersediaan.ts (lewat efektifMulai())
 * sebagai awal terpakai, bukan tanggal yang diajukan. Tanpa ini, aset yang
 * sudah di tangan peminjam masih bisa terlihat "tersedia" di hari yang sama
 * ia diserahkan, dan peminjam lain bisa lolos mengajukan aset yang sama.
 */
export async function aksiSerahkan(
  _sebelum: StatusSerah,
  data: FormData
): Promise<StatusSerah> {
  const admin = await wajibAdmin();
  const t = await teks();

  const id = String(data.get("pengajuanId") ?? "").trim();
  if (!id) return gagal(t.serah.tidakDitemukan);

  const pengajuan = await prisma.pengajuan.findUnique({
    where: { id },
    select: {
      id: true,
      kode: true,
      status: true,
      mulai: true,
      selesai: true,
      pemohonId: true,
      items: { select: { namaAset: true, jumlah: true, aset: { select: { tipe: true } } } },
    },
  });
  if (!pengajuan) return gagal(t.serah.tidakDitemukan);

  // Penjaganya mesin status, bukan pemeriksaan tulisan tangan di sini. Dengan
  // begitu tombol yang ditekan dua kali, atau tab lama yang dikirim ulang,
  // ditolak dengan kalimat yang menyebut keadaan sebenarnya.
  if (!bolehPindah(pengajuan.status, "DIPINJAM", "ADMIN")) {
    return gagal(
      alasanTolakPindah(pengajuan.status, "DIPINJAM", "ADMIN") ?? t.serah.tidakBisa
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.pengajuan.update({
      where: { id: pengajuan.id },
      data: { status: "DIPINJAM", diserahkanPada: dariISO(hariIniISO()) },
    });
    await tx.riwayatStatus.create({
      data: {
        pengajuanId: pengajuan.id,
        dari: pengajuan.status,
        ke: "DIPINJAM",
        olehId: admin.id,
        catatan: t.serah.catatanRiwayat,
      },
    });
  });

  // Di luar transaksi: gagal mengirim email tidak boleh membatalkan serah
  // terima yang secara fisik sudah terjadi di loket.
  await kirimNotifikasi({
    userId: pengajuan.pemohonId,
    judul: `${pengajuan.kode} sudah diserahkan`,
    isi: `${teksItem(pengajuan.items)} sudah kamu ambil. Kembalikan paling lambat ${keISO(pengajuan.selesai)}.`,
    kunci: "serah.diserahkan",
    // Tanggal disimpan mentah, bukan hasil format, supaya nama bulannya ikut
    // bahasa pembacanya saat ditampilkan nanti.
    data: {
      kode: pengajuan.kode,
      item: teksItem(pengajuan.items),
      selesai: keISO(pengajuan.selesai),
    },
    tautan: "/pengajuan",
    email: true,
  });

  refresh();
  return {
    ok: true,
    data: null,
    pesan: t.serah.berhasil.replace("{kode}", pengajuan.kode),
  };
}
