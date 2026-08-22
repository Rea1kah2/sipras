"use server";

import { refresh } from "next/cache";
import { prisma } from "@/lib/prisma";
import { wajibAdmin } from "@/lib/auth";
import { teks } from "@/lib/preferensi-server";
import {
  errorField,
  gagal,
  penutupanSchema,
  pengaturanLayananSchema,
} from "@/lib/validasi";
import { dariISO } from "@/lib/waktu";
import type { HasilAksi } from "@/lib/validasi";

export type StatusJadwal = HasilAksi<null> | null;

/**
 * Simpan hari dan jam layanan.
 *
 * Memakai upsert, bukan update, karena barisnya sengaja tidak dibuat saat
 * dibaca. Lihat alasannya di ambilPengaturan() di lib/penutupan.ts: pembacaan
 * terjadi di halaman yang dirender untuk peminjam juga, dan membuat baris
 * sebagai efek samping GET berarti request baca bisa menulis.
 */
export async function aksiSimpanLayanan(
  _sebelum: StatusJadwal,
  data: FormData
): Promise<StatusJadwal> {
  await wajibAdmin();
  const t = await teks();

  const hasil = pengaturanLayananSchema.safeParse({
    // getAll, bukan get. Checkbox bernama sama mengirim satu entri per hari
    // yang dicentang, dan get() hanya mengembalikan yang pertama sehingga
    // enam hari akan tersimpan sebagai satu hari.
    hariLayanan: data.getAll("hariLayanan"),
    jamBuka: data.get("jamBuka"),
    jamTutup: data.get("jamTutup"),
  });
  if (!hasil.success) {
    const e = errorField(hasil.error);
    return gagal(
      e.hariLayanan
        ? t.jadwal.minimalSatuHari
        : e.jamTutup?.some((p) => p.includes("setelah"))
          ? t.jadwal.jamTerbalik
          : t.jadwal.jamTidakValid,
      e
    );
  }

  // Diurutkan sebelum disimpan supaya kolomnya selalu punya bentuk yang sama.
  // Tanpa ini urutan bergantung pada urutan checkbox di HTML, dan
  // membandingkan dua baris jadi ikut bergantung pada urutan itu.
  const hariLayanan = [...new Set(hasil.data.hariLayanan)].sort((a, b) => a - b);

  await prisma.pengaturan.upsert({
    where: { id: "tunggal" },
    update: { hariLayanan, jamBuka: hasil.data.jamBuka, jamTutup: hasil.data.jamTutup },
    create: {
      id: "tunggal",
      hariLayanan,
      jamBuka: hasil.data.jamBuka,
      jamTutup: hasil.data.jamTutup,
    },
  });

  refresh();
  return { ok: true, data: null, pesan: t.jadwal.tersimpan };
}

/**
 * Tandai satu tanggal, atau satu rentang, sebagai tutup.
 *
 * Tanggal yang sudah ditandai DILEWATI, bukan menggagalkan seluruh
 * penyerahan. Menandai libur seminggu lalu ditolak seluruhnya cuma karena
 * satu hari di tengahnya sudah pernah ditandai akan memaksa admin memecah
 * rentangnya sendiri secara manual. createMany dengan skipDuplicates
 * menyerahkan penjagaannya ke batasan unik di basis data, jadi dua admin yang
 * menyimpan bersamaan pun tidak bisa membuat baris ganda.
 */
export async function aksiTandaiTutup(
  _sebelum: StatusJadwal,
  data: FormData
): Promise<StatusJadwal> {
  const admin = await wajibAdmin();
  const t = await teks();

  const hasil = penutupanSchema.safeParse({
    tanggal: data.get("tanggal"),
    tanggalAkhir: data.get("tanggalAkhir") ?? "",
    alasan: data.get("alasan"),
    jenis: data.get("jenis"),
  });
  if (!hasil.success) {
    const e = errorField(hasil.error);
    return gagal(
      e.tanggalAkhir
        ? e.tanggalAkhir[0].includes("60")
          ? t.jadwal.terlaluPanjang
          : t.jadwal.rentangTerbalik
        : e.alasan
          ? t.jadwal.beriAlasan
          : t.jadwal.rentangTerbalik,
      e
    );
  }

  const { tanggal, tanggalAkhir, alasan, jenis } = hasil.data;

  // Menandai masa lalu tidak dilarang, dan itu disengaja. Admin yang baru
  // memasang sistem ini wajar mengisi kalender libur setahun penuh, termasuk
  // bulan yang sudah lewat, supaya laporannya utuh. Yang dijaga cuma satu:
  // tanggal lewat tidak bisa mengubah pengajuan yang sudah berjalan, dan itu
  // memang tidak terjadi karena penutupan hanya diperiksa saat mengajukan.

  const hari: Date[] = [];
  const akhir = dariISO(tanggalAkhir ?? tanggal);
  for (let tt = dariISO(tanggal).getTime(); tt <= akhir.getTime(); tt += 86_400_000) {
    hari.push(new Date(tt));
  }

  const dibuat = await prisma.penutupan.createMany({
    data: hari.map((d) => ({ tanggal: d, alasan, jenis, olehId: admin.id })),
    skipDuplicates: true,
  });

  const dilewati = hari.length - dibuat.count;
  const pesan =
    (dibuat.count === 1
      ? t.jadwal.ditandaiSatu
      : t.jadwal.ditandai.replace("{n}", String(dibuat.count))) +
    (dilewati > 0 ? ` ${t.jadwal.dilewati.replace("{n}", String(dilewati))}` : "");

  refresh();
  return { ok: true, data: null, pesan };
}

/** Buka kembali satu tanggal. */
export async function aksiBukaKembali(id: string): Promise<void> {
  await wajibAdmin();
  // deleteMany, bukan delete, supaya tombol yang ditekan dua kali tidak
  // melempar error karena barisnya sudah hilang di tekanan pertama.
  await prisma.penutupan.deleteMany({ where: { id } });
  refresh();
}
