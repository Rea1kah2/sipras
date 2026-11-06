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
      nama: "Administrator Sarpras",
      email: emailAdmin,
      password: sandiAdmin,
      peran: "ADMIN",
      whatsapp: process.env.NEXT_PUBLIC_WA_PETUGAS ?? "081234567890",
      identitas: "198501022008011002",
      unit: "Pengelola Sarpras",
    },
  });

  // Jika emailAdmin bukan admin@kampus.ac.id, buat juga admin@kampus.ac.id
  // agar tombol demo admin selalu bekerja tanpa kegagalan.
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
        stok: a.tipe === "BARANG" ? (a as { stok: number }).stok : 1,
        kapasitas: a.tipe === "RUANG" ? (a as { kapasitas: number }).kapasitas : null,
        foto: a.foto,
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
      namaKegiatan: "Rapat Wali Murid Kelas 4A",
      keperluan: "Pertemuan wali murid kelas 4A membahas persiapan ujian, butuh speaker dan ruang kelas.",
      status: "MENUNGGU",
      items: [{ nama: "Speaker Portable", jumlah: 1 }, { nama: "Ruang Kelas 4A", jumlah: 1 }],
    },
    {
      kode: "PJ-2026-0141", pemohonId: bagus.id, mulai: 0, selesai: 1, diajukan: -2,
      namaKegiatan: "Latihan Upacara Bendera",
      keperluan: "Latihan petugas upacara di lapangan sekolah, butuh speaker dan genset cadangan.",
      status: "MENUNGGU",
      items: [{ nama: "Speaker Portable", jumlah: 1 }, { nama: "Generator Listrik", jumlah: 1 }],
    },
    {
      kode: "PJ-2026-0138", pemohonId: siti.id, mulai: 7, selesai: 8, diajukan: -5,
      namaKegiatan: "Peringatan Hari Kemerdekaan",
      keperluan: "Lomba dan pentas seni di lapangan bola, butuh kursi tambahan untuk tamu undangan.",
      status: "DISETUJUI",
      catatanAdmin: "Disetujui. Kursi diambil di gudang sarana dan dikembalikan ke tempat semula setelah acara.",
      items: [{ nama: "Lapangan Bola", jumlah: 1 }, { nama: "Kursi Plastik", jumlah: 25 }],
    },
    {
      kode: "PJ-2026-0135", pemohonId: siti.id, mulai: -5, selesai: 1, diajukan: -8,
      namaKegiatan: "Turnamen Catur Siswa",
      keperluan: "Pemakaian papan catur dan speaker untuk pembukaan lomba catur antar kelas.",
      status: "DIPINJAM",
      catatanAdmin: "Disetujui, mohon bidak catur dikembalikan lengkap.",
      items: [{ nama: "Papan Catur", jumlah: 4 }, { nama: "Speaker Portable", jumlah: 1 }],
    },
    {
      kode: "PJ-2026-0131", pemohonId: siti.id, mulai: -8, selesai: -7, diajukan: -11,
      namaKegiatan: "Pelatihan Kurikulum Merdeka",
      keperluan: "Pelatihan sehari untuk seluruh guru di ruang laboratorium.",
      status: "DIKEMBALIKAN",
      catatanAdmin: "Disetujui.",
      items: [{ nama: "Ruang Laboratorium", jumlah: 1 }],
      retur: { offset: -7, kondisi: "BAIK", catatan: "Ruang sudah dirapikan dan kursi ditata ulang." },
    },
    {
      kode: "PJ-2026-0118", pemohonId: fajar.id, mulai: -4, selesai: -3, diajukan: -7,
      namaKegiatan: "Bazar Hari Guru",
      keperluan: "Bazar makanan siswa di lapangan, butuh kursi dan kipas angin untuk stan.",
      status: "DIKEMBALIKAN",
      catatanAdmin: "Disetujui.",
      items: [{ nama: "Kursi Plastik", jumlah: 20 }, { nama: "Kipas Angin", jumlah: 2 }],
      retur: { offset: -3, kondisi: "RUSAK_RINGAN", catatan: "Satu kursi plastik retak di bagian sandaran." },
    },
    {
      kode: "PJ-2026-0128", pemohonId: siti.id, mulai: -12, selesai: -11, diajukan: -14,
      namaKegiatan: "Rapat Koordinasi Guru",
      keperluan: "Rapat koordinasi guru membahas jadwal pelajaran semester baru.",
      status: "SELESAI",
      catatanAdmin: "Selesai, alat lengkap.",
      items: [{ nama: "Speaker Portable", jumlah: 1 }],
      retur: { offset: -11, kondisi: "BAIK", catatan: "Alat lengkap dan berfungsi normal.", diverifikasi: true },
    },
    {
      kode: "PJ-2026-0120", pemohonId: sari.id, mulai: -16, selesai: -16, diajukan: -19,
      namaKegiatan: "Rapat Evaluasi Semester",
      keperluan: "Rapat evaluasi semester untuk guru dan tenaga kependidikan.",
      status: "SELESAI",
      catatanAdmin: "Selesai tanpa catatan.",
      items: [{ nama: "Ruang Laboratorium", jumlah: 1 }],
      retur: { offset: -16, kondisi: "BAIK", catatan: "Ruang bersih.", diverifikasi: true },
    },
    {
      kode: "PJ-2026-0126", pemohonId: dimas.id, mulai: -10, selesai: -9, diajukan: -15,
      namaKegiatan: "Latihan Senam Kesegaran Jasmani",
      keperluan: "Latihan senam bersama siswa di lapangan bola.",
      status: "DITOLAK",
      catatanAdmin: "Lapangan dipakai kegiatan lain di tanggal tersebut. Silakan ajukan ulang untuk pekan depan.",
      items: [{ nama: "Lapangan Bola", jumlah: 1 }],
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
