import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";
import type { StatusPengajuan, KondisiKembali } from "../src/generated/prisma/enums";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL belum diisi di .env");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

/** Tanggal relatif hari ini (WIB) supaya data demo selalu terasa hidup. */
function hari(offset: number): Date {
  const wib = new Date(Date.now() + 7 * 60 * 60 * 1000);
  const iso = wib.toISOString().slice(0, 10);
  const d = new Date(`${iso}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + offset);
  return d;
}

const ASET = [
  { nama: "Proyektor InFocus", tipe: "BARANG", kategori: "Audio Visual", stok: 2, lokasi: "Ruang Guru", deskripsi: "Proyektor InFocus lengkap dengan kardus aslinya. Dipakai untuk pembelajaran di kelas dan rapat guru." },
  { nama: "Sound System Portable", tipe: "BARANG", kategori: "Audio Visual", stok: 1, lokasi: "Ruang Guru", deskripsi: "Speaker aktif dengan dua mikrofon wireless dan tripod stand. Biasa dipakai untuk upacara dan acara di halaman." },
  { nama: "Microphone Wireless", tipe: "BARANG", kategori: "Audio Visual", stok: 4, lokasi: "Ruang Guru", deskripsi: "Mikrofon wireless handheld dengan receiver dan baterai cadangan." },
  { nama: "Kursi Plastik Siswa", tipe: "BARANG", kategori: "Furnitur", stok: 120, lokasi: "Ruang Kelas", deskripsi: "Kursi plastik warna oranye, ringan dan mudah dipindah antar ruang." },
  { nama: "Meja Siswa Kayu", tipe: "BARANG", kategori: "Furnitur", stok: 60, lokasi: "Ruang Kelas", deskripsi: "Meja kayu panjang untuk dua siswa, berlaci di bawah permukaan mejanya." },
  { nama: "Kursi Lipat", tipe: "BARANG", kategori: "Furnitur", stok: 30, lokasi: "Ruang Guru", deskripsi: "Kursi lipat rangka besi dengan dudukan busa biru. Peminjaman di atas 20 unit perlu koordinasi petugas untuk pengangkutan." },
  { nama: "Buku Paket Tematik", tipe: "BARANG", kategori: "Buku dan Perpustakaan", stok: 12, lokasi: "Rak Ruang Guru", deskripsi: "Buku paket tematik tersusun per tingkat kelas. Dipinjam per paket kelas, bukan per eksemplar." },
  { nama: "Laptop Acer", tipe: "BARANG", kategori: "Elektronik", stok: 2, lokasi: "Ruang Guru", deskripsi: "Dua unit laptop Acer beserta adaptornya. Barang bernilai tinggi, jadi pengajuannya wajib disetujui admin lebih dulu seperti aset lain." },
  { nama: "Raket Bulu Tangkis", tipe: "BARANG", kategori: "Olahraga", stok: 3, lokasi: "Ruang Guru", deskripsi: "Tiga raket bulu tangkis beserta dua tas pelindung. Kok disediakan terpisah." },
  { nama: "Bola Kaki", tipe: "BARANG", kategori: "Olahraga", stok: 4, lokasi: "Ruang Guru", deskripsi: "Empat bola kaki untuk pelajaran PJOK dan kegiatan lomba di halaman sekolah." },
  { nama: "Bola Voli", tipe: "BARANG", kategori: "Olahraga", stok: 1, lokasi: "Ruang Guru", deskripsi: "Bola voli merek Mikasa, masih tersimpan dalam kemasan plastik." },
  { nama: "Ruang Kelas 4", tipe: "RUANG", kategori: "Ruang Kelas", kapasitas: 28, lokasi: "Gedung utama", deskripsi: "Ruang kelas dengan papan tulis putih, meja kayu panjang, kursi plastik, dan lemari kayu di sudut ruangan." },
  { nama: "Ruang Kelas 5", tipe: "RUANG", kategori: "Ruang Kelas", kapasitas: 26, lokasi: "Gedung utama", deskripsi: "Ruang kelas dengan papan tulis putih, meja kayu panjang, kursi plastik, dan lemari kayu di sudut ruangan." },
  { nama: "Ruang Kelas 6", tipe: "RUANG", kategori: "Ruang Kelas", kapasitas: 24, lokasi: "Gedung utama", deskripsi: "Ruang kelas dengan papan tulis putih, meja kayu panjang, kursi plastik, dan lemari kayu di sudut ruangan." },
  { nama: "Ruang Guru", tipe: "RUANG", kategori: "Ruang Kerja dan Rapat", kapasitas: 15, lokasi: "Gedung utama", deskripsi: "Ruang kerja guru sekaligus tempat rapat kecil. Berisi rak buku besar, lemari kaca piala, dan meja panjang bertaplak." },
  { nama: "Halaman Sekolah", tipe: "RUANG", kategori: "Outdoor", kapasitas: 0, lokasi: "Depan gedung utama", deskripsi: "Halaman tanah luas dengan tiang bendera, dipakai upacara, olahraga, dan kegiatan luar ruang. Tanpa batas kapasitas." },
] as const;

async function main() {
  console.log("🌱 Menyiapkan data awal SIPRAS...");

  // Bersihkan dulu supaya seed bisa dijalankan berulang tanpa menumpuk.
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

  // ── pengguna ────────────────────────────────────────────────────────
  const sandiAdmin = await hash("admin1234", 10);
  const sandiUmum = await hash("peminjam1234", 10);

  // Email admin sengaja memakai alamat asli pemilik sistem. Resend paket
  // gratis hanya mengantar ke email pemilik akun, jadi ini satu satunya cara
  // notifikasi email benar benar sampai tanpa memverifikasi domain lebih dulu.
  const emailAdmin = process.env.EMAIL_REPLY_TO?.trim() || "admin@sekolah.sch.id";

  const admin = await prisma.user.create({
    data: {
      nama: "Rizky Admin",
      email: emailAdmin,
      password: sandiAdmin,
      peran: "ADMIN",
      whatsapp: process.env.NEXT_PUBLIC_WA_PETUGAS ?? "082214669132",
      identitas: "198501022008011002",
      unit: "Operator Sarpras",
    },
  });

  const [siti, bagus, dimas, sari, fajar] = await Promise.all(
    [
      { nama: "Siti Aminah", email: "siti@gmail.com", identitas: "198504122010012003", unit: "Guru Kelas 4", whatsapp: "081234567890" },
      { nama: "Bagus Prakoso", email: "bagus@gmail.com", identitas: "198711232011011005", unit: "Guru Kelas 6", whatsapp: "081234567891" },
      { nama: "Dimas Aryo", email: "dimas@gmail.com", identitas: "199003052014021001", unit: "Guru PJOK", whatsapp: "081234567892" },
      { nama: "Sari Melati", email: "sari@gmail.com", identitas: "199003112012012004", unit: "Tata Usaha", whatsapp: "081234567893" },
      { nama: "Fajar Nugroho", email: "fajar@gmail.com", identitas: "199208172015031002", unit: "Guru Kelas 2", whatsapp: "081234567894" },
    ].map((u) => prisma.user.create({ data: { ...u, password: sandiUmum } }))
  );

  // ── aset ────────────────────────────────────────────────────────────
  const aset: Record<string, string> = {};
  for (const a of ASET) {
    const dibuat = await prisma.aset.create({
      data: {
        nama: a.nama,
        tipe: a.tipe,
        kategori: a.kategori,
        deskripsi: a.deskripsi,
        lokasi: a.lokasi,
        stok: a.tipe === "BARANG" ? a.stok : 1,
        kapasitas: a.tipe === "RUANG" ? a.kapasitas : null,
      },
    });
    aset[a.nama] = dibuat.id;
  }

  // ── pengajuan ───────────────────────────────────────────────────────
  type Benih = {
    kode: string;
    pemohonId: string;
    mulai: number;
    selesai: number;
    diajukan: number;
    namaKegiatan: string;
    keperluan: string;
    status: StatusPengajuan;
    catatanAdmin?: string;
    items: { nama: string; jumlah: number }[];
    retur?: { offset: number; kondisi: KondisiKembali; catatan: string; diverifikasi?: boolean };
  };

  /**
   * Riwayat enam bulan ke belakang.
   *
   * Tanpa ini halaman laporan hanya punya tiga pengajuan selesai, dan grafik
   * tren enam bulan tampil nyaris kosong sehingga fiturnya terlihat gagal
   * padahal kuerinya benar.
   *
   * Acaknya DETERMINISTIK memakai benih tetap. Seed yang hasilnya berubah
   * tiap dijalankan membuat angka di laporan tidak bisa dicocokkan ulang,
   * dan verifikasi jadi mustahil.
   *
   * Semuanya berstatus SELESAI atau DITOLAK, dan keduanya tidak ada di
   * STATUS_MEMAKAI_ASET. Jadi tumpang tindih tanggal di masa lalu tidak
   * akan memunculkan bentrok palsu pada pengajuan baru.
   */
  function acakBerurut(benihAwal: number) {
    let n = benihAwal;
    return () => {
      // Pengali dan modulus LCG klasik. Tidak untuk kriptografi, hanya
      // supaya urutannya sama setiap kali seed dijalankan.
      n = (n * 1103515245 + 12345) % 2147483648;
      return n / 2147483648;
    };
  }

  function riwayatEnamBulan(): Benih[] {
    const acak = acakBerurut(20260816);
    const ambil = <T,>(a: readonly T[]): T => a[Math.floor(acak() * a.length)];

    const peminjam = [siti, bagus, dimas, sari, fajar];
    const barang = ASET.filter((a) => a.tipe === "BARANG").map((a) => a.nama);
    const ruang = ASET.filter((a) => a.tipe === "RUANG").map((a) => a.nama);
    const kegiatan = [
      "Rapat Wali Murid", "Lomba Kebersihan Kelas", "Rapat Guru", "Senam Bersama",
      "Pelatihan Kurikulum", "Bazar Hari Guru", "Class Meeting", "Pentas Seni Siswa",
      "Sosialisasi Kesehatan Gigi", "Rapat Evaluasi", "Pembagian Rapor",
      "Kunjungan Pengawas", "Peringatan Maulid", "Pemutaran Film Edukasi",
    ];

    const keluar: Benih[] = [];
    let nomor = 900;

    // Tersebar 6 bulan, kira kira 180 hari ke belakang sampai 20 hari lalu.
    for (let i = 0; i < 60; i++) {
      const mulai = -Math.floor(20 + acak() * 160);
      const lama = 1 + Math.floor(acak() * 4); // 1 sampai 4 hari
      const selesai = mulai + lama - 1;
      const diajukan = mulai - (1 + Math.floor(acak() * 6));

      // Sekitar satu dari delapan ditolak, supaya perbandingannya berisi
      // tanpa membuat sistemnya terlihat sering menolak.
      const ditolak = acak() < 0.13;
      const pakaiRuang = acak() < 0.55;
      const item: Benih["items"] = pakaiRuang
        ? [{ nama: ambil(ruang), jumlah: 1 }]
        : [{ nama: ambil(barang), jumlah: 1 + Math.floor(acak() * 3) }];

      // Sebagian pengajuan membawa dua item, seperti pemakaian sungguhan.
      if (!pakaiRuang && acak() < 0.35) item.push({ nama: ambil(ruang), jumlah: 1 });

      const orang = ambil(peminjam);
      const nama = ambil(kegiatan);

      keluar.push({
        kode: `PJ-2026-0${nomor++}`,
        pemohonId: orang.id,
        mulai,
        selesai,
        diajukan,
        namaKegiatan: nama,
        keperluan: `${nama} yang diajukan ${orang.unit}.`,
        status: ditolak ? "DITOLAK" : "SELESAI",
        items: item,
        catatanAdmin: ditolak
          ? "Aset sudah dipesan kegiatan lain di tanggal tersebut."
          : "Selesai, aset kembali lengkap.",
        ...(ditolak
          ? {}
          : {
              retur: {
                offset: selesai,
                kondisi: (acak() < 0.12 ? "RUSAK_RINGAN" : "BAIK") as KondisiKembali,
                catatan: "Diperiksa petugas saat pengembalian.",
                diverifikasi: true,
              },
            }),
      });
    }
    return keluar;
  }

  const benih: Benih[] = [
    {
      kode: "PJ-2026-0142", pemohonId: siti.id, mulai: 1, selesai: 3, diajukan: -2,
      namaKegiatan: "Rapat Wali Murid Kelas 4",
      keperluan: "Pertemuan wali murid kelas 4 membahas persiapan ujian, butuh proyektor dan ruang kelas.",
      status: "MENUNGGU",
      items: [{ nama: "Proyektor InFocus", jumlah: 1 }, { nama: "Ruang Kelas 4", jumlah: 1 }],
    },
    {
      kode: "PJ-2026-0141", pemohonId: bagus.id, mulai: 0, selesai: 1, diajukan: -2,
      namaKegiatan: "Latihan Upacara Bendera",
      keperluan: "Latihan petugas upacara di halaman sekolah, butuh sound system dan mikrofon.",
      status: "MENUNGGU",
      items: [{ nama: "Sound System Portable", jumlah: 1 }, { nama: "Microphone Wireless", jumlah: 2 }],
    },
    {
      kode: "PJ-2026-0138", pemohonId: siti.id, mulai: 7, selesai: 8, diajukan: -5,
      namaKegiatan: "Peringatan Hari Kemerdekaan",
      keperluan: "Lomba dan pentas seni di halaman sekolah, butuh kursi tambahan untuk tamu undangan.",
      status: "DISETUJUI",
      catatanAdmin: "Disetujui. Kursi diambil di ruang guru dan dikembalikan ke tempat semula setelah acara.",
      items: [{ nama: "Halaman Sekolah", jumlah: 1 }, { nama: "Kursi Lipat", jumlah: 25 }],
    },
    {
      kode: "PJ-2026-0135", pemohonId: siti.id, mulai: -5, selesai: 1, diajukan: -8,
      namaKegiatan: "Pembelajaran Tematik Kelas 4",
      keperluan: "Pemakaian buku paket tematik dan proyektor untuk pembelajaran sepekan.",
      status: "DIPINJAM",
      catatanAdmin: "Disetujui, mohon buku dikembalikan lengkap.",
      items: [{ nama: "Buku Paket Tematik", jumlah: 1 }, { nama: "Proyektor InFocus", jumlah: 1 }],
    },
    {
      kode: "PJ-2026-0131", pemohonId: siti.id, mulai: -8, selesai: -7, diajukan: -11,
      namaKegiatan: "Pelatihan Kurikulum Merdeka",
      keperluan: "Pelatihan sehari untuk seluruh guru di ruang guru.",
      status: "DIKEMBALIKAN",
      catatanAdmin: "Disetujui.",
      items: [{ nama: "Ruang Guru", jumlah: 1 }],
      retur: { offset: -7, kondisi: "BAIK", catatan: "Ruang sudah dirapikan dan kursi ditata ulang." },
    },
    {
      kode: "PJ-2026-0118", pemohonId: fajar.id, mulai: -4, selesai: -3, diajukan: -7,
      namaKegiatan: "Bazar Hari Guru",
      keperluan: "Bazar makanan siswa di halaman, butuh meja dan kursi untuk stan.",
      status: "DIKEMBALIKAN",
      catatanAdmin: "Disetujui.",
      items: [{ nama: "Meja Siswa Kayu", jumlah: 6 }, { nama: "Kursi Lipat", jumlah: 12 }],
      retur: { offset: -3, kondisi: "RUSAK_RINGAN", catatan: "Satu kursi lipat engselnya agak kendur." },
    },
    {
      kode: "PJ-2026-0128", pemohonId: siti.id, mulai: -12, selesai: -11, diajukan: -14,
      namaKegiatan: "Rapat Koordinasi Guru",
      keperluan: "Rapat koordinasi guru membahas jadwal pelajaran semester baru.",
      status: "SELESAI",
      catatanAdmin: "Selesai, alat lengkap.",
      items: [{ nama: "Proyektor InFocus", jumlah: 1 }],
      retur: { offset: -11, kondisi: "BAIK", catatan: "Alat lengkap dan berfungsi normal.", diverifikasi: true },
    },
    {
      kode: "PJ-2026-0120", pemohonId: sari.id, mulai: -16, selesai: -16, diajukan: -19,
      namaKegiatan: "Rapat Evaluasi Semester",
      keperluan: "Rapat evaluasi semester untuk guru dan tenaga kependidikan.",
      status: "SELESAI",
      catatanAdmin: "Selesai tanpa catatan.",
      items: [{ nama: "Ruang Guru", jumlah: 1 }],
      retur: { offset: -16, kondisi: "BAIK", catatan: "Ruang bersih.", diverifikasi: true },
    },
    {
      kode: "PJ-2026-0126", pemohonId: dimas.id, mulai: -10, selesai: -9, diajukan: -15,
      namaKegiatan: "Latihan Senam Kesegaran Jasmani",
      keperluan: "Latihan senam bersama siswa di halaman sekolah.",
      status: "DITOLAK",
      catatanAdmin: "Halaman dipakai kegiatan lain di tanggal tersebut. Silakan ajukan ulang untuk pekan depan.",
      items: [{ nama: "Halaman Sekolah", jumlah: 1 }],
    },
    ...riwayatEnamBulan(),
  ];

  for (const b of benih) {
    const p = await prisma.pengajuan.create({
      data: {
        kode: b.kode,
        pemohonId: b.pemohonId,
        mulai: hari(b.mulai),
        selesai: hari(b.selesai),
        namaKegiatan: b.namaKegiatan,
        keperluan: b.keperluan,
        kontakWhatsapp: "081234567890",
        status: b.status,
        catatanAdmin: b.catatanAdmin,
        diajukanPada: hari(b.diajukan),
        items: {
          create: b.items.map((i) => ({
            asetId: aset[i.nama],
            jumlah: i.jumlah,
            namaAset: i.nama,
          })),
        },
        riwayatStatus: {
          create: {
            dari: null,
            ke: "MENUNGGU",
            olehId: b.pemohonId,
            catatan: "Pengajuan dibuat.",
            waktu: hari(b.diajukan),
          },
        },
      },
      include: { items: true },
    });

    // Jejak perpindahan status sesudah MENUNGGU.
    const jalur: StatusPengajuan[] = [];
    if (b.status === "DITOLAK") jalur.push("DITOLAK");
    else if (b.status !== "MENUNGGU") {
      jalur.push("DISETUJUI");
      if (b.status !== "DISETUJUI") jalur.push("DIPINJAM");
      if (b.status === "DIKEMBALIKAN" || b.status === "SELESAI") jalur.push("DIKEMBALIKAN");
      if (b.status === "SELESAI") jalur.push("SELESAI");
    }
    let sebelum: StatusPengajuan = "MENUNGGU";
    for (const [i, ke] of jalur.entries()) {
      await prisma.riwayatStatus.create({
        data: {
          pengajuanId: p.id,
          dari: sebelum,
          ke,
          olehId: admin.id,
          waktu: hari(b.diajukan + i + 1),
        },
      });
      sebelum = ke;
    }

    if (b.retur) {
      const kembali = await prisma.pengembalian.create({
        data: {
          pengajuanId: p.id,
          tanggalKembali: hari(b.retur.offset),
          kondisiRingkas: b.retur.kondisi,
          catatan: b.retur.catatan,
          foto: [],
          diverifikasi: b.retur.diverifikasi ?? false,
          verifikatorId: b.retur.diverifikasi ? admin.id : null,
          diverifikasiPada: b.retur.diverifikasi ? hari(b.retur.offset + 1) : null,
          catatanVerifikasi: b.retur.diverifikasi ? "Kondisi sesuai laporan." : null,
        },
      });
      await prisma.pengembalianItem.createMany({
        data: p.items.map((it) => ({
          pengembalianId: kembali.id,
          pengajuanItemId: it.id,
          kondisi: b.retur!.kondisi,
        })),
      });
    }
  }

  // ── hari layanan dan tanggal tutup ──────────────────────────────────
  // Bawaannya Senin sampai Sabtu, Minggu tutup. Angkanya adalah getUTCDay,
  // 0 Minggu sampai 6 Sabtu, sama seperti yang dipakai lib/penutupan.ts.
  await prisma.pengaturan.create({
    data: { id: "tunggal", hariLayanan: [1, 2, 3, 4, 5, 6], jamBuka: "08.00", jamTutup: "16.00" },
  });

  // Satu hari libur di masa depan, supaya fitur ini langsung terlihat
  // dipakai tanpa perlu admin menandainya sendiri lebih dulu saat demo.
  await prisma.penutupan.create({
    data: {
      tanggal: hari(14),
      alasan: "Libur nasional",
      jenis: "LIBUR",
      olehId: admin.id,
    },
  });
  // Satu jendela perawatan beberapa hari, contoh rentang bukan cuma satu hari.
  for (let i = 25; i <= 27; i++) {
    await prisma.penutupan.create({
      data: {
        tanggal: hari(i),
        alasan: "Perawatan gedung, listrik dipadamkan",
        jenis: "PERAWATAN",
        olehId: admin.id,
      },
    });
  }

  // ── notifikasi contoh ───────────────────────────────────────────────
  // Notifikasi contoh dibuat BERKUNCI, sama seperti yang dihasilkan aplikasi
  // sungguhan. Kalau hanya berisi kalimat jadi, pemasangan baru langsung
  // punya riwayat yang tidak bisa ikut bahasa, dan itu yang pertama dilihat
  // penguji. judul dan isi tetap diisi sebagai cadangan.
  await prisma.notifikasi.createMany({
    data: [
      {
        userId: siti.id,
        judul: "Pengajuan PJ-2026-0138 disetujui",
        isi: "Pemakaian 20 Agu 2026 - 21 Agu 2026 disetujui. Kursi diambil di ruang guru.",
        kunci: "review.disetujui",
        data: {
          kode: "PJ-2026-0138",
          mulai: "2026-08-20",
          selesai: "2026-08-21",
          catatan: "Kursi diambil di ruang guru.",
        },
        tautan: "/pengajuan",
      },
      {
        userId: siti.id,
        judul: "Pengembalian PJ-2026-0131 terkirim",
        isi: "Menunggu admin memeriksa kondisi fisiknya. Kamu akan dikabari begitu pengajuan ditutup.",
        kunci: "kembali.terkirim",
        data: { kode: "PJ-2026-0131" },
        tautan: "/pengajuan",
      },
      {
        userId: admin.id,
        judul: "Pengajuan baru menunggu review",
        isi: "PJ-2026-0142 dari Siti Aminah (Guru Kelas 4) menunggu review.",
        kunci: "ajukan.adminBaru",
        data: { kode: "PJ-2026-0142", nama: "Siti Aminah", unit: "Guru Kelas 4" },
        tautan: "/admin/review",
      },
      {
        userId: admin.id,
        judul: "Pengembalian menunggu verifikasi",
        isi: "Fajar Nugroho menandai PJ-2026-0118 sudah dikembalikan.",
        kunci: "kembali.adminBaru",
        data: { kode: "PJ-2026-0118", nama: "Fajar Nugroho" },
        tautan: "/admin/verifikasi",
      },
    ],
  });

  const jumlahAset = await prisma.aset.count();
  const jumlahPengajuan = await prisma.pengajuan.count();
  console.log(`✅ Selesai: 6 pengguna, ${jumlahAset} aset, ${jumlahPengajuan} pengajuan.`);
  console.log("\n   Akun demo:");
  console.log(`   • Admin    → ${emailAdmin} / admin1234`);
  console.log("   • Peminjam → siti@gmail.com / peminjam1234\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
