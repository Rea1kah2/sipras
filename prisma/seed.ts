import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL belum diisi di .env");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

/** Tanggal relatif hari ini (WIB) */
function hari(offset: number): Date {
  const wib = new Date(Date.now() + 7 * 60 * 60 * 1000);
  const iso = wib.toISOString().slice(0, 10);
  const d = new Date(`${iso}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + offset);
  return d;
}

const ASET = [
  // ── Prasarana / Ruang Kelas ──────────────────────────────────────────
  {
    nama: "Ruang Kelas 1",
    tipe: "RUANG",
    kategori: "Ruang Kelas",
    kapasitas: 28,
    lokasi: "Gedung A Lantai 1",
    deskripsi: "Ruang kelas 1 dilengkapi meja kursi siswa, papan tulis, dan ventilasi udara baik.",
    foto: "/images/aset/ruang-kelas-1.jpeg",
  },
  {
    nama: "Ruang Kelas 2A",
    tipe: "RUANG",
    kategori: "Ruang Kelas",
    kapasitas: 28,
    lokasi: "Gedung A Lantai 1",
    deskripsi: "Ruang kelas 2A yang rapi dan nyaman untuk proses pembelajaran tatap muka.",
    foto: "/images/aset/ruang-kelas-2a.jpeg",
  },
  {
    nama: "Ruang Kelas 2B",
    tipe: "RUANG",
    kategori: "Ruang Kelas",
    kapasitas: 28,
    lokasi: "Gedung A Lantai 1",
    deskripsi: "Ruang kelas 2B bersebelahan dengan kelas 2A dengan tata letak bangku ergonomis.",
    foto: "/images/aset/ruang-kelas-2b.jpeg",
  },
  {
    nama: "Ruang Kelas 3",
    tipe: "RUANG",
    kategori: "Ruang Kelas",
    kapasitas: 28,
    lokasi: "Gedung A Lantai 2",
    deskripsi: "Ruang kelas 3 berpencahayaan alami cukup dengan papan display karya siswa.",
    foto: "/images/aset/ruang-kelas-3.jpeg",
  },
  {
    nama: "Ruang Kelas 4A",
    tipe: "RUANG",
    kategori: "Ruang Kelas",
    kapasitas: 30,
    lokasi: "Gedung B Lantai 1",
    deskripsi: "Ruang kelas 4A dengan perlengkapan belajar lengkap dan papan tulis putih ganda.",
    foto: "/images/aset/ruang-kelas-4a.jpeg",
  },
  {
    nama: "Ruang Kelas 4B",
    tipe: "RUANG",
    kategori: "Ruang Kelas",
    kapasitas: 30,
    lokasi: "Gedung B Lantai 1",
    deskripsi: "Ruang kelas 4B berukuran luas dengan sirkulasi udara optimal.",
    foto: "/images/aset/ruang-kelas-4b.jpeg",
  },
  {
    nama: "Ruang Kelas 5",
    tipe: "RUANG",
    kategori: "Ruang Kelas",
    kapasitas: 30,
    lokasi: "Gedung B Lantai 2",
    deskripsi: "Ruang kelas 5 yang kondusif untuk kegiatan belajar mengajar dan diskusi kelompok.",
    foto: "/images/aset/ruang-kelas-5.jpeg",
  },
  {
    nama: "Ruang Kelas 6A",
    tipe: "RUANG",
    kategori: "Ruang Kelas",
    kapasitas: 32,
    lokasi: "Gedung C Lantai 1",
    deskripsi: "Ruang kelas 6A untuk siswa tingkat akhir dengan fasilitas meja kursi belajar standar.",
    foto: "/images/aset/ruang-kelas-6a.jpeg",
  },
  {
    nama: "Ruang Kelas 6B",
    tipe: "RUANG",
    kategori: "Ruang Kelas",
    kapasitas: 32,
    lokasi: "Gedung C Lantai 1",
    deskripsi: "Ruang kelas 6B yang tenang dan lapang untuk pemantapan materi ujian.",
    foto: "/images/aset/ruang-kelas-6b.jpeg",
  },
  {
    nama: "Ruang Laboratorium",
    tipe: "RUANG",
    kategori: "Fasilitas Khusus",
    kapasitas: 35,
    lokasi: "Gedung Laboratorium",
    deskripsi: "Ruang laboratorium sains dan komputer dengan meja praktikum dan saluran listrik memadai.",
    foto: "/images/aset/ruang-laboratorium.jpeg",
  },
  // ── Prasarana / Outdoor & Lapangan ───────────────────────────────────
  {
    nama: "Lapangan Badminton",
    tipe: "RUANG",
    kategori: "Olahraga",
    kapasitas: 0,
    lokasi: "Area Olahraga Sekolah",
    deskripsi: "Lapangan bulu tangkis dengan garis standar dan jaring net terpasang rapi.",
    foto: "/images/aset/lapangan-badminton.jpeg",
  },
  {
    nama: "Lapangan Bola",
    tipe: "RUANG",
    kategori: "Outdoor",
    kapasitas: 0,
    lokasi: "Area Terbuka Sekolah",
    deskripsi: "Lapangan sepak bola rumput terbuka untuk pertandingan olahraga dan kegiatan luar ruang.",
    foto: "/images/aset/lapangan-bola.jpeg",
  },
  // ── Sarana / Barang Olahraga & Permainan ──────────────────────────────
  {
    nama: "Bola Kaki",
    tipe: "BARANG",
    kategori: "Olahraga",
    stok: 10,
    lokasi: "Ruang Olahraga",
    deskripsi: "Bola sepak standar untuk kegiatan olahraga, latihan PJOK, dan pertandingan sekolah.",
    foto: "/images/aset/bola-kaki.jpeg",
  },
  {
    nama: "Bola Tenis",
    tipe: "BARANG",
    kategori: "Olahraga",
    stok: 15,
    lokasi: "Lemari Olahraga",
    deskripsi: "Bola tenis lapangan berkualitas baik untuk latihan ketangkasan dan olahraga siswa.",
    foto: "/images/aset/bola-tenis.jpeg",
  },
  {
    nama: "Raket Badminton",
    tipe: "BARANG",
    kategori: "Olahraga",
    stok: 8,
    lokasi: "Ruang Olahraga",
    deskripsi: "Raket bulu tangkis siap pakai dengan senar kencang dan pegangan nyaman.",
    foto: "/images/aset/raket-badminton.jpeg",
  },
  {
    nama: "Papan Catur",
    tipe: "BARANG",
    kategori: "Permainan & Asah Otak",
    stok: 6,
    lokasi: "Ruang Kesenian & Asah Otak",
    deskripsi: "Papan catur kayu lipat lengkap dengan bidak standar hitam dan putih.",
    foto: "/images/aset/papan-catur.jpeg",
  },
  // ── Sarana / Peralatan, Furnitur & Utilitas ────────────────────────────
  {
    nama: "Kursi Plastik",
    tipe: "BARANG",
    kategori: "Furnitur",
    stok: 80,
    lokasi: "Gudang Sarana",
    deskripsi: "Kursi plastik kuat dan fleksibel, dapat ditumpuk untuk kegiatan seminar atau pertemuan.",
    foto: "/images/aset/kursi-plastik.jpeg",
  },
  {
    nama: "Generator Listrik",
    tipe: "BARANG",
    kategori: "Peralatan & Utilitas",
    stok: 2,
    lokasi: "Ruang Utilitas",
    deskripsi: "Generator daya cadangan genset untuk menyuplai pasokan listrik darurat.",
    foto: "/images/aset/generator.jpeg",
  },
  {
    nama: "Kipas Angin",
    tipe: "BARANG",
    kategori: "Elektronik & Pendingin",
    stok: 12,
    lokasi: "Gudang Elektronik",
    deskripsi: "Kipas angin berdiri dengan pengatur kecepatan untuk sirkulasi udara ruangan.",
    foto: "/images/aset/kipas-angin.jpeg",
  },
  {
    nama: "Speaker Portable",
    tipe: "BARANG",
    kategori: "Audio Visual",
    stok: 3,
    lokasi: "Ruang Sarpras",
    deskripsi: "Pengeras suara nirkabel portable dilengkapi mikrofon untuk acara sekolah.",
    foto: "/images/aset/speaker.jpeg",
  },
  {
    nama: "Kotak P3K",
    tipe: "BARANG",
    kategori: "Kesehatan",
    stok: 5,
    lokasi: "Ruang UKS",
    deskripsi: "Kotak pertolongan pertama pada kecelakaan berisi perban, antiseptik, dan obat darurat.",
    foto: "/images/aset/kotak-p3k.jpeg",
  },
] as const;

async function main() {
  console.log("🌱 Menyiapkan data Fresh Slate SIPRAS (21 Aset Riil Tanpa Transaksi Lama)...");

  // Bersihkan dulu seluruh data lama agar tabel benar-benar bersih
  await prisma.riwayatStatus.deleteMany();
  await prisma.pengembalianItem.deleteMany();
  await prisma.pengembalian.deleteMany();
  await prisma.pengajuanItem.deleteMany();
  await prisma.pengajuan.deleteMany();
  await prisma.notifikasi.deleteMany();
  await prisma.penutupan.deleteMany();
  await prisma.pengaturan.deleteMany();
  await prisma.aset.deleteMany();
  await prisma.user.deleteMany();

  // ── 1. Buat Pengguna Inti ────────────────────────────────────────────
  const sandiAdmin = await hash("admin1234", 10);
  const sandiPeminjam = await hash("peminjam1234", 10);
  const emailAdmin = process.env.EMAIL_REPLY_TO?.trim() || "admin@sekolah.sch.id";

  const admin = await prisma.user.create({
    data: {
      nama: "Administrator Sarpras",
      email: emailAdmin,
      password: sandiAdmin,
      peran: "ADMIN",
      whatsapp: process.env.NEXT_PUBLIC_WA_PETUGAS ?? "081234567890",
      identitas: "198501022008011002",
      unit: "Pengelola Sarpras",
    },
  });

  if (emailAdmin !== "admin@kampus.ac.id") {
    await prisma.user.create({
      data: {
        nama: "Admin Demo",
        email: "admin@kampus.ac.id",
        password: sandiAdmin,
        peran: "ADMIN",
        whatsapp: "081234567890",
        identitas: "198501022008011001",
        unit: "Pengelola Sarpras",
      },
    });
  }

  // Akun peminjam bersih untuk verifikasi login
  await prisma.user.create({
    data: {
      nama: "Budi Setiawan",
      email: "budi@kampus.ac.id",
      password: sandiPeminjam,
      peran: "PEMINJAM",
      whatsapp: "081234567891",
      identitas: "199201012015011001",
      unit: "Guru Kelas 1",
    },
  });

  // ── 2. Buat 21 Aset Riil Berfoto ──────────────────────────────────────
  for (const a of ASET) {
    await prisma.aset.create({
      data: {
        nama: a.nama,
        tipe: a.tipe,
        kategori: a.kategori,
        deskripsi: a.deskripsi,
        lokasi: a.lokasi,
        stok: a.tipe === "BARANG" ? (a as { stok: number }).stok : 1,
        kapasitas: a.tipe === "RUANG" ? (a as { kapasitas: number }).kapasitas : null,
        foto: a.foto,
      },
    });
  }

  // ── 3. Pengaturan Layanan Bawaan ──────────────────────────────────────
  await prisma.pengaturan.create({
    data: {
      id: "tunggal",
      hariLayanan: [1, 2, 3, 4, 5, 6], // Senin sampai Sabtu
      jamBuka: "08.00",
      jamTutup: "16.00",
    },
  });

  // Hari libur terjadwal di masa depan untuk indikator kalender
  await prisma.penutupan.create({
    data: {
      tanggal: hari(14),
      alasan: "Hari Libur Nasional",
      jenis: "LIBUR",
      olehId: admin.id,
    },
  });

  const jumlahUser = await prisma.user.count();
  const jumlahAset = await prisma.aset.count();
  const jumlahPengajuan = await prisma.pengajuan.count();

  console.log(`✅ Selesai: Fresh Slate berhasil dipasang!`);
  console.log(`   • Pengguna : ${jumlahUser}`);
  console.log(`   • Aset     : ${jumlahAset} (100% berfoto)`);
  console.log(`   • Transaksi: ${jumlahPengajuan} (bersih total 0 pengajuan)`);
  console.log(`\n   Kredensial Login:`);
  console.log(`   • Admin    : admin@kampus.ac.id / admin1234`);
  console.log(`   • Peminjam : budi@kampus.ac.id / peminjam1234\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
