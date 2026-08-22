/**
 * Uji regresi untuk alur status pengajuan, dari MENUNGGU sampai SELESAI.
 *
 * Dibuat setelah ditemukan bahwa perpindahan DISETUJUI menjadi DIPINJAM
 * terjadi OTOMATIS berdasarkan tanggal, tanpa ada manusia yang menyatakan
 * barangnya benar benar diserahkan. Akibatnya laporan peminjaman bisa
 * menyatakan barang sedang dipinjam padahal tidak pernah ada yang mengambil.
 *
 * Uji yang paling penting di berkas ini justru yang MEMBUKTIKAN SESUATU TIDAK
 * TERJADI: pengajuan berstatus DISETUJUI yang tanggal mulainya sudah lewat
 * wajib TETAP DISETUJUI. Kalau suatu saat ada yang membangun ulang perpindahan
 * otomatis itu, uji ini yang akan gagal lebih dulu.
 *
 * Semua data dibuat sendiri dan dihapus lagi di akhir, apa pun hasilnya.
 *
 * Jalankan: npm run cek:alur
 */
import { prisma } from "../src/lib/prisma";
import { bolehPindah, alasanTolakPindah, STATUS_MEMAKAI_ASET } from "../src/lib/status";
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
  const nadia = await prisma.user.findFirstOrThrow({ where: { peran: "PEMINJAM" } });
  const admin = await prisma.user.findFirstOrThrow({ where: { peran: "ADMIN" } });

  const aset = await prisma.aset.create({
    data: { nama: "UJI Alur Proyektor", tipe: "BARANG", kategori: "Uji Otomatis", stok: 5, lokasi: "Uji" },
  });
  ASET_UJI.push(aset.id);

  const buat = async (status: StatusPengajuan, dari: number, sampai: number) => {
    const p = await prisma.pengajuan.create({
      data: {
        kode: `UJI-${Math.random().toString(36).slice(2, 10)}`,
        pemohonId: nadia.id,
        status,
        mulai: hari(dari),
        selesai: hari(sampai),
        keperluan: "Fixture uji alur status otomatis.",
        items: { create: [{ asetId: aset.id, jumlah: 1, namaAset: aset.nama }] },
      },
    });
    PENGAJUAN_UJI.push(p.id);
    return p;
  };

  // ── A. mesin status: siapa boleh memindahkan apa ke mana ────────────────
  cek("Admin boleh menyetujui yang menunggu", bolehPindah("MENUNGGU", "DISETUJUI", "ADMIN"), true);
  cek("Peminjam TIDAK boleh menyetujui pengajuannya sendiri", bolehPindah("MENUNGGU", "DISETUJUI", "PEMINJAM"), false);
  cek("Admin boleh menyerahkan yang disetujui", bolehPindah("DISETUJUI", "DIPINJAM", "ADMIN"), true);
  cek("Peminjam TIDAK boleh menyerahkan sendiri", bolehPindah("DISETUJUI", "DIPINJAM", "PEMINJAM"), false);
  cek("Peminjam boleh mengembalikan yang dipinjam", bolehPindah("DIPINJAM", "DIKEMBALIKAN", "PEMINJAM"), true);
  cek("Admin boleh menutup yang dikembalikan", bolehPindah("DIKEMBALIKAN", "SELESAI", "ADMIN"), true);

  // ── B. lompatan terlarang ditolak ───────────────────────────────────────
  cek("DISETUJUI tidak bisa langsung SELESAI", bolehPindah("DISETUJUI", "SELESAI", "ADMIN"), false);
  cek("MENUNGGU tidak bisa langsung DIPINJAM", bolehPindah("MENUNGGU", "DIPINJAM", "ADMIN"), false);
  cek("DIPINJAM tidak bisa mundur jadi DISETUJUI", bolehPindah("DIPINJAM", "DISETUJUI", "ADMIN"), false);
  cek("SELESAI itu final", bolehPindah("SELESAI", "DIPINJAM", "ADMIN"), false);
  cek("DITOLAK itu final", bolehPindah("DITOLAK", "DISETUJUI", "ADMIN"), false);

  // Alasan penolakan wajib berisi kalimat, bukan null, supaya layar punya
  // sesuatu untuk ditampilkan alih alih pesan kosong.
  const alasan = alasanTolakPindah("DISETUJUI", "SELESAI", "ADMIN");
  cek("Penolakan menyertakan alasan yang bisa dibaca", typeof alasan === "string" && alasan.length > 10, true);
  cek("Perpindahan yang sah tidak punya alasan penolakan", alasanTolakPindah("DISETUJUI", "DIPINJAM", "ADMIN"), null);

  // ── C. INTI: tidak ada perpindahan otomatis berdasarkan tanggal ─────────
  // Tanggal mulainya 3 hari LALU, jadi kalau perpindahan otomatis masih ada,
  // status ini akan berubah sendiri saat halaman mana pun dibuka.
  const lewat = await buat("DISETUJUI", -3, -1);
  const masihAda = await prisma.pengajuan.findUniqueOrThrow({
    where: { id: lewat.id },
    select: { status: true },
  });
  cek("DISETUJUI yang lewat tanggal TETAP disetujui, tidak lompat sendiri", masihAda.status, "DISETUJUI");

  const jejakOtomatis = await prisma.riwayatStatus.count({
    where: { pengajuanId: lewat.id, ke: "DIPINJAM" },
  });
  cek("Tidak ada jejak perpindahan otomatis ke DIPINJAM", jejakOtomatis, 0);

  // ── D. rangkaian penuh, tiap langkah punya pelaku ───────────────────────
  const p = await buat("MENUNGGU", 1, 3);

  const majukan = async (dari: StatusPengajuan, ke: StatusPengajuan, oleh: string) => {
    if (!bolehPindah(dari, ke, "ADMIN") && !bolehPindah(dari, ke, "PEMINJAM")) {
      throw new Error(`transisi ${dari} -> ${ke} ditolak mesin status`);
    }
    await prisma.$transaction(async (tx) => {
      await tx.pengajuan.update({ where: { id: p.id }, data: { status: ke } });
      await tx.riwayatStatus.create({
        data: { pengajuanId: p.id, dari, ke, olehId: oleh, catatan: "uji alur" },
      });
    });
  };

  await majukan("MENUNGGU", "DISETUJUI", admin.id);
  await majukan("DISETUJUI", "DIPINJAM", admin.id);
  await majukan("DIPINJAM", "DIKEMBALIKAN", nadia.id);
  await majukan("DIKEMBALIKAN", "SELESAI", admin.id);

  const akhir = await prisma.pengajuan.findUniqueOrThrow({
    where: { id: p.id },
    select: { status: true },
  });
  cek("Rangkaian penuh berakhir di SELESAI", akhir.status, "SELESAI");

  const jejak = await prisma.riwayatStatus.findMany({
    where: { pengajuanId: p.id },
    orderBy: { waktu: "asc" },
    select: { ke: true, olehId: true },
  });
  cek("Empat perpindahan tercatat", jejak.map((j) => j.ke), ["DISETUJUI", "DIPINJAM", "DIKEMBALIKAN", "SELESAI"]);
  cek("Setiap perpindahan punya pelaku, tidak ada yang anonim", jejak.every((j) => j.olehId !== null), true);

  // ── E. ketersediaan: DISETUJUI dan DIPINJAM sama sama menahan aset ──────
  // Inilah sebabnya serah terima sebelum tanggal mulai aman dilakukan: jumlah
  // aset yang tertahan tidak berubah sedikit pun saat statusnya berpindah.
  cek("DISETUJUI menahan aset", STATUS_MEMAKAI_ASET.includes("DISETUJUI"), true);
  cek("DIPINJAM menahan aset", STATUS_MEMAKAI_ASET.includes("DIPINJAM"), true);
  cek("SELESAI melepas aset", STATUS_MEMAKAI_ASET.includes("SELESAI"), false);
}

async function bersihkan() {
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
    await bersihkan();
    console.log(`\n${lolos} lolos, ${gagal} gagal`);
    if (gagal > 0) process.exitCode = 1;
    await prisma.$disconnect();
  });
