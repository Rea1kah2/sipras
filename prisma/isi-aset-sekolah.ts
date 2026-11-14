import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Mengisi dan menyinkronkan 21 sarana dan prasarana nyata SIPRAS.
 *
 * Skrip ini bersifat aman dan idempotent: mencari aset berdasarkan namanya,
 * memperbarui data atau foto bila sudah ada, dan membuat baru bila belum ada.
 *
 * Pakai:
 *   npm run db:aset
 *   npm run db:aset -- --paksa-foto   (timpa foto yang sudah ada)
 */

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL belum diisi di .env");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const PAKSA_FOTO = process.argv.includes("--paksa-foto");

type Baris = {
  nama: string;
  tipe: "BARANG" | "RUANG";
  kategori: string;
  jumlah: number | null;
  lokasi: string;
  deskripsi: string;
  foto: string;
};

const ASET: Baris[] = [
  // ── Prasarana / Ruang Kelas ──────────────────────────────────────────
  {
    nama: "Ruang Kelas 1",
    tipe: "RUANG",
    kategori: "Ruang Kelas",
    jumlah: 28,
    lokasi: "Gedung A Lantai 1",
    deskripsi: "",
    foto: "/images/aset/ruang-kelas-1.jpeg",
  },
  {
    nama: "Ruang Kelas 2A",
    tipe: "RUANG",
    kategori: "Ruang Kelas",
    jumlah: 28,
    lokasi: "Gedung A Lantai 1",
    deskripsi: "",
    foto: "/images/aset/ruang-kelas-2a.jpeg",
  },
  {
    nama: "Ruang Kelas 2B",
    tipe: "RUANG",
    kategori: "Ruang Kelas",
    jumlah: 28,
    lokasi: "Gedung A Lantai 1",
    deskripsi: "",
    foto: "/images/aset/ruang-kelas-2b.jpeg",
  },
  {
    nama: "Ruang Kelas 3",
    tipe: "RUANG",
    kategori: "Ruang Kelas",
    jumlah: 28,
    lokasi: "Gedung A Lantai 2",
    deskripsi: "",
    foto: "/images/aset/ruang-kelas-3.jpeg",
  },
  {
    nama: "Ruang Kelas 4A",
    tipe: "RUANG",
    kategori: "Ruang Kelas",
    jumlah: 30,
    lokasi: "Gedung B Lantai 1",
    deskripsi: "",
    foto: "/images/aset/ruang-kelas-4a.jpeg",
  },
  {
    nama: "Ruang Kelas 4B",
    tipe: "RUANG",
    kategori: "Ruang Kelas",
    jumlah: 30,
    lokasi: "Gedung B Lantai 1",
    deskripsi: "",
    foto: "/images/aset/ruang-kelas-4b.jpeg",
  },
  {
    nama: "Ruang Kelas 5",
    tipe: "RUANG",
    kategori: "Ruang Kelas",
    jumlah: 30,
    lokasi: "Gedung B Lantai 2",
    deskripsi: "",
    foto: "/images/aset/ruang-kelas-5.jpeg",
  },
  {
    nama: "Ruang Kelas 6A",
    tipe: "RUANG",
    kategori: "Ruang Kelas",
    jumlah: 32,
    lokasi: "Gedung C Lantai 1",
    deskripsi: "",
    foto: "/images/aset/ruang-kelas-6a.jpeg",
  },
  {
    nama: "Ruang Kelas 6B",
    tipe: "RUANG",
    kategori: "Ruang Kelas",
    jumlah: 32,
    lokasi: "Gedung C Lantai 1",
    deskripsi: "",
    foto: "/images/aset/ruang-kelas-6b.jpeg",
  },
  {
    nama: "Ruang Laboratorium",
    tipe: "RUANG",
    kategori: "Fasilitas Khusus",
    jumlah: 35,
    lokasi: "Gedung Laboratorium",
    deskripsi: "",
    foto: "/images/aset/ruang-laboratorium.jpeg",
  },
  {
    nama: "Perpustakaan",
    tipe: "RUANG",
    kategori: "Fasilitas Khusus",
    jumlah: 30,
    lokasi: "Gedung C Lantai 2",
    deskripsi: "",
    foto: "/images/aset/perpustakaan.jpeg",
  },
  {
    nama: "Ruang Kantor",
    tipe: "RUANG",
    kategori: "Kantor & Administrasi",
    jumlah: 20,
    lokasi: "Gedung Administrasi",
    deskripsi: "",
    foto: "/images/aset/ruang-kantor.jpeg",
  },
  // ── Prasarana / Outdoor & Lapangan ───────────────────────────────────
  {
    nama: "Lapangan Badminton",
    tipe: "RUANG",
    kategori: "Olahraga",
    jumlah: 0,
    lokasi: "Area Olahraga Sekolah",
    deskripsi: "",
    foto: "/images/aset/lapangan-badminton.jpeg",
  },
  {
    nama: "Lapangan Bola",
    tipe: "RUANG",
    kategori: "Outdoor",
    jumlah: 0,
    lokasi: "Area Terbuka Sekolah",
    deskripsi: "",
    foto: "/images/aset/lapangan-bola.jpeg",
  },
  // ── Sarana / Barang Olahraga & Permainan ──────────────────────────────
  {
    nama: "Bola Kaki",
    tipe: "BARANG",
    kategori: "Olahraga",
    jumlah: 10,
    lokasi: "Ruang Olahraga",
    deskripsi: "Bola sepak standar untuk kegiatan olahraga, latihan PJOK, dan pertandingan sekolah.",
    foto: "/images/aset/bola-kaki.jpeg",
  },
  {
    nama: "Bola Kasti",
    tipe: "BARANG",
    kategori: "Olahraga",
    jumlah: 15,
    lokasi: "Lemari Olahraga",
    deskripsi: "Bola kasti standar untuk kegiatan olahraga dan permainan kasti siswa.",
    foto: "/images/aset/bola-tenis.jpeg",
  },
  {
    nama: "Raket Badminton",
    tipe: "BARANG",
    kategori: "Olahraga",
    jumlah: 8,
    lokasi: "Ruang Olahraga",
    deskripsi: "Raket bulu tangkis siap pakai dengan senar kencang dan pegangan nyaman.",
    foto: "/images/aset/raket-badminton.jpeg",
  },
  {
    nama: "Papan Catur",
    tipe: "BARANG",
    kategori: "Permainan & Asah Otak",
    jumlah: 6,
    lokasi: "Ruang Kesenian & Asah Otak",
    deskripsi: "Papan catur kayu lipat lengkap dengan bidak standar hitam dan putih.",
    foto: "/images/aset/papan-catur.jpeg",
  },
  // ── Sarana / Peralatan, Furnitur & Utilitas ────────────────────────────
  {
    nama: "Kursi Plastik",
    tipe: "BARANG",
    kategori: "Furnitur",
    jumlah: 80,
    lokasi: "Gudang Sarana",
    deskripsi: "Kursi plastik kuat dan fleksibel, dapat ditumpuk untuk kegiatan seminar atau pertemuan.",
    foto: "/images/aset/kursi-plastik.jpeg",
  },
  {
    nama: "Generator Listrik",
    tipe: "BARANG",
    kategori: "Peralatan & Utilitas",
    jumlah: 2,
    lokasi: "Ruang Utilitas",
    deskripsi: "Generator daya cadangan genset untuk menyuplai pasokan listrik darurat.",
    foto: "/images/aset/generator.jpeg",
  },
  {
    nama: "Kipas Angin",
    tipe: "BARANG",
    kategori: "Elektronik & Pendingin",
    jumlah: 12,
    lokasi: "Gudang Elektronik",
    deskripsi: "Kipas angin berdiri dengan pengatur kecepatan untuk sirkulasi udara ruangan.",
    foto: "/images/aset/kipas-angin.jpeg",
  },
  {
    nama: "Speaker Portable",
    tipe: "BARANG",
    kategori: "Audio Visual",
    jumlah: 3,
    lokasi: "Ruang Sarpras",
    deskripsi: "Pengeras suara nirkabel portable dilengkapi mikrofon untuk acara sekolah.",
    foto: "/images/aset/speaker.jpeg",
  },
  {
    nama: "Kotak P3K",
    tipe: "BARANG",
    kategori: "Kesehatan",
    jumlah: 5,
    lokasi: "Ruang UKS",
    deskripsi: "Kotak pertolongan pertama pada kecelakaan berisi perban, antiseptik, dan obat darurat.",
    foto: "/images/aset/kotak-p3k.jpeg",
  },
  {
    nama: "Laptop",
    tipe: "BARANG",
    kategori: "Elektronik",
    jumlah: 5,
    lokasi: "Lab Komputer",
    deskripsi: "Laptop operasional sekolah untuk menunjang kegiatan pembelajaran, asesmen ANBK, dan presentasi guru.",
    foto: "/images/aset/laptop.jpeg",
  },
  {
    nama: "Tenda Kemah",
    tipe: "BARANG",
    kategori: "Pramuka & Outdoor",
    jumlah: 5,
    lokasi: "Gudang Sarana",
    deskripsi: "Tenda dome kapasitas 4-6 orang untuk kegiatan kepramukaan dan perkemahan sekolah.",
    foto: "/images/aset/tenda-kemah.jpeg",
  },
  {
    nama: "Proyektor",
    tipe: "BARANG",
    kategori: "Audio Visual",
    jumlah: 2,
    lokasi: "Ruang Sarpras",
    deskripsi: "Proyektor InFocus resolusi tinggi dilengkapi kabel HDMI/VGA untuk presentasi kelas atau rapat dinas.",
    foto: "/images/aset/proyektor.jpeg",
  },
];

async function main() {
  console.log(`Mengisi data 26 aset sekolah (${PAKSA_FOTO ? "menimpa foto" : "mempertahankan foto yang sudah ada"})...\n`);

  let ditambah = 0;
  let diperbarui = 0;

  // Migrasi nama aset: ubah Bola Tenis menjadi Bola Kasti jika ada
  await prisma.aset.updateMany({
    where: { nama: "Bola Tenis" },
    data: {
      nama: "Bola Kasti",
      foto: "/images/aset/bola-tenis.jpeg",
    },
  });

  for (const b of ASET) {
    const ada = await prisma.aset.findFirst({ where: { nama: b.nama } });
    const dataUpdate: Record<string, unknown> = {
      tipe: b.tipe,
      kategori: b.kategori,
      deskripsi: b.deskripsi,
      lokasi: b.lokasi,
      stok: b.tipe === "BARANG" ? (b.jumlah ?? 1) : 1,
      kapasitas: b.tipe === "RUANG" ? b.jumlah : null,
    };

    if (b.foto && (PAKSA_FOTO || !ada?.foto)) {
      dataUpdate.foto = b.foto;
    }

    if (ada) {
      await prisma.aset.update({
        where: { id: ada.id },
        data: dataUpdate,
      });
      diperbarui++;
      console.log(`  ~ diperbarui: ${b.nama}`);
    } else {
      await prisma.aset.create({
        data: {
          nama: b.nama,
          ...dataUpdate,
          foto: b.foto,
        } as never,
      });
      ditambah++;
      console.log(`  + ditambahkan: ${b.nama}`);
    }
  }

  // Nonaktifkan atau bersihkan aset yang tidak ada dalam daftar 26 aset resmi
  const namaResmi = ASET.map((a) => a.nama);
  const tidakRelevan = await prisma.aset.findMany({
    where: { nama: { notIn: namaResmi } },
  });

  if (tidakRelevan.length > 0) {
    console.log(`\nMembersihkan ${tidakRelevan.length} aset tidak relevan...`);
    for (const tr of tidakRelevan) {
      await prisma.aset.delete({ where: { id: tr.id } });
      console.log(`  - dihapus: ${tr.nama}`);
    }
  }

  console.log(`\nSelesai: ${ditambah} ditambahkan, ${diperbarui} diperbarui, ${tidakRelevan.length} dibersihkan.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
