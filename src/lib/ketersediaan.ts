import { prisma } from "@/lib/prisma";
import { STATUS_MEMAKAI_ASET } from "@/lib/status";
import { dariISO, fmtTanggal } from "@/lib/waktu";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Ketersediaan TIDAK PERNAH disimpan sebagai kolom di tabel Aset. Selalu
 * dihitung dari pengajuan berstatus DISETUJUI/DIPINJAM yang beririsan
 * tanggal. Satu sumber kebenaran, mustahil jadi tidak sinkron.
 */

/** Bisa dipanggil di luar maupun di dalam prisma.$transaction. */
export type KlienDB = Prisma.TransactionClient | typeof prisma;

export type PermintaanItem = {
  asetId: string;
  jumlah: number;
};

export type Bentrok = {
  asetId: string;
  namaAset: string;
  pesan: string;
};

type BarisPemakaian = {
  asetId: string;
  jumlah: number;
  mulai: Date;
  selesai: Date;
};

/**
 * Tanggal efektif mulai terpakai: yang lebih awal antara tanggal yang
 * diajukan dan tanggal serah terima sungguhan.
 *
 * Serah terima sebelum tanggal mulai sengaja diizinkan di /admin/serah,
 * tapi kalau ketersediaan tetap dihitung dari tanggal yang diajukan, aset
 * yang sudah di tangan peminjam bisa terlihat "tersedia" di hari yang sama
 * ia diserahkan. Fungsi ini yang menutup celah itu, dipakai baik oleh
 * puncakPemakaian/hariTerisi di sini maupun jadwalRuang di lib/kalender.ts.
 */
export function efektifMulai(mulai: Date, diserahkanPada: Date | null): Date {
  if (diserahkanPada && diserahkanPada.getTime() < mulai.getTime()) {
    return diserahkanPada;
  }
  return mulai;
}

/**
 * Puncak pemakaian tiap aset di dalam rentang yang diminta.
 *
 * Menjumlahkan seluruh pengajuan yang beririsan itu SALAH: dua pengajuan bisa
 * sama-sama menyentuh rentang kita tapi tidak saling beririsan, jadi tidak
 * pernah dipakai bersamaan. Yang benar adalah puncak pemakaian harian,
 * dihitung dengan sweep-line atas titik masuk/keluar tiap pemakaian.
 */
export async function puncakPemakaian(
  db: KlienDB,
  asetIds: string[],
  mulai: Date,
  selesai: Date,
  kecualiPengajuanId?: string
): Promise<Map<string, number>> {
  const hasil = new Map<string, number>();
  if (asetIds.length === 0) return hasil;

  const baris = await db.pengajuanItem.findMany({
    where: {
      asetId: { in: asetIds },
      pengajuan: {
        status: { in: STATUS_MEMAKAI_ASET },
        // Irisan rentang: mulaiA <= selesaiB && mulaiB <= selesaiA. Sisi
        // "mulaiA" memakai OR dengan diserahkanPada, supaya pengajuan yang
        // diserahkan lebih awal dari tanggal yang diajukan tetap ketemu
        // walau tanggal yang diajukan sendiri belum menyentuh rentang ini.
        OR: [{ mulai: { lte: selesai } }, { diserahkanPada: { lte: selesai } }],
        selesai: { gte: mulai },
        ...(kecualiPengajuanId ? { id: { not: kecualiPengajuanId } } : {}),
      },
    },
    select: {
      asetId: true,
      jumlah: true,
      pengajuan: { select: { mulai: true, selesai: true, diserahkanPada: true } },
    },
  });

  const perAset = new Map<string, BarisPemakaian[]>();
  for (const b of baris) {
    const daftar = perAset.get(b.asetId) ?? [];
    daftar.push({
      asetId: b.asetId,
      jumlah: b.jumlah,
      mulai: efektifMulai(b.pengajuan.mulai, b.pengajuan.diserahkanPada),
      selesai: b.pengajuan.selesai,
    });
    perAset.set(b.asetId, daftar);
  }

  for (const asetId of asetIds) {
    hasil.set(asetId, puncakSatuAset(perAset.get(asetId) ?? [], mulai, selesai));
  }
  return hasil;
}

/** Sweep-line: +jumlah saat pemakaian mulai, -jumlah sehari setelah selesai. */
function puncakSatuAset(
  daftar: BarisPemakaian[],
  mulai: Date,
  selesai: Date
): number {
  if (daftar.length === 0) return 0;

  const peristiwa: { hari: number; delta: number }[] = [];
  const batasAwal = mulai.getTime();
  const batasAkhir = selesai.getTime();

  for (const d of daftar) {
    // Potong ke rentang yang ditanyakan, pemakaian di luar rentang tidak relevan.
    const masuk = Math.max(d.mulai.getTime(), batasAwal);
    const keluar = Math.min(d.selesai.getTime(), batasAkhir);
    if (masuk > keluar) continue;
    peristiwa.push({ hari: masuk, delta: d.jumlah });
    peristiwa.push({ hari: keluar + 86_400_000, delta: -d.jumlah });
  }

  // Urut per hari; pengurangan didahulukan agar pemakaian yang selesai
  // tidak terhitung bersamaan dengan yang mulai di hari berikutnya.
  peristiwa.sort((a, b) => a.hari - b.hari || a.delta - b.delta);

  let berjalan = 0;
  let puncak = 0;
  for (const p of peristiwa) {
    berjalan += p.delta;
    if (berjalan > puncak) puncak = berjalan;
  }
  return puncak;
}

/**
 * Validasi satu keranjang pengajuan. Dipakai dua kali: saat form berubah
 * (umpan balik cepat) dan sekali lagi DI DALAM transaksi sebelum simpan.
 * Yang kedua inilah yang mencegah dua orang menyetujui ruang sama di detik
 * yang sama.
 */
export async function cekBentrok(
  db: KlienDB,
  items: PermintaanItem[],
  mulai: Date,
  selesai: Date,
  kecualiPengajuanId?: string
): Promise<Bentrok[]> {
  if (items.length === 0) return [];

  const asetIds = items.map((i) => i.asetId);
  const [aset, puncak] = await Promise.all([
    db.aset.findMany({
      where: { id: { in: asetIds } },
      select: { id: true, nama: true, tipe: true, stok: true, aktif: true },
    }),
    puncakPemakaian(db, asetIds, mulai, selesai, kecualiPengajuanId),
  ]);

  const petaAset = new Map(aset.map((a) => [a.id, a]));
  const bentrok: Bentrok[] = [];

  for (const item of items) {
    const a = petaAset.get(item.asetId);
    if (!a) {
      bentrok.push({
        asetId: item.asetId,
        namaAset: "Aset tidak dikenal",
        pesan: "Aset ini sudah tidak ada di katalog. Hapus dari pengajuan.",
      });
      continue;
    }
    if (!a.aktif) {
      bentrok.push({
        asetId: a.id,
        namaAset: a.nama,
        pesan: `${a.nama} sudah dinonaktifkan admin. Hapus dari pengajuan atau pilih yang lain.`,
      });
      continue;
    }

    const terpakai = puncak.get(a.id) ?? 0;

    if (a.tipe === "RUANG") {
      // Ruang: satu irisan saja sudah cukup untuk menolak.
      if (terpakai > 0) {
        bentrok.push({
          asetId: a.id,
          namaAset: a.nama,
          pesan: `${a.nama} sudah dipesan pada rentang ${fmtTanggal(mulai)} - ${fmtTanggal(selesai)}. Pilih tanggal lain atau ganti ruang.`,
        });
      }
      continue;
    }

    // Barang: bandingkan permintaan dengan sisa stok pada puncak pemakaian.
    const sisa = a.stok - terpakai;
    if (item.jumlah > sisa) {
      bentrok.push({
        asetId: a.id,
        namaAset: a.nama,
        pesan: `${a.nama}: tersisa ${Math.max(0, sisa)} dari ${a.stok} unit di tanggal ini, kamu meminta ${item.jumlah}. Kurangi jumlahnya atau ubah tanggal.`,
      });
    }
  }

  return bentrok;
}

export type Ketersediaan = {
  tersedia: number;
  total: number;
  terpakai: number;
  /** true bila aset masih bisa dipinjam pada rentang tsb. */
  bisaDipinjam: boolean;
  teks: string;
  nuansa: "sage" | "warm" | "deep";
};

/** Ringkasan ketersediaan untuk ditampilkan di kartu katalog / tabel admin. */
/**
 * Teks ketersediaan yang tampil di badge katalog dan tabel aset.
 *
 * Kamus dioper sebagai argumen opsional, bukan dibaca dari cookie, karena
 * berkas ini pustaka murni yang juga dipakai dari aksi server dan skrip uji.
 * Cadangannya bahasa Indonesia, jadi pemanggil lama tetap benar.
 */
export type TeksKetersediaan = {
  kosongHari: string;
  sudahDipesan: string;
  stokHabis: string;
  unitSiap: string;
};

const TEKS_BAWAAN: TeksKetersediaan = {
  kosongHari: "Kosong",
  sudahDipesan: "Sudah dipesan",
  stokHabis: "Stok habis",
  unitSiap: "{sisa} dari {total} unit siap",
};

export async function ringkasKetersediaan(
  db: KlienDB,
  aset: { id: string; tipe: "BARANG" | "RUANG"; stok: number }[],
  mulai: Date,
  selesai: Date,
  kt: TeksKetersediaan = TEKS_BAWAAN
): Promise<Map<string, Ketersediaan>> {
  const puncak = await puncakPemakaian(
    db,
    aset.map((a) => a.id),
    mulai,
    selesai
  );

  const hasil = new Map<string, Ketersediaan>();
  for (const a of aset) {
    const terpakai = puncak.get(a.id) ?? 0;

    if (a.tipe === "RUANG") {
      const dipakai = terpakai > 0;
      hasil.set(a.id, {
        tersedia: dipakai ? 0 : 1,
        total: 1,
        terpakai: dipakai ? 1 : 0,
        bisaDipinjam: !dipakai,
        teks: dipakai ? kt.sudahDipesan : kt.kosongHari,
        nuansa: dipakai ? "warm" : "sage",
      });
      continue;
    }

    const sisa = Math.max(0, a.stok - terpakai);
    hasil.set(a.id, {
      tersedia: sisa,
      total: a.stok,
      terpakai,
      bisaDipinjam: sisa > 0,
      teks:
        sisa === 0
          ? kt.stokHabis
          : kt.unitSiap.replace("{sisa}", String(sisa)).replace("{total}", String(a.stok)),
      nuansa: sisa === 0 ? "deep" : "sage",
    });
  }
  return hasil;
}

/** Hari-hari yang sudah terisi dalam satu bulan, untuk kalender detail ruang. */
export async function hariTerisi(
  db: KlienDB,
  asetId: string,
  tahun: number,
  bulan: number // 1-12
): Promise<Set<string>> {
  const awal = dariISO(`${tahun}-${String(bulan).padStart(2, "0")}-01`);
  const akhirHari = new Date(Date.UTC(tahun, bulan, 0)).getUTCDate();
  const akhir = dariISO(
    `${tahun}-${String(bulan).padStart(2, "0")}-${String(akhirHari).padStart(2, "0")}`
  );

  const baris = await db.pengajuanItem.findMany({
    where: {
      asetId,
      pengajuan: {
        status: { in: STATUS_MEMAKAI_ASET },
        OR: [{ mulai: { lte: akhir } }, { diserahkanPada: { lte: akhir } }],
        selesai: { gte: awal },
      },
    },
    select: { pengajuan: { select: { mulai: true, selesai: true, diserahkanPada: true } } },
  });

  const terisi = new Set<string>();
  for (const b of baris) {
    const mulaiEfektif = efektifMulai(b.pengajuan.mulai, b.pengajuan.diserahkanPada);
    let t = Math.max(mulaiEfektif.getTime(), awal.getTime());
    const habis = Math.min(b.pengajuan.selesai.getTime(), akhir.getTime());
    while (t <= habis) {
      terisi.add(new Date(t).toISOString().slice(0, 10));
      t += 86_400_000;
    }
  }
  return terisi;
}
