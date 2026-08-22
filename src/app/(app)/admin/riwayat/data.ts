import type { Kamus } from "@/lib/kamus";
import "server-only";
import { prisma } from "@/lib/prisma";
import { dariISO, hariIniISO, hitungHari } from "@/lib/waktu";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Kriteria riwayat dipakai bersama oleh halaman tabel dan unduhan CSV,
 * supaya berkas yang diunduh selalu persis sama dengan yang terlihat di layar.
 */

export type FilterRiwayat = { q: string; periode: string };

export function bacaFilter(sp: {
  q?: string;
  periode?: string;
}): FilterRiwayat {
  return { q: (sp.q ?? "").trim(), periode: sp.periode ?? "Semua" };
}

/** Daftar bulan yang bisa dipilih: 6 bulan terakhir dihitung dari hari ini. */
export function opsiPeriode(t: Kamus): { nilai: string; label: string }[] {
  const [tahun, bulan] = hariIniISO().split("-").map(Number);
  const opsi = [{ nilai: "Semua", label: t.riwayat.semuaPeriode }];
  for (let i = 0; i < 6; i++) {
    const d = new Date(Date.UTC(tahun, bulan - 1 - i, 1));
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth() + 1;
    opsi.push({
      nilai: `${y}-${String(m).padStart(2, "0")}`,
      label: `${t.bulanPanjang[m - 1]} ${y}`,
    });
  }
  return opsi;
}

export function kriteria(f: FilterRiwayat): Prisma.PengajuanWhereInput {
  const where: Prisma.PengajuanWhereInput = {
    status: { in: ["SELESAI", "DITOLAK"] },
  };

  if (f.q) {
    where.OR = [
      { kode: { contains: f.q, mode: "insensitive" } },
      { namaKegiatan: { contains: f.q, mode: "insensitive" } },
      { pemohon: { nama: { contains: f.q, mode: "insensitive" } } },
      { pemohon: { unit: { contains: f.q, mode: "insensitive" } } },
      { items: { some: { namaAset: { contains: f.q, mode: "insensitive" } } } },
    ];
  }

  if (f.periode !== "Semua" && /^\d{4}-\d{2}$/.test(f.periode)) {
    const [y, m] = f.periode.split("-").map(Number);
    const awal = dariISO(`${f.periode}-01`);
    const akhirHari = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const akhir = dariISO(`${f.periode}-${String(akhirHari).padStart(2, "0")}`);
    where.selesai = { gte: awal, lte: akhir };
  }

  return where;
}

export function ambilRiwayat(f: FilterRiwayat) {
  return prisma.pengajuan.findMany({
    where: kriteria(f),
    orderBy: { selesai: "desc" },
    select: {
      id: true,
      kode: true,
      status: true,
      mulai: true,
      selesai: true,
      namaKegiatan: true,
      pemohon: { select: { nama: true, unit: true } },
      items: {
        select: { namaAset: true, jumlah: true, aset: { select: { tipe: true } } },
      },
      pengembalian: {
        select: { tanggalKembali: true, kondisiRingkas: true },
      },
    },
  });
}

/* ══════════════════════════════════════════════════════════════════════
   LAPORAN
   Semua kueri di bawah memakai kriteria() yang sama dengan tabel dan
   unduhan CSV. Itu bukan sekadar hemat kode: dengan begitu angka di grafik
   dijamin cocok dengan baris di tabel dan dengan isi berkas CSV. Kalau
   laporan punya kriteria sendiri, cepat atau lambat ketiganya akan berbeda
   dan tidak akan ada yang tahu mana yang benar.
   ══════════════════════════════════════════════════════════════════════ */

export type Laporan = {
  total: number;
  perBulan: { kunciBulan: string; jumlah: number }[];
  asetTeratas: { nama: string; jumlah: number }[];
  unitTeratas: { nama: string; jumlah: number }[];
  rataHari: number;
  sebaranDurasi: { hari: string; jumlah: number }[];
};

export async function ambilLaporan(f: FilterRiwayat): Promise<Laporan> {
  const where = kriteria(f);

  // Hanya kolom yang benar benar dipakai. Menarik seluruh baris untuk
  // dihitung di aplikasi akan pelan diam diam begitu riwayatnya menumpuk
  // bertahun tahun, dan pelannya baru terasa saat sudah terlambat.
  const baris = await prisma.pengajuan.findMany({
    where,
    select: {
      mulai: true,
      selesai: true,
      pemohon: { select: { unit: true } },
      items: { select: { namaAset: true } },
    },
  });

  const total = baris.length;

  // ── tren per bulan, enam bulan terakhir ─────────────────────────────
  const [tahunKini, bulanKini] = hariIniISO().split("-").map(Number);
  const urutBulan: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(tahunKini, bulanKini - 1 - i, 1));
    urutBulan.push(
      `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
    );
  }
  const hitungBulan = new Map(urutBulan.map((b) => [b, 0]));
  for (const r of baris) {
    const kunci = r.selesai.toISOString().slice(0, 7);
    // Bulan di luar enam bulan terakhir sengaja diabaikan, bukan dipaksa
    // masuk ke bulan terdekat, supaya sumbunya jujur.
    if (hitungBulan.has(kunci)) hitungBulan.set(kunci, hitungBulan.get(kunci)! + 1);
  }

  // ── peringkat aset dan unit ─────────────────────────────────────────
  const hitungAset = new Map<string, number>();
  const hitungUnit = new Map<string, number>();
  let totalHari = 0;
  const sebaran = new Map<string, number>([
    ["1", 0],
    ["2", 0],
    ["3", 0],
    ["4+", 0],
  ]);

  for (const r of baris) {
    for (const it of r.items) {
      hitungAset.set(it.namaAset, (hitungAset.get(it.namaAset) ?? 0) + 1);
    }
    const unit = r.pemohon.unit ?? "-";
    hitungUnit.set(unit, (hitungUnit.get(unit) ?? 0) + 1);

    const hari = hitungHari(r.mulai, r.selesai);
    totalHari += hari;
    const ember = hari >= 4 ? "4+" : String(hari);
    sebaran.set(ember, (sebaran.get(ember) ?? 0) + 1);
  }

  const teratas = (m: Map<string, number>, n: number) =>
    [...m.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, n)
      .map(([nama, jumlah]) => ({ nama, jumlah }));

  return {
    total,
    perBulan: urutBulan.map((b) => ({ kunciBulan: b, jumlah: hitungBulan.get(b)! })),
    asetTeratas: teratas(hitungAset, 8),
    unitTeratas: teratas(hitungUnit, 6),
    // Pembagi dijaga tidak nol, supaya penyaring yang tidak cocok apa pun
    // menghasilkan 0 dan bukan NaN yang tampil sebagai teks aneh di layar.
    rataHari: total === 0 ? 0 : Math.round((totalHari / total) * 10) / 10,
    sebaranDurasi: [...sebaran.entries()].map(([hari, jumlah]) => ({ hari, jumlah })),
  };
}
