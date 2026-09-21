import "server-only";
import { prisma } from "@/lib/prisma";
import { efektifMulai } from "@/lib/ketersediaan";
import { STATUS_MEMAKAI_ASET } from "@/lib/status";
import { dariISO, keISO } from "@/lib/waktu";

/**
 * Jadwal semua ruang dalam satu rentang, untuk kalender gabungan.
 *
 * Sebelumnya kalender hanya ada di halaman rincian satu ruang, jadi
 * membandingkan beberapa ruang berarti bolak balik antar halaman. Di sini
 * semuanya masuk satu kisi sehingga bentrok terlihat sebelum orang
 * mengajukan.
 *
 * Definisi "terpakai" sengaja disamakan persis dengan yang dipakai
 * pengecekan bentrok di lib/ketersediaan.ts: status ada di
 * STATUS_MEMAKAI_ASET, dan rentangnya beririsan. Kalau kalender memakai
 * definisi sendiri, ia bisa memperlihatkan slot kosong yang ternyata ditolak
 * saat pengajuan dikirim, dan itu jenis bug yang paling merusak kepercayaan.
 */

export type SlotTerpakai = {
  kode: string;
  pemohon: string;
  /** Hari pertama dan terakhir pemakaian, untuk menyambung batang di kisi. */
  mulai: string;
  selesai: string;
};

export type BarisJadwal = {
  id: string;
  nama: string;
  lokasi: string;
  kapasitas: number | null;
  /** Kunci tanggal ISO, nilainya pemakaian di hari itu. */
  terisi: Map<string, SlotTerpakai>;
};

export async function jadwalRuang(
  mulai: Date,
  selesai: Date
): Promise<BarisJadwal[]> {
  const ruang = await prisma.aset.findMany({
    where: { tipe: "RUANG", aktif: true },
    orderBy: [{ kategori: "asc" }, { nama: "asc" }],
    select: { id: true, nama: true, lokasi: true, kapasitas: true },
  });
  if (ruang.length === 0) return [];

  const baris = await prisma.pengajuanItem.findMany({
    where: {
      asetId: { in: ruang.map((r) => r.id) },
      pengajuan: {
        status: { in: STATUS_MEMAKAI_ASET },
        // Irisan rentang, sama persis dengan puncakPemakaian, termasuk sisi
        // diserahkanPada supaya serah terima lebih awal ikut ketemu.
        OR: [{ mulai: { lte: selesai } }, { diserahkanPada: { lte: selesai } }],
        selesai: { gte: mulai },
      },
    },
    select: {
      asetId: true,
      pengajuan: {
        select: {
          kode: true,
          mulai: true,
          selesai: true,
          diserahkanPada: true,
          pemohon: { select: { nama: true } },
        },
      },
    },
  });

  const perAset = new Map<string, Map<string, SlotTerpakai>>();
  for (const b of baris) {
    const peta = perAset.get(b.asetId) ?? new Map<string, SlotTerpakai>();
    const slot: SlotTerpakai = {
      kode: b.pengajuan.kode,
      pemohon: b.pengajuan.pemohon.nama,
      mulai: keISO(b.pengajuan.mulai),
      selesai: keISO(b.pengajuan.selesai),
    };

    // Isi hari per hari, tapi hanya yang jatuh di dalam rentang yang diminta.
    const mulaiEfektif = efektifMulai(b.pengajuan.mulai, b.pengajuan.diserahkanPada);
    let t = Math.max(mulaiEfektif.getTime(), mulai.getTime());
    const habis = Math.min(b.pengajuan.selesai.getTime(), selesai.getTime());
    while (t <= habis) {
      peta.set(new Date(t).toISOString().slice(0, 10), slot);
      t += 86_400_000;
    }
    perAset.set(b.asetId, peta);
  }

  return ruang.map((r) => ({
    ...r,
    terisi: perAset.get(r.id) ?? new Map(),
  }));
}

/**
 * Benarkah ini tanggal yang ada di kalender?
 *
 * Memeriksa bentuk saja tidak cukup: "9999-99-99" lolos pola empat-dua-dua
 * tapi bukan tanggal nyata, dan menghasilkan Invalid Date yang membuat
 * halaman jatuh. Cara paling meyakinkan adalah membangun tanggalnya lalu
 * memastikan komponennya kembali utuh, karena Date diam diam menggeser
 * nilai yang melewati batas, misalnya 31 Februari jadi 3 Maret.
 */
export function tanggalSah(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const [y, b, h] = iso.split("-").map(Number);
  const d = new Date(Date.UTC(y, b - 1, h));
  return (
    d.getUTCFullYear() === y &&
    d.getUTCMonth() === b - 1 &&
    d.getUTCDate() === h
  );
}

/** Tujuh tanggal ISO mulai dari Senin pekan yang memuat tanggal acuan. */
export function pekanDari(isoAcuan: string): string[] {
  const acuan = dariISO(isoAcuan);
  // getUTCDay: Minggu = 0. Digeser supaya Senin jadi awal pekan.
  const geser = (acuan.getUTCDay() + 6) % 7;
  const senin = new Date(acuan.getTime() - geser * 86_400_000);
  return Array.from({ length: 7 }, (_, i) =>
    keISO(new Date(senin.getTime() + i * 86_400_000))
  );
}

/** Geser satu pekan ke depan atau ke belakang. */
export function geserPekan(isoAcuan: string, arah: number): string {
  return keISO(new Date(dariISO(isoAcuan).getTime() + arah * 7 * 86_400_000));
}
