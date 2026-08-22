/**
 * Uji regresi untuk hari layanan dan penutupan, lib/penutupan.ts.
 *
 * Ini SATU SATUNYA tempat yang memutuskan sebuah tanggal tutup atau tidak,
 * dipakai oleh form pengajuan, aksi simpan, kalender ruang, dan panel review
 * sekaligus. Kalau logikanya salah, salahnya menyebar ke empat tempat itu
 * bersamaan, jadi berkas ini yang paling penting dibuktikan benar duluan.
 *
 * Pengaturan layanan adalah baris TUNGGAL yang dipakai bersama seluruh
 * aplikasi, bukan data uji yang boleh dihapus bebas seperti di
 * cek-ketersediaan.ts. Nilainya disimpan di awal dan DIKEMBALIKAN PERSIS di
 * akhir, apa pun hasil ujinya, supaya menjalankan skrip ini tidak diam diam
 * mengubah jam layanan yang sungguhan.
 *
 * Jalankan: npm run cek:penutupan
 */
import { prisma } from "../src/lib/prisma";
import {
  ambilPengaturan,
  cekTutup,
  jendelaBuka,
  pesanTutup,
  tanggalItuTutup,
  tanggalTutup,
} from "../src/lib/penutupan";
import { hariIniISO, dariISO, keISO } from "../src/lib/waktu";
import type { Pengaturan } from "../src/generated/prisma/client";

function hari(offset: number): Date {
  const d = dariISO(hariIniISO());
  d.setUTCDate(d.getUTCDate() + offset);
  return d;
}
function iso(offset: number): string {
  return keISO(hari(offset));
}

/** Offset pertama pada atau setelah `dari` yang jatuh di hari pekan `dow`. */
function offsetHari(dari: number, dow: number): number {
  for (let o = dari; o < dari + 8; o++) {
    if (hari(o).getUTCDay() === dow) return o;
  }
  throw new Error("tidak ditemukan, mustahil dalam 8 hari");
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

const PENUTUPAN_UJI: string[] = [];
let ASLI: Pengaturan | null = null;

async function main() {
  ASLI = await prisma.pengaturan.findUnique({ where: { id: "tunggal" } });

  const buatTutup = async (tanggal: Date, alasan: string, jenis: "LIBUR" | "PERAWATAN" | "LAIN") => {
    const p = await prisma.penutupan.create({ data: { tanggal, alasan, jenis } });
    PENUTUPAN_UJI.push(p.id);
    return p;
  };

  // Rentang jauh di masa depan, tidak bersinggungan dengan libur contoh dari
  // seed (hari 14 dan 25-27) maupun rentang pengajuan aktif di seed (-8..8).
  const JAUH = 300;

  // Bawaan pengaturan: Senin sampai Sabtu buka, Minggu tutup. Diaktifkan lagi
  // di sini karena uji lain di bawah akan mengubahnya sementara.
  await prisma.pengaturan.upsert({
    where: { id: "tunggal" },
    update: { hariLayanan: [1, 2, 3, 4, 5, 6], jamBuka: "08.00", jamTutup: "16.00" },
    create: { id: "tunggal", hariLayanan: [1, 2, 3, 4, 5, 6], jamBuka: "08.00", jamTutup: "16.00" },
  });

  // ── A. tutup karena hari pekan, tanpa admin menandai apa pun ──────────
  const oMinggu = offsetHari(JAUH, 0); // Minggu, tidak ada di hariLayanan bawaan
  const tA = await cekTutup(prisma, hari(oMinggu), hari(oMinggu));
  cek("Minggu tutup karena hari pekan, bukan tanggal khusus", tA.length === 1 && tA[0].jenis === null, true);
  cek("pesanTutup menyebut nama hari, bukan alasan admin", pesanTutup(tA[0]).includes("Minggu"), true);

  // Sabtu di pekan yang sama, hari layanan bawaan, wajib TIDAK tutup.
  const oSabtu = offsetHari(JAUH, 6);
  const tA2 = await cekTutup(prisma, hari(oSabtu), hari(oSabtu));
  cek("Sabtu tidak tutup, hari layanan bawaan", tA2.length, 0);

  // ── B. Penutupan admin di hari yang KEBETULAN sudah tutup karena pekan ──
  // Alasan admin wajib MENIMPA "tutup karena hari pekan" yang tanpa alasan,
  // supaya libur nasional yang jatuh di hari Minggu tidak kehilangan
  // keterangannya.
  await buatTutup(hari(oMinggu), "Uji: libur nasional bertepatan Minggu", "LIBUR");
  const tB = await cekTutup(prisma, hari(oMinggu), hari(oMinggu));
  cek("Alasan admin menimpa alasan hari pekan", tB[0]?.alasan, "Uji: libur nasional bertepatan Minggu");
  cek("pesanTutup memakai alasan admin, bukan nama hari", pesanTutup(tB[0]).includes("libur nasional"), true);

  // ── C. Penutupan admin di hari yang biasanya BUKA ──────────────────────
  const oSenin = offsetHari(JAUH + 10, 1);
  await buatTutup(hari(oSenin), "Uji: perawatan gedung", "PERAWATAN");
  const tC = await cekTutup(prisma, hari(oSenin), hari(oSenin));
  cek("Senin biasa jadi tutup lewat tanggal khusus", tC.length === 1 && tC[0].alasan === "Uji: perawatan gedung", true);

  const oSelasa = oSenin + 1;
  const tC2 = await cekTutup(prisma, hari(oSelasa), hari(oSelasa));
  cek("Selasa di sebelahnya tetap buka, tidak ikut tertular", tC2.length, 0);

  // ── D. tanggalItuTutup, satu tanggal ────────────────────────────────────
  const dD1 = await tanggalItuTutup(prisma, iso(oSenin));
  const dD2 = await tanggalItuTutup(prisma, iso(oSelasa));
  cek("tanggalItuTutup true di hari yang ditandai", dD1, true);
  cek("tanggalItuTutup false di hari terbuka", dD2, false);

  // ── E. jendelaBuka melompati hari tutup ─────────────────────────────────
  // Dua hari tutup berurutan, lalu hari ketiga buka.
  const oBlokAwal = offsetHari(JAUH + 30, 1); // Senin
  await buatTutup(hari(oBlokAwal), "Uji: blok A", "LAIN");
  await buatTutup(hari(oBlokAwal + 1), "Uji: blok B", "LAIN");
  const jE = await jendelaBuka(prisma, iso(oBlokAwal), 1);
  cek("jendelaBuka melompati 2 hari tutup, mendarat di hari ke-3", jE?.mulai, iso(oBlokAwal + 2));

  // Jendela 2 hari berurutan, dicari mulai dari tengah blok tutup: harus
  // mendarat SETELAH blok tutup selesai, bukan menghitung hari tutup itu
  // sebagai bagian dari jendelanya.
  const jE2 = await jendelaBuka(prisma, iso(oBlokAwal + 1), 2);
  cek("jendelaBuka 2 hari tidak memakai hari tutup sebagai bagian jendela", jE2?.mulai, iso(oBlokAwal + 2));
  cek("jendelaBuka 2 hari berakhir sehari setelah mulai", jE2?.selesai, iso(oBlokAwal + 3));

  // ── F. jendelaBuka mengembalikan null kalau mustahil ────────────────────
  // Hanya Senin yang buka: dua hari berurutan tidak akan pernah ada.
  await prisma.pengaturan.update({ where: { id: "tunggal" }, data: { hariLayanan: [1] } });
  const jF = await jendelaBuka(prisma, iso(JAUH + 60), 2, 30);
  cek("jendelaBuka null kalau jendela sepanjang itu mustahil", jF, null);

  // ── G. ambilPengaturan fallback saat hariLayanan kosong ─────────────────
  // Baris kosong tidak mungkin lolos lewat aksi server (skema menolaknya),
  // tapi ambilPengaturan tetap tidak boleh mempercayainya begitu saja kalau
  // baris lama atau perubahan langsung di basis data menyisakan keadaan itu.
  await prisma.pengaturan.update({ where: { id: "tunggal" }, data: { hariLayanan: [] } });
  const g = await ambilPengaturan(prisma);
  cek("hariLayanan kosong jatuh ke bawaan, bukan menutup selamanya", g.hariLayanan, [1, 2, 3, 4, 5, 6]);

  // ── H. penjaga rentang terbalik ──────────────────────────────────────────
  const hH = await tanggalTutup(prisma, hari(10), hari(5));
  cek("mulai setelah selesai menghasilkan peta kosong", hH.size, 0);

  // ── I. urutan hasil cekTutup naik ────────────────────────────────────────
  const iI = await cekTutup(prisma, hari(oBlokAwal), hari(oBlokAwal + 1));
  cek("cekTutup terurut naik", iI.map((x) => x.tanggal), [iso(oBlokAwal), iso(oBlokAwal + 1)]);
}

async function bersihkan() {
  if (PENUTUPAN_UJI.length) {
    await prisma.penutupan.deleteMany({ where: { id: { in: PENUTUPAN_UJI } } });
  }
  // Pengaturan DIKEMBALIKAN PERSIS ke nilai sebelum skrip ini berjalan,
  // karena baris ini dipakai bersama seluruh aplikasi, bukan data uji.
  if (ASLI) {
    await prisma.pengaturan.update({
      where: { id: "tunggal" },
      data: { hariLayanan: ASLI.hariLayanan, jamBuka: ASLI.jamBuka, jamTutup: ASLI.jamTutup },
    });
  } else {
    await prisma.pengaturan.deleteMany({ where: { id: "tunggal" } });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await bersihkan();
    console.log(`\n${lolos} lolos, ${gagal} gagal`);
    if (gagal > 0) process.exitCode = 1;
    await prisma.$disconnect();
  });
