import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Mengisi daftar sarana dan prasarana nyata UPTD SD Negeri 372 Sikara Kara.
 *
 * BEDA PALING PENTING dari prisma/seed.ts: skrip ini TIDAK PERNAH MENGHAPUS
 * apa pun. seed.ts diawali sederet deleteMany() yang mengosongkan sepuluh
 * tabel, dan itu benar untuk data demo yang memang boleh ditimpa berulang.
 * Di basis data produksi perilaku itu mematikan: sekali salah jalan, seluruh
 * riwayat peminjaman sungguhan lenyap.
 *
 * Skrip ini mencari aset berdasarkan namanya lebih dulu, memperbarui yang
 * sudah ada dan membuat yang belum. Jadi aman dijalankan dua kali, dan aman
 * dipakai lagi nanti saat sekolah menambah aset baru.
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

/**
 * DAFTAR ASET SEKOLAH.
 *
 * jumlah = stok untuk BARANG, kapasitas orang untuk RUANG (0 berarti
 * terbuka, dipakai halaman dan lapangan).
 *
 * foto = tautan lokal ke /images/aset/<berkas>.jpeg yang dibundel Next.js.
 */
type Baris = {
  nama: string;
  tipe: "BARANG" | "RUANG";
  kategori: string;
  jumlah: number | null;
  /** Angka belum diverifikasi sekolah, wajib dicek petugas setelah deploy. */
  perkiraan?: boolean;
  lokasi: string;
  deskripsi: string;
  foto?: string;
};

const ASET: Baris[] = [
  // ── prasarana / ruang kelas ──────────────────────────────────────────
  {
    nama: "Ruang Kelas 1",
    tipe: "RUANG",
    kategori: "Ruang Kelas",
    jumlah: 24,
    perkiraan: true,
    lokasi: "Gedung utama",
    deskripsi:
      "Ruang kelas berdinding hijau dengan papan tulis putih, meja kayu panjang, kursi plastik, dan lemari kayu di sudut ruangan.",
    foto: "/images/aset/ruang-kelas-1.jpeg",
  },
  {
    nama: "Ruang Kelas 2",
    tipe: "RUANG",
    kategori: "Ruang Kelas",
    jumlah: 24,
    perkiraan: true,
    lokasi: "Gedung utama",
    deskripsi:
      "Ruang kelas berdinding hijau dengan papan tulis putih, meja kayu panjang, kursi plastik, dan lemari kayu di sudut ruangan.",
    foto: "/images/aset/ruang-kelas-2a.jpeg",
  },
  {
    nama: "Ruang Kelas 2A",
    tipe: "RUANG",
    kategori: "Ruang Kelas",
    jumlah: 24,
    perkiraan: true,
    lokasi: "Gedung utama",
    deskripsi:
      "Ruang kelas 2A dengan ventilasi udara baik, papan tulis putih, meja dan kursi siswa teratur.",
    foto: "/images/aset/ruang-kelas-2a.jpeg",
  },
  {
    nama: "Ruang Kelas 2B",
    tipe: "RUANG",
    kategori: "Ruang Kelas",
    jumlah: 24,
    perkiraan: true,
    lokasi: "Gedung utama",
    deskripsi:
      "Ruang kelas 2B bersebelahan dengan kelas 2A, dilengkapi meja belajar kayu dan papan pengumuman.",
    foto: "/images/aset/ruang-kelas-2b.jpeg",
  },
  {
    nama: "Ruang Kelas 3",
    tipe: "RUANG",
    kategori: "Ruang Kelas",
    jumlah: 24,
    perkiraan: true,
    lokasi: "Gedung utama",
    deskripsi:
      "Ruang kelas berdinding hijau dengan papan tulis putih, meja kayu panjang, kursi plastik, dan lemari kayu di sudut ruangan.",
    foto: "/images/aset/ruang-kelas-3.jpeg",
  },
  {
    nama: "Ruang Kelas 4",
    tipe: "RUANG",
    kategori: "Ruang Kelas",
    jumlah: 24,
    perkiraan: true,
    lokasi: "Gedung utama",
    deskripsi:
      "Ruang kelas berdinding hijau dengan papan tulis putih, meja kayu panjang, kursi plastik, dan lemari kayu di sudut ruangan.",
    foto: "/images/aset/ruang-kelas-4a.jpeg",
  },
  {
    nama: "Ruang Kelas 4A",
    tipe: "RUANG",
    kategori: "Ruang Kelas",
    jumlah: 24,
    perkiraan: true,
    lokasi: "Gedung utama",
    deskripsi:
      "Ruang kelas 4A dengan pencahayaan alami memadai, meja ganda, dan lemari penyimpanan buku.",
    foto: "/images/aset/ruang-kelas-4a.jpeg",
  },
  {
    nama: "Ruang Kelas 4B",
    tipe: "RUANG",
    kategori: "Ruang Kelas",
    jumlah: 24,
    perkiraan: true,
    lokasi: "Gedung utama",
    deskripsi:
      "Ruang kelas 4B lengkap dengan deretan meja kayu dan perlengkapan mengajar.",
    foto: "/images/aset/ruang-kelas-4b.jpeg",
  },
  {
    nama: "Ruang Kelas 5",
    tipe: "RUANG",
    kategori: "Ruang Kelas",
    jumlah: 24,
    perkiraan: true,
    lokasi: "Gedung utama",
    deskripsi:
      "Ruang kelas berdinding hijau dengan papan tulis putih, meja kayu panjang, kursi plastik, dan lemari kayu di sudut ruangan.",
    foto: "/images/aset/ruang-kelas-5.jpeg",
  },
  {
    nama: "Ruang Kelas 6",
    tipe: "RUANG",
    kategori: "Ruang Kelas",
    jumlah: 24,
    perkiraan: true,
    lokasi: "Gedung utama",
    deskripsi:
      "Ruang kelas berdinding hijau dengan papan tulis putih, meja kayu panjang, kursi plastik, dan lemari kayu di sudut ruangan.",
    foto: "/images/aset/ruang-kelas-6a.jpeg",
  },
  {
    nama: "Ruang Kelas 6A",
    tipe: "RUANG",
    kategori: "Ruang Kelas",
    jumlah: 24,
    perkiraan: true,
    lokasi: "Gedung utama",
    deskripsi:
      "Ruang kelas tingkat akhir 6A untuk persiapan ujian dan belajar intensif.",
    foto: "/images/aset/ruang-kelas-6a.jpeg",
  },
  {
    nama: "Ruang Kelas 6B",
    tipe: "RUANG",
    kategori: "Ruang Kelas",
    jumlah: 24,
    perkiraan: true,
    lokasi: "Gedung utama",
    deskripsi:
      "Ruang kelas 6B yang luas dengan tata letak meja berderet rapi.",
    foto: "/images/aset/ruang-kelas-6b.jpeg",
  },
  {
    nama: "Ruang Laboratorium",
    tipe: "RUANG",
    kategori: "Laboratorium",
    jumlah: 30,
    perkiraan: true,
    lokasi: "Gedung utama",
    deskripsi:
      "Ruang laboratorium sains dan komputer untuk kegiatan praktikum siswa.",
    foto: "/images/aset/ruang-laboratorium.jpeg",
  },
  {
    nama: "Ruang Guru",
    tipe: "RUANG",
    kategori: "Ruang Kerja dan Rapat",
    jumlah: 12,
    perkiraan: true,
    lokasi: "Gedung utama",
    deskripsi:
      "Ruang kerja guru sekaligus tempat rapat kecil. Berisi rak buku besar, lemari kaca piala, dan meja panjang bertaplak.",
  },
  {
    nama: "Halaman Sekolah",
    tipe: "RUANG",
    kategori: "Outdoor",
    jumlah: 0,
    lokasi: "Depan gedung utama",
    deskripsi:
      "Halaman tanah luas dengan tiang bendera, dipakai upacara, olahraga, dan kegiatan luar ruang. Tanpa batas kapasitas.",
  },
  {
    nama: "Lapangan Badminton",
    tipe: "RUANG",
    kategori: "Olahraga",
    jumlah: 10,
    perkiraan: true,
    lokasi: "Halaman sekolah",
    deskripsi:
      "Area lapangan bulu tangkis luar ruang dengan garis batas standar.",
    foto: "/images/aset/lapangan-badminton.jpeg",
  },
  {
    nama: "Lapangan Bola",
    tipe: "RUANG",
    kategori: "Outdoor",
    jumlah: 0,
    lokasi: "Area terbuka sekolah",
    deskripsi:
      "Lapangan bola terbuka untuk kegiatan sepak bola, senam, dan kegiatan luar ruang bersama.",
    foto: "/images/aset/lapangan-bola.jpeg",
  },

  // ── sarana dan furnitur ──────────────────────────────────────────────
  {
    nama: "Kursi Plastik Siswa",
    tipe: "BARANG",
    kategori: "Furnitur",
    jumlah: 60,
    perkiraan: true,
    lokasi: "Ruang Kelas",
    deskripsi: "Kursi plastik warna oranye, ringan dan mudah dipindah antar ruang.",
    foto: "/images/aset/kursi-plastik.jpeg",
  },
  {
    nama: "Meja Siswa Kayu",
    tipe: "BARANG",
    kategori: "Furnitur",
    jumlah: 48,
    perkiraan: true,
    lokasi: "Ruang Kelas",
    deskripsi: "Meja kayu panjang untuk dua siswa, berlaci di bawah permukaan mejanya.",
  },
  {
    nama: "Lemari Kayu",
    tipe: "BARANG",
    kategori: "Furnitur",
    jumlah: 6,
    perkiraan: true,
    lokasi: "Ruang Kelas",
    deskripsi:
      "Lemari kayu berdaun dua untuk menyimpan berkas dan alat peraga. Berat, perlu dua orang untuk memindahkannya.",
  },
  {
    nama: "Kursi Lipat",
    tipe: "BARANG",
    kategori: "Furnitur",
    jumlah: 20,
    perkiraan: true,
    lokasi: "Ruang Guru",
    deskripsi:
      "Kursi lipat rangka besi dengan dudukan busa biru. Biasa dipakai untuk rapat dan acara di halaman.",
  },
  {
    nama: "Meja Panjang",
    tipe: "BARANG",
    kategori: "Furnitur",
    jumlah: 6,
    perkiraan: true,
    lokasi: "Ruang Guru",
    deskripsi: "Meja panjang untuk rapat dan meja registrasi acara.",
  },
  {
    nama: "Perpustakaan",
    tipe: "RUANG",
    kategori: "Buku dan Perpustakaan",
    jumlah: 10,
    perkiraan: true,
    lokasi: "Ruang Guru",
    deskripsi:
      "Sudut baca dengan rak buku besar berisi buku paket tersusun per tingkat kelas, bersebelahan dengan lemari piala di ruang guru.",
  },

  // ── olahraga, kesehatan, permainan, dan elektronik ───────────────────
  {
    nama: "Raket Bulu Tangkis",
    tipe: "BARANG",
    kategori: "Olahraga",
    jumlah: 3,
    lokasi: "Ruang Guru",
    deskripsi:
      "Tiga raket bulu tangkis beserta dua tas pelindung. Kok disediakan terpisah dan tidak ikut dihitung sebagai aset karena habis pakai.",
    foto: "/images/aset/raket-badminton.jpeg",
  },
  {
    nama: "Bola Kaki",
    tipe: "BARANG",
    kategori: "Olahraga",
    jumlah: 4,
    lokasi: "Ruang Guru",
    deskripsi:
      "Empat bola kaki yang disimpan dalam kemasan plastik. Dipakai untuk pelajaran PJOK dan kegiatan lomba di halaman sekolah.",
    foto: "/images/aset/bola-kaki.jpeg",
  },
  {
    nama: "Bola Tenis",
    tipe: "BARANG",
    kategori: "Olahraga",
    jumlah: 12,
    perkiraan: true,
    lokasi: "Ruang Guru",
    deskripsi:
      "Satu set bola tenis untuk latihan ketangkasan dan olahraga siswa.",
    foto: "/images/aset/bola-tenis.jpeg",
  },
  {
    nama: "Bola Voli",
    tipe: "BARANG",
    kategori: "Olahraga",
    jumlah: 1,
    lokasi: "Ruang Guru",
    deskripsi: "Bola voli merek Mikasa, masih tersimpan dalam kemasan plastik.",
  },
  {
    nama: "Papan Catur",
    tipe: "BARANG",
    kategori: "Permainan",
    jumlah: 4,
    perkiraan: true,
    lokasi: "Ruang Guru",
    deskripsi:
      "Papan catur kayu lengkap dengan set bidak catur untuk kegiatan ekstrakurikuler dan lomba.",
    foto: "/images/aset/papan-catur.jpeg",
  },
  {
    nama: "Kotak P3K",
    tipe: "BARANG",
    kategori: "Kesehatan",
    jumlah: 2,
    perkiraan: true,
    lokasi: "UKS / Ruang Guru",
    deskripsi:
      "Kotak pertolongan pertama pada kecelakaan berisi kasa steril, perban, antiseptik, dan obat dasar.",
    foto: "/images/aset/kotak-p3k.jpeg",
  },
  {
    nama: "Generator",
    tipe: "BARANG",
    kategori: "Elektronik",
    jumlah: 1,
    perkiraan: true,
    lokasi: "Gudang",
    deskripsi:
      "Genset penyuplai daya listrik cadangan saat terjadi pemadaman aliran listrik sekolah.",
    foto: "/images/aset/generator.jpeg",
  },
  {
    nama: "Kipas Angin",
    tipe: "BARANG",
    kategori: "Elektronik",
    jumlah: 4,
    perkiraan: true,
    lokasi: "Ruang Guru",
    deskripsi:
      "Kipas angin berdiri untuk penyejuk ruangan pada acara pertemuan atau kegiatan belajar.",
    foto: "/images/aset/kipas-angin.jpeg",
  },
  {
    nama: "Speaker",
    tipe: "BARANG",
    kategori: "Audio Visual",
    jumlah: 2,
    perkiraan: true,
    lokasi: "Ruang Guru",
    deskripsi:
      "Unit pengeras suara aktif lengkap dengan mikrofon nirkabel untuk upacara dan pengumuman.",
    foto: "/images/aset/speaker.jpeg",
  },
  {
    nama: "Proyektor InFocus",
    tipe: "BARANG",
    kategori: "Audio Visual",
    jumlah: 1,
    lokasi: "Ruang Guru",
    deskripsi:
      "Proyektor InFocus lengkap dengan kardus aslinya. Dipakai untuk pembelajaran di kelas dan rapat guru.",
  },
  {
    nama: "Laptop Acer",
    tipe: "BARANG",
    kategori: "Elektronik",
    jumlah: 2,
    lokasi: "Ruang Guru",
    deskripsi:
      "Dua unit laptop Acer beserta adaptornya. Barang bernilai tinggi, jadi pengajuannya wajib disetujui admin lebih dulu seperti aset lain.",
  },
];

async function main() {
  let dibuat = 0;
  let diperbarui = 0;
  let fotoDiisi = 0;
  const dilewati: string[] = [];

  for (const a of ASET) {
    if (a.jumlah === null) {
      dilewati.push(a.nama);
      continue;
    }

    const ruang = a.tipe === "RUANG";
    const isi = {
      nama: a.nama,
      tipe: a.tipe,
      kategori: a.kategori,
      deskripsi: a.deskripsi,
      lokasi: a.lokasi,
      stok: ruang ? 1 : a.jumlah,
      kapasitas: ruang ? a.jumlah : null,
    };

    const ada = await prisma.aset.findFirst({
      where: { nama: a.nama },
      select: { id: true, foto: true },
    });

    if (ada) {
      const dataUpdate: Record<string, unknown> = { ...isi };
      // Foto diisi jika belum ada di database, atau jika parameter --paksa-foto aktif
      if ((!ada.foto || PAKSA_FOTO) && a.foto) {
        dataUpdate.foto = a.foto;
        fotoDiisi++;
      }
      await prisma.aset.update({ where: { id: ada.id }, data: dataUpdate });
      diperbarui++;
    } else {
      await prisma.aset.create({
        data: {
          ...isi,
          foto: a.foto ?? null,
        },
      });
      dibuat++;
      if (a.foto) fotoDiisi++;
    }
  }

  console.log(
    `Selesai. ${dibuat} aset dibuat, ${diperbarui} diperbarui, ${fotoDiisi} foto terpasang, ${dilewati.length} dilewati.`
  );

  const perkiraan = ASET.filter((a) => a.perkiraan && a.jumlah !== null);
  if (perkiraan.length > 0) {
    console.log(`\nPERLU DICEK PETUGAS: ${perkiraan.length} aset memakai angka taksiran.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
