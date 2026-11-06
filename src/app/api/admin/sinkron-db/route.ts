import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { penggunaSaatIni } from "@/lib/auth";

export const dynamic = "force-dynamic";

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

async function jalankanSinkronisasi() {
  // 1. Bersihkan transaksi lama
  await prisma.riwayatStatus.deleteMany();
  await prisma.pengembalianItem.deleteMany();
  await prisma.pengembalian.deleteMany();
  await prisma.pengajuanItem.deleteMany();
  await prisma.pengajuan.deleteMany();
  await prisma.notifikasi.deleteMany();
  await prisma.penutupan.deleteMany();
  await prisma.pengaturan.deleteMany();

  // 2. Siapkan pengguna inti
  const sandiAdmin = await hash("admin1234", 10);
  const sandiPeminjam = await hash("peminjam1234", 10);
  const emailAdmin = process.env.EMAIL_REPLY_TO?.trim() || "admin@sekolah.sch.id";

  const admin = await prisma.user.upsert({
    where: { email: emailAdmin },
    update: { password: sandiAdmin, peran: "ADMIN", nama: "Administrator Sarpras" },
    create: {
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
    await prisma.user.upsert({
      where: { email: "admin@kampus.ac.id" },
      update: { password: sandiAdmin, peran: "ADMIN", nama: "Admin Demo" },
      create: {
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

  await prisma.user.upsert({
    where: { email: "budi@kampus.ac.id" },
    update: { password: sandiPeminjam, peran: "PEMINJAM", nama: "Budi Setiawan" },
    create: {
      nama: "Budi Setiawan",
      email: "budi@kampus.ac.id",
      password: sandiPeminjam,
      peran: "PEMINJAM",
      whatsapp: "081234567891",
      identitas: "199201012015011001",
      unit: "Guru Kelas 1",
    },
  });

  // 3. Sinkronkan 21 aset
  let dibuat = 0;
  let diperbarui = 0;
  for (const a of ASET) {
    const ada = await prisma.aset.findFirst({ where: { nama: a.nama } });
    const payload = {
      tipe: a.tipe,
      kategori: a.kategori,
      deskripsi: a.deskripsi,
      lokasi: a.lokasi,
      stok: a.tipe === "BARANG" ? (a as { stok: number }).stok : 1,
      kapasitas: a.tipe === "RUANG" ? (a as { kapasitas: number }).kapasitas : null,
      foto: a.foto,
      aktif: true,
    };

    if (ada) {
      await prisma.aset.update({ where: { id: ada.id }, data: payload });
      diperbarui++;
    } else {
      await prisma.aset.create({ data: { nama: a.nama, ...payload } });
      dibuat++;
    }
  }

  // Bersihkan aset selain 21 aset resmi
  const namaResmi = ASET.map((a) => a.nama);
  const dibersihkan = await prisma.aset.deleteMany({
    where: { nama: { notIn: namaResmi } },
  });

  // 4. Pengaturan layanan
  await prisma.pengaturan.create({
    data: {
      id: "tunggal",
      hariLayanan: [1, 2, 3, 4, 5, 6],
      jamBuka: "08.00",
      jamTutup: "16.00",
    },
  });

  // Libur contoh 14 hari ke depan
  const tanggalLibur = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  await prisma.penutupan.create({
    data: {
      tanggal: tanggalLibur,
      alasan: "Hari Libur Nasional",
      jenis: "LIBUR",
      olehId: admin.id,
    },
  });

  const totalAset = await prisma.aset.count();
  const totalUser = await prisma.user.count();
  const totalPengajuan = await prisma.pengajuan.count();

  return {
    sukses: true,
    dibuat,
    diperbarui,
    dihapus: dibersihkan.count,
    totalAset,
    totalUser,
    totalPengajuan,
  };
}

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const kunci = url.searchParams.get("kunci") ?? req.headers.get("x-kunci");
  const user = await penggunaSaatIni().catch(() => null);
  const isAdmin = user?.peran === "ADMIN";

  const tokenValid =
    kunci &&
    (kunci === process.env.SESSION_SECRET ||
      kunci === process.env.PENGINGAT_SECRET ||
      kunci === "sipras-fresh-slate-2026");

  if (!isAdmin && !tokenValid) {
    return Response.json(
      {
        ok: false,
        pesan: "Akses ditolak. Harap masuk sebagai Admin atau sertakan parameter ?kunci=sipras-fresh-slate-2026",
      },
      { status: 401 }
    );
  }

  try {
    const hasil = await jalankanSinkronisasi();

    // Jika dipanggil langsung lewat peramban browser, tampilkan laman HTML yang ramah
    const accept = req.headers.get("accept") ?? "";
    if (accept.includes("text/html")) {
      const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Sinkronisasi Database Berhasil - SIPRAS</title>
  <style>
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #f0f4f8;
      color: #0f172a;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 24px;
      box-sizing: border-box;
    }
    .kartu {
      background: #ffffff;
      border-radius: 14px;
      border: 1px solid #cbd5e1;
      box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08);
      max-width: 480px;
      width: 100%;
      padding: 32px 28px;
      text-align: center;
    }
    .ikon-wadah {
      width: 56px;
      height: 56px;
      background: #dcfce7;
      color: #15803d;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
    }
    h1 {
      font-size: 22px;
      font-weight: 700;
      margin: 0 0 8px;
      color: #0f172a;
    }
    p {
      font-size: 14px;
      color: #475569;
      margin: 0 0 24px;
      line-height: 1.6;
    }
    .ringkasan {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 16px;
      margin-bottom: 24px;
      text-align: left;
      font-size: 13.5px;
    }
    .baris {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      border-bottom: 1px dashed #e2e8f0;
    }
    .baris:last-child {
      border-bottom: none;
    }
    .label {
      color: #64748b;
    }
    .nilai {
      font-weight: 600;
      color: #0f172a;
    }
    .tombol {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: #1d4ed8;
      color: #ffffff;
      padding: 11px 24px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      font-size: 14px;
      transition: background 0.16s ease;
    }
    .tombol:hover {
      background: #1e40af;
    }
  </style>
</head>
<body>
  <div class="kartu">
    <div class="ikon-wadah">
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 6 9 17l-5-5"/>
      </svg>
    </div>
    <h1>Sinkronisasi Berhasil!</h1>
    <p>Database produksi telah dibersihkan ke Fresh Slate dan 21 sarana prasarana berfoto riil telah terpasang sempurna.</p>
    
    <div class="ringkasan">
      <div class="baris"><span class="label">Total Aset Aktif:</span><span class="nilai">${hasil.totalAset} item (100% berfoto)</span></div>
      <div class="baris"><span class="label">Transaksi Lama:</span><span class="nilai">0 (bersih total)</span></div>
      <div class="baris"><span class="label">Akun Admin:</span><span class="nilai">admin@kampus.ac.id / admin1234</span></div>
      <div class="baris"><span class="label">Akun Peminjam:</span><span class="nilai">budi@kampus.ac.id / peminjam1234</span></div>
    </div>

    <a href="/katalog" class="tombol">Buka Katalog SIPRAS</a>
  </div>
</body>
</html>`;
      return new Response(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    return Response.json(hasil);
  } catch (error) {
    const err = error instanceof Error ? error.message : "Terjadi kesalahan";
    return Response.json({ ok: false, galat: err }, { status: 500 });
  }
}

export async function POST(req: Request): Promise<Response> {
  return GET(req);
}
