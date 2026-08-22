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
  { nama: "Proyektor Epson EB-X51", tipe: "BARANG", kategori: "Audio Visual", stok: 8, lokasi: "Gudang Sarpras Lt. 1", deskripsi: "Proyektor 3.800 lumens, sudah termasuk kabel HDMI 5 m, remote, dan tas jinjing. Cocok untuk ruang kelas sampai aula kecil." },
  { nama: "Sound System Portable", tipe: "BARANG", kategori: "Audio Visual", stok: 3, lokasi: "Gudang Sarpras Lt. 1", deskripsi: "Speaker aktif 15 inci dengan dua mikrofon wireless dan tripod stand. Cukup untuk audiens sekitar 150 orang di ruang tertutup." },
  { nama: "Kamera Mirrorless A6400", tipe: "BARANG", kategori: "Elektronik", stok: 4, lokasi: "Ruang Media Lt. 2", deskripsi: "Body kamera dengan lensa kit 16-50 mm, dua baterai, dan memory card 64 GB. Wajib dikembalikan lengkap dengan tutup lensa." },
  { nama: "Tripod Video Fluid Head", tipe: "BARANG", kategori: "Elektronik", stok: 12, lokasi: "Ruang Media Lt. 2", deskripsi: "Tripod aluminium tinggi maksimal 165 cm dengan fluid head untuk panning halus." },
  { nama: "Kursi Lipat", tipe: "BARANG", kategori: "Furnitur", stok: 120, lokasi: "Gudang Gedung C", deskripsi: "Kursi lipat rangka besi dudukan busa. Peminjaman di atas 50 unit perlu koordinasi petugas untuk pengangkutan." },
  { nama: "Meja Lipat 120 cm", tipe: "BARANG", kategori: "Furnitur", stok: 30, lokasi: "Gudang Gedung C", deskripsi: "Meja lipat panjang 120 cm, biasa dipakai untuk meja registrasi dan bazar." },
  { nama: "Microphone Wireless", tipe: "BARANG", kategori: "Audio Visual", stok: 6, lokasi: "Gudang Sarpras Lt. 1", deskripsi: "Mikrofon wireless handheld dengan receiver dan baterai cadangan." },
  { nama: "Aula Serbaguna", tipe: "RUANG", kategori: "Ruang Pertemuan", kapasitas: 300, lokasi: "Gedung C Lt. 3", deskripsi: "Aula utama dengan panggung, tata suara terpasang, dan pendingin ruangan. Kursi diatur sendiri oleh peminjam." },
  { nama: "Ruang Rapat Dekanat", tipe: "RUANG", kategori: "Ruang Pertemuan", kapasitas: 25, lokasi: "Gedung A Lt. 2", deskripsi: "Ruang rapat dengan meja oval, layar 65 inci, dan papan tulis. Perlu persetujuan untuk pemakaian di luar jam kerja." },
  { nama: "Lab Multimedia", tipe: "RUANG", kategori: "Laboratorium", kapasitas: 40, lokasi: "Gedung D Lt. 1", deskripsi: "40 unit komputer dengan perangkat desain dan editing video, tidak boleh dipakai bersamaan dengan jadwal praktikum." },
  { nama: "Ruang Seminar B2", tipe: "RUANG", kategori: "Ruang Pertemuan", kapasitas: 80, lokasi: "Gedung B Lt. 2", deskripsi: "Ruang seminar berundak dengan proyektor terpasang dan meja pembicara." },
  { nama: "Studio Podcast", tipe: "RUANG", kategori: "Laboratorium", kapasitas: 6, lokasi: "Gedung D Lt. 2", deskripsi: "Studio kedap suara dengan tiga mikrofon kondensor, mixer, dan lighting dasar." },
  { nama: "Lapangan Basket", tipe: "RUANG", kategori: "Outdoor", kapasitas: 0, lokasi: "Area Timur", deskripsi: "Lapangan basket outdoor dengan lampu sorot. Pemakaian malam maksimal sampai pukul 22.00." },
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
  const emailAdmin = process.env.EMAIL_REPLY_TO?.trim() || "admin@kampus.ac.id";

  const admin = await prisma.user.create({
    data: {
      nama: "Rizky Admin",
      email: emailAdmin,
      password: sandiAdmin,
      peran: "ADMIN",
      whatsapp: process.env.NEXT_PUBLIC_WA_PETUGAS ?? "082214669132",
      identitas: "19850102",
      unit: "Bagian Sarana dan Prasarana",
    },
  });

  const [nadia, bagus, dimas, sari, fajar] = await Promise.all(
    [
      { nama: "Nadia Rahmawati", email: "nadia@kampus.ac.id", identitas: "21.01.2345", unit: "Teknologi Pangan", whatsapp: "081234567890" },
      { nama: "Bagus Prakoso", email: "bagus@kampus.ac.id", identitas: "21.03.1180", unit: "BEM Fakultas Teknik", whatsapp: "081234567891" },
      { nama: "Dimas Aryo", email: "dimas@kampus.ac.id", identitas: "22.05.0431", unit: "Ilmu Komunikasi", whatsapp: "081234567892" },
      { nama: "Sari Melati", email: "sari@kampus.ac.id", identitas: "19900311", unit: "Tata Usaha", whatsapp: "081234567893" },
      { nama: "Fajar Nugroho", email: "fajar@kampus.ac.id", identitas: "20.02.0912", unit: "Teknik Industri", whatsapp: "081234567894" },
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

    const peminjam = [nadia, bagus, dimas, sari, fajar];
    const barang = ASET.filter((a) => a.tipe === "BARANG").map((a) => a.nama);
    const ruang = ASET.filter((a) => a.tipe === "RUANG").map((a) => a.nama);
    const kegiatan = [
      "Seminar Jurusan", "Workshop Praktikum", "Rapat Koordinasi", "Kuliah Tamu",
      "Pelatihan Software", "Bazar Kewirausahaan", "Lomba Debat", "Pentas Seni",
      "Sosialisasi Beasiswa", "Rapat Evaluasi", "Dokumentasi Wisuda",
      "Pengabdian Masyarakat", "Diskusi Panel", "Pemutaran Film Edukasi",
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
        keperluan: `${nama} yang diselenggarakan ${orang.unit}.`,
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
      kode: "PJ-2026-0142", pemohonId: nadia.id, mulai: 1, selesai: 3, diajukan: -2,
      namaKegiatan: "Seminar Nasional Teknologi Pangan",
      keperluan: "Seminar nasional dengan sekitar 120 peserta, butuh proyektor dan ruang seminar.",
      status: "MENUNGGU",
      items: [{ nama: "Proyektor Epson EB-X51", jumlah: 2 }, { nama: "Ruang Seminar B2", jumlah: 1 }],
    },
    {
      kode: "PJ-2026-0141", pemohonId: bagus.id, mulai: 0, selesai: 1, diajukan: -2,
      namaKegiatan: "Malam Keakraban Mahasiswa Baru",
      keperluan: "Acara malam keakraban di lapangan, butuh sound system dan mikrofon.",
      status: "MENUNGGU",
      items: [{ nama: "Sound System Portable", jumlah: 1 }, { nama: "Microphone Wireless", jumlah: 2 }],
    },
    {
      kode: "PJ-2026-0138", pemohonId: nadia.id, mulai: 7, selesai: 8, diajukan: -5,
      namaKegiatan: "Pelatihan Keamanan Pangan",
      keperluan: "Pelatihan sehari penuh untuk 200 peserta di aula, butuh kursi tambahan.",
      status: "DISETUJUI",
      catatanAdmin: "Disetujui. Ambil kunci di petugas gedung H-1 dan kembalikan kursi ke gudang Gedung C.",
      items: [{ nama: "Aula Serbaguna", jumlah: 1 }, { nama: "Kursi Lipat", jumlah: 80 }],
    },
    {
      kode: "PJ-2026-0135", pemohonId: nadia.id, mulai: -5, selesai: 1, diajukan: -8,
      namaKegiatan: "Dokumentasi Praktikum Lapangan",
      keperluan: "Dokumentasi foto dan video praktikum lapangan selama sepekan.",
      status: "DIPINJAM",
      catatanAdmin: "Disetujui, mohon jaga kelengkapan aksesori.",
      items: [{ nama: "Kamera Mirrorless A6400", jumlah: 1 }, { nama: "Tripod Video Fluid Head", jumlah: 1 }],
    },
    {
      kode: "PJ-2026-0131", pemohonId: nadia.id, mulai: -8, selesai: -7, diajukan: -11,
      namaKegiatan: "Workshop Desain Poster Ilmiah",
      keperluan: "Workshop desain poster untuk 35 mahasiswa di lab multimedia.",
      status: "DIKEMBALIKAN",
      catatanAdmin: "Disetujui.",
      items: [{ nama: "Lab Multimedia", jumlah: 1 }],
      retur: { offset: -7, kondisi: "BAIK", catatan: "Semua komputer sudah dimatikan, kursi ditata ulang." },
    },
    {
      kode: "PJ-2026-0118", pemohonId: fajar.id, mulai: -4, selesai: -3, diajukan: -7,
      namaKegiatan: "Bazar Kewirausahaan",
      keperluan: "Bazar produk mahasiswa, butuh meja dan kursi untuk stan.",
      status: "DIKEMBALIKAN",
      catatanAdmin: "Disetujui.",
      items: [{ nama: "Meja Lipat 120 cm", jumlah: 6 }, { nama: "Kursi Lipat", jumlah: 24 }],
      retur: { offset: -3, kondisi: "RUSAK_RINGAN", catatan: "Satu meja lipat engselnya agak kendur." },
    },
    {
      kode: "PJ-2026-0128", pemohonId: nadia.id, mulai: -12, selesai: -11, diajukan: -14,
      namaKegiatan: "Rapat Koordinasi Himpunan",
      keperluan: "Rapat koordinasi pengurus himpunan mahasiswa.",
      status: "SELESAI",
      catatanAdmin: "Selesai, alat lengkap.",
      items: [{ nama: "Proyektor Epson EB-X51", jumlah: 1 }],
      retur: { offset: -11, kondisi: "BAIK", catatan: "Alat lengkap dan berfungsi normal.", diverifikasi: true },
    },
    {
      kode: "PJ-2026-0120", pemohonId: sari.id, mulai: -16, selesai: -16, diajukan: -19,
      namaKegiatan: "Rapat Evaluasi Semester",
      keperluan: "Rapat evaluasi semester untuk dosen dan tenaga kependidikan.",
      status: "SELESAI",
      catatanAdmin: "Selesai tanpa catatan.",
      items: [{ nama: "Ruang Rapat Dekanat", jumlah: 1 }],
      retur: { offset: -16, kondisi: "BAIK", catatan: "Ruang bersih.", diverifikasi: true },
    },
    {
      kode: "PJ-2026-0126", pemohonId: dimas.id, mulai: -10, selesai: -9, diajukan: -15,
      namaKegiatan: "Rekaman Podcast Tugas Mata Kuliah",
      keperluan: "Rekaman podcast untuk tugas mata kuliah produksi siaran.",
      status: "DITOLAK",
      catatanAdmin: "Studio dipakai jadwal praktikum di tanggal tersebut. Silakan ajukan ulang untuk pekan depan.",
      items: [{ nama: "Studio Podcast", jumlah: 1 }],
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
        userId: nadia.id,
        judul: "Pengajuan PJ-2026-0138 disetujui",
        isi: "Pemakaian 20 Agu 2026 - 21 Agu 2026 disetujui. Ambil kunci Aula di petugas gedung H-1.",
        kunci: "review.disetujui",
        data: {
          kode: "PJ-2026-0138",
          mulai: "2026-08-20",
          selesai: "2026-08-21",
          catatan: "Ambil kunci Aula di petugas gedung H-1.",
        },
        tautan: "/pengajuan",
      },
      {
        userId: nadia.id,
        judul: "Pengembalian PJ-2026-0131 terkirim",
        isi: "Menunggu admin memeriksa kondisi fisiknya. Kamu akan dikabari begitu pengajuan ditutup.",
        kunci: "kembali.terkirim",
        data: { kode: "PJ-2026-0131" },
        tautan: "/pengajuan",
      },
      {
        userId: admin.id,
        judul: "Pengajuan baru menunggu review",
        isi: "PJ-2026-0142 dari Nadia Rahmawati (Teknologi Pangan) menunggu review.",
        kunci: "ajukan.adminBaru",
        data: { kode: "PJ-2026-0142", nama: "Nadia Rahmawati", unit: "Teknologi Pangan" },
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
  console.log("   • Peminjam → nadia@kampus.ac.id / peminjam1234\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
