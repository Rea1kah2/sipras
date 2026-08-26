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
 */

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL belum diisi di .env");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

/**
 * ─────────────────────────────────────────────────────────────────────────
 * DAFTAR ASET. Ini satu satunya bagian yang perlu diubah.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * jumlah = stok untuk BARANG, kapasitas orang untuk RUANG (0 berarti
 * terbuka, dipakai halaman dan lapangan).
 *
 * `perkiraan: true` menandai angka yang BELUM dihitung langsung di sekolah.
 * Angka itu tetap dipasang supaya asetnya bisa langsung dipinjam, tapi
 * ditaksir RENDAH dengan sengaja. Alasannya bukan kehati hatian umum:
 * stok yang kelebihan membuat sistem menyetujui peminjaman 30 kursi padahal
 * yang tersedia 20, dan petugas baru menyadarinya saat guru datang mengambil.
 * Stok yang kekurangan cuma menolak lebih cepat dari perlunya, dan itu bisa
 * dinaikkan admin lewat halaman Kelola aset dalam hitungan detik. Dari dua
 * arah kesalahan, yang satu gagal di depan pengguna, yang satu tidak.
 *
 * Kapasitas RUANG tidak ikut ditaksir rendah karena sifatnya beda: nilainya
 * cuma ditampilkan sebagai keterangan dan tidak pernah menjadi dasar
 * penolakan, sebab tiap ruang selalu berstok 1.
 *
 * Nilai null tetap didukung untuk aset yang ditambahkan nanti: barisnya
 * dilewati, bukan diisi nol diam diam.
 *
 * Deskripsi ditulis dari apa yang benar benar tampak di foto lokasi, bukan
 * dari bayangan umum tentang sekolah dasar.
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
};

const ASET: Baris[] = [
  // ── prasarana ────────────────────────────────────────────────────────
  {
    nama: "Ruang Kelas 1",
    tipe: "RUANG",
    kategori: "Ruang Kelas",
    jumlah: 24,
    perkiraan: true,
    lokasi: "Gedung utama",
    deskripsi:
      "Ruang kelas berdinding hijau dengan papan tulis putih, meja kayu panjang, kursi plastik, dan lemari kayu di sudut ruangan.",
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

  // ── sarana ───────────────────────────────────────────────────────────
  {
    nama: "Kursi Plastik Siswa",
    tipe: "BARANG",
    kategori: "Furnitur",
    jumlah: 60,
    perkiraan: true,
    lokasi: "Ruang Kelas",
    deskripsi: "Kursi plastik warna oranye, ringan dan mudah dipindah antar ruang.",
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
    nama: "Buku Paket Tematik",
    tipe: "BARANG",
    kategori: "Buku dan Perpustakaan",
    jumlah: 6,
    perkiraan: true,
    lokasi: "Rak Ruang Guru",
    deskripsi:
      "Buku paket tematik tersusun per tingkat kelas di rak ruang guru. Dipinjam per paket kelas, bukan per eksemplar.",
  },

  // ── olahraga dan elektronik ──────────────────────────────────────────
  // Jumlah kelima aset di bawah dihitung langsung dari foto inventaris, jadi
  // angkanya sudah terisi. Kalau ternyata sekolah punya lebih banyak daripada
  // yang sempat difoto, stoknya diubah lewat halaman Kelola aset, tidak perlu
  // menyentuh berkas ini lagi.
  {
    nama: "Raket Bulu Tangkis",
    tipe: "BARANG",
    kategori: "Olahraga",
    jumlah: 3,
    lokasi: "Ruang Guru",
    deskripsi:
      "Tiga raket bulu tangkis beserta dua tas pelindung. Kok disediakan terpisah dan tidak ikut dihitung sebagai aset karena habis pakai.",
  },
  {
    nama: "Bola Kaki",
    tipe: "BARANG",
    kategori: "Olahraga",
    jumlah: 4,
    lokasi: "Ruang Guru",
    deskripsi:
      "Empat bola kaki yang disimpan dalam kemasan plastik. Dipakai untuk pelajaran PJOK dan kegiatan lomba di halaman sekolah.",
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
  const dilewati: string[] = [];

  for (const a of ASET) {
    // Jumlah kosong berarti sekolah belum mengonfirmasi angkanya. Barisnya
    // DILEWATI, bukan membatalkan seluruh skrip: aset yang angkanya sudah pasti
    // tidak pantas tersandera oleh aset lain yang belum sempat dihitung.
    // Yang tetap ditolak adalah menebak angkanya sendiri.
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
      // Sama aturannya dengan admin/aset/aksi.ts: ruang selalu berstok 1,
      // karena satu ruang tidak bisa dipakai dua kegiatan sekaligus.
      stok: ruang ? 1 : a.jumlah,
      kapasitas: ruang ? a.jumlah : null,
    };

    // Aset.nama tidak bertanda unik di skema, jadi upsert bawaan Prisma
    // tidak bisa dipakai. Skrip ini dijalankan sekali oleh satu orang, bukan
    // bersamaan, jadi cari lalu tulis sudah memadai di sini.
    const ada = await prisma.aset.findFirst({
      where: { nama: a.nama },
      select: { id: true },
    });

    if (ada) {
      // Foto sengaja tidak ikut ditulis. Kalau admin sudah memasang foto
      // lewat antarmuka, menjalankan skrip ini lagi tidak boleh menghapusnya.
      await prisma.aset.update({ where: { id: ada.id }, data: isi });
      diperbarui++;
    } else {
      await prisma.aset.create({ data: isi });
      dibuat++;
    }
  }

  console.log(
    `Selesai. ${dibuat} aset dibuat, ${diperbarui} diperbarui, ${dilewati.length} dilewati.`
  );
  if (dibuat === 0 && diperbarui > 0) {
    console.log("Semua aset berangka sudah ada sebelumnya, jadi tidak ada yang ditambahkan.");
  }
  if (dilewati.length > 0) {
    console.log("\nBelum masuk karena jumlahnya masih kosong:");
    for (const nama of dilewati) console.log(`  - ${nama}`);
    console.log(
      "\nIsi kolom jumlah untuk aset di atas pada berkas prisma/isi-aset-sekolah.ts," +
        "\nlalu jalankan npm run db:aset sekali lagi. Yang sudah masuk tidak akan" +
        "\nterduplikasi, cuma diperbarui."
    );
  }

  // Daftar ini yang membuat sifat sementara angkanya tidak hilang begitu
  // skripnya selesai. Tanpa dicetak di sini, taksiran akan terbaca sebagai
  // hasil hitungan sungguhan oleh siapa pun yang membuka katalog nanti.
  const perkiraan = ASET.filter((a) => a.perkiraan && a.jumlah !== null);
  if (perkiraan.length > 0) {
    console.log(`\nPERLU DICEK PETUGAS. ${perkiraan.length} aset memakai angka taksiran,`);
    console.log("bukan hasil hitungan langsung di sekolah:\n");
    for (const a of perkiraan) {
      const satuan = a.tipe === "RUANG" ? "orang" : "unit";
      console.log(`  ${a.nama.padEnd(22)} ${String(a.jumlah).padStart(3)} ${satuan}`);
    }
    console.log(
      "\nSemuanya sudah bisa dipinjam sekarang. Angka barang sengaja ditaksir" +
        "\nRENDAH: stok kelebihan membuat sistem menyetujui peminjaman barang yang" +
        "\ntidak ada, sedangkan stok kekurangan cuma menolak lebih cepat dari" +
        "\nperlunya. Betulkan lewat halaman Kelola aset, tanpa menyentuh kode."
    );
  }

  console.log("\nFoto tiap aset dipasang sendiri lewat halaman Kelola aset.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
