/**
 * Uji regresi untuk fungsi ketersediaan, bagian yang paling mudah salah dan
 * paling mahal kalau salah.
 *
 * Semua data dibuat sendiri oleh skrip ini dan dihapus lagi di akhir. Uji
 * yang menumpang baris seed terbukti rapuh: begitu ada yang menyetujui atau
 * menutup pengajuan lewat UI, ekspektasinya meleset padahal logikanya benar.
 *
 * Jalankan: npm run cek:ketersediaan
 */
import { prisma } from "../src/lib/prisma";
import { cekBentrok, puncakPemakaian, ringkasKetersediaan } from "../src/lib/ketersediaan";
import { hariIniISO, dariISO } from "../src/lib/waktu";
import type { StatusPengajuan } from "../src/generated/prisma/enums";

function hari(offset: number): Date {
  const d = dariISO(hariIniISO());
  d.setUTCDate(d.getUTCDate() + offset);
  return d;
}

let lolos = 0;
let gagal = 0;

function cek(nama: string, aktual: unknown, harapan: unknown) {
  const ok = JSON.stringify(aktual) === JSON.stringify(harapan);
  console.log(`${ok ? "✅" : "❌"} ${nama}`);
  if (!ok) console.log(`      harap: ${JSON.stringify(harapan)}  dapat: ${JSON.stringify(aktual)}`);
  if (ok) lolos++;
  else gagal++;
}

const PENGAJUAN_UJI: string[] = [];
const ASET_UJI: string[] = [];

async function main() {
  const nadia = await prisma.user.findFirstOrThrow({
    where: { email: "nadia@kampus.ac.id" },
  });

  const buatAset = async (nama: string, tipe: "BARANG" | "RUANG", stok: number) => {
    const a = await prisma.aset.create({
      data: { nama, tipe, kategori: "Uji Otomatis", stok, lokasi: "Uji" },
    });
    ASET_UJI.push(a.id);
    return a;
  };

  const buatPengajuan = async (
    asetId: string,
    namaAset: string,
    status: StatusPengajuan,
    jumlah: number,
    dari: number,
    sampai: number
  ) => {
    const p = await prisma.pengajuan.create({
      data: {
        kode: `UJI-${Math.random().toString(36).slice(2, 10)}`,
        pemohonId: nadia.id,
        status,
        mulai: hari(dari),
        selesai: hari(sampai),
        keperluan: "Fixture uji ketersediaan otomatis.",
        items: { create: [{ asetId, jumlah, namaAset }] },
      },
    });
    PENGAJUAN_UJI.push(p.id);
    return p;
  };

  // Rentang jauh di masa depan supaya tidak bersinggungan dengan data nyata.
  const barang = await buatAset("UJI Barang Stok 10", "BARANG", 10);

  // ── status mana yang mengunci aset ────────────────────────────────────
  for (const s of ["MENUNGGU", "SELESAI", "DITOLAK", "DIKEMBALIKAN"] as StatusPengajuan[]) {
    await buatPengajuan(barang.id, barang.nama, s, 3, 40, 41);
  }
  const p1 = await puncakPemakaian(prisma, [barang.id], hari(40), hari(41));
  cek("MENUNGGU, SELESAI, DITOLAK, DIKEMBALIKAN tidak mengunci aset", p1.get(barang.id), 0);

  await buatPengajuan(barang.id, barang.nama, "DIPINJAM", 2, 40, 41);
  const p2 = await puncakPemakaian(prisma, [barang.id], hari(40), hari(41));
  cek("DIPINJAM mengunci aset", p2.get(barang.id), 2);

  await buatPengajuan(barang.id, barang.nama, "DISETUJUI", 5, 40, 41);
  const p3 = await puncakPemakaian(prisma, [barang.id], hari(40), hari(41));
  cek("DISETUJUI menumpuk dengan DIPINJAM jadi 7", p3.get(barang.id), 7);

  const p4 = await puncakPemakaian(prisma, [barang.id], hari(60), hari(61));
  cek("Di luar rentang, aset bebas", p4.get(barang.id), 0);

  // Irisan sebagian di ujung rentang tetap terhitung.
  const p5 = await puncakPemakaian(prisma, [barang.id], hari(41), hari(50));
  cek("Irisan sebagian tetap terhitung", p5.get(barang.id), 7);

  // ── inti: puncak, bukan jumlah ────────────────────────────────────────
  // Dua pemakaian yang TIDAK saling beririsan tapi dua duanya menyentuh
  // rentang yang ditanyakan. Kalau dijumlahkan hasilnya 10 dan pengajuan
  // yang sebenarnya sah akan ditolak. Yang benar adalah puncak harian, 6.
  const mic = await buatAset("UJI Mic Stok 6", "BARANG", 6);
  const a = await buatPengajuan(mic.id, mic.nama, "DISETUJUI", 6, 30, 31);
  await buatPengajuan(mic.id, mic.nama, "DISETUJUI", 4, 33, 34);

  const p6 = await puncakPemakaian(prisma, [mic.id], hari(30), hari(34));
  cek("PUNCAK bukan jumlah (6 dan 4 tak beririsan jadi 6)", p6.get(mic.id), 6);

  const b7 = await cekBentrok(prisma, [{ asetId: mic.id, jumlah: 1 }], hari(30), hari(34));
  cek("Minta 1 saat puncak penuh, bentrok", b7.length, 1);

  const b8 = await cekBentrok(prisma, [{ asetId: mic.id, jumlah: 2 }], hari(33), hari(34));
  cek("Minta 2 di celah sisa, boleh", b8.length, 0);

  const b9 = await cekBentrok(prisma, [{ asetId: mic.id, jumlah: 3 }], hari(33), hari(34));
  cek("Minta 3 padahal sisa 2, bentrok", b9.length, 1);

  // ── ruang: satu irisan saja menolak ───────────────────────────────────
  const ruang = await buatAset("UJI Ruang", "RUANG", 1);
  await buatPengajuan(ruang.id, ruang.nama, "DISETUJUI", 1, 40, 41);

  const b10 = await cekBentrok(prisma, [{ asetId: ruang.id, jumlah: 1 }], hari(41), hari(42));
  cek("Ruang beririsan sehari saja, bentrok", b10.length, 1);

  const b11 = await cekBentrok(prisma, [{ asetId: ruang.id, jumlah: 1 }], hari(50), hari(51));
  cek("Ruang di tanggal bebas, boleh", b11.length, 0);

  // ── pengecualian diri sendiri ─────────────────────────────────────────
  // Dipakai saat admin menyetujui: pemakaian pengajuan itu sendiri tidak
  // boleh dihitung sebagai bentrok melawan dirinya.
  const p12 = await puncakPemakaian(prisma, [mic.id], hari(30), hari(31), a.id);
  cek("Pengajuan sendiri dikecualikan", p12.get(mic.id), 0);

  // ── ringkasan untuk kartu katalog ─────────────────────────────────────
  const ring = await ringkasKetersediaan(
    prisma,
    [{ id: mic.id, tipe: "BARANG", stok: 6 }],
    hari(30),
    hari(31)
  );
  cek("Ringkasan menyebut stok habis", ring.get(mic.id)!.teks, "Stok habis");

  const ring2 = await ringkasKetersediaan(
    prisma,
    [{ id: ruang.id, tipe: "RUANG", stok: 1 }],
    hari(40),
    hari(41)
  );
  cek("Ringkasan ruang menyebut sudah dipesan", ring2.get(ruang.id)!.teks, "Sudah dipesan");
}

async function bersihkan() {
  // Pengajuan dihapus lebih dulu supaya item yang menunjuk aset ikut hilang
  // lewat cascade, baru asetnya bisa dihapus.
  if (PENGAJUAN_UJI.length) {
    await prisma.pengajuan.deleteMany({ where: { id: { in: PENGAJUAN_UJI } } });
  }
  if (ASET_UJI.length) {
    await prisma.aset.deleteMany({ where: { id: { in: ASET_UJI } } });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    // Dijalankan apa pun hasilnya, supaya kegagalan uji tidak meninggalkan
    // aset hantu di katalog.
    await bersihkan();
    console.log(`\n${lolos} lolos, ${gagal} gagal`);
    if (gagal > 0) process.exitCode = 1;
    await prisma.$disconnect();
  });
