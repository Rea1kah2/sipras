import { prisma } from "@/lib/prisma";
import { dariISO, keISO } from "@/lib/waktu";
import type { JenisPenutupan } from "@/generated/prisma/enums";
import type { KlienDB } from "@/lib/ketersediaan";

/**
 * Hari layanan dan penutupan.
 *
 * SATU SATUNYA tempat yang memutuskan sebuah tanggal tutup atau tidak.
 * Aturannya ada dua sumber, dan keduanya wajib dibaca bersama:
 *
 *   1. hariLayanan  hari dalam pekan yang melayani, berulang tiap pekan
 *   2. Penutupan    tanggal tertentu yang ditutup, misalnya libur nasional
 *
 * Kalau salah satu pemakai memeriksa hanya satu sumber, ia akan menampilkan
 * slot kosong yang ternyata ditolak saat pengajuan dikirim. Itu jenis bug
 * yang paling merusak kepercayaan, dan alasannya sama dengan mengapa
 * lib/kalender.ts sengaja meminjam definisi bentrok dari lib/ketersediaan.ts
 * alih alih menulis definisinya sendiri.
 *
 * Karena itu SEMUA pemakai, yaitu form pengajuan, aksi simpan, kalender
 * ruang, panel review, dan pengingat, memanggil fungsi di berkas ini.
 */

/** Alasan sebuah tanggal tutup. */
export type Tutup = {
  tanggal: string;
  alasan: string;
  /** null berarti tutup karena hari pekan, bukan karena tanggal khusus. */
  jenis: JenisPenutupan | null;
};

export type Pengaturan = {
  hariLayanan: number[];
  jamBuka: string;
  jamTutup: string;
};

export const PENGATURAN_BAWAAN: Pengaturan = {
  // getUTCDay: 0 Minggu sampai 6 Sabtu. Bawaannya Senin sampai Sabtu, jadi
  // Minggu tutup. Ini cuma titik awal, admin bebas mengubahnya.
  hariLayanan: [1, 2, 3, 4, 5, 6],
  jamBuka: "08.00",
  jamTutup: "16.00",
};

/**
 * Pengaturan layanan, dengan cadangan kalau barisnya belum ada.
 *
 * Sengaja TIDAK membuat baris saat dibaca. Pembacaan terjadi di halaman yang
 * dirender, termasuk untuk peminjam yang tidak berhak mengubah apa pun, dan
 * membuat baris sebagai efek samping pembacaan berarti request GET biasa bisa
 * menulis ke basis data. Barisnya dibuat saat admin menyimpan, lewat upsert.
 */
export async function ambilPengaturan(db: KlienDB = prisma): Promise<Pengaturan> {
  const baris = await db.pengaturan.findUnique({ where: { id: "tunggal" } });
  if (!baris) return PENGATURAN_BAWAAN;
  return {
    // Daftar kosong akan menutup seluruh pekan dan membuat sistem tidak bisa
    // dipakai sama sekali. Aksi penyimpanan sudah menolaknya, tapi baris lama
    // atau perubahan langsung di basis data bisa menyisakan keadaan itu, jadi
    // pembacaan pun tidak mempercayainya begitu saja.
    hariLayanan:
      baris.hariLayanan.length > 0 ? baris.hariLayanan : PENGATURAN_BAWAAN.hariLayanan,
    jamBuka: baris.jamBuka,
    jamTutup: baris.jamTutup,
  };
}

/**
 * Semua tanggal tutup di dalam satu rentang, tergabung dari kedua sumber.
 *
 * Rentangnya inklusif di kedua ujung, sama seperti definisi pemakaian aset di
 * seluruh sistem, supaya tidak ada satu pun tempat yang memakai konvensi
 * berbeda soal ujung rentang.
 */
export async function tanggalTutup(
  db: KlienDB,
  mulai: Date,
  selesai: Date
): Promise<Map<string, Tutup>> {
  const hasil = new Map<string, Tutup>();
  if (mulai.getTime() > selesai.getTime()) return hasil;

  const { hariLayanan } = await ambilPengaturan(db);
  const melayani = new Set(hariLayanan);

  // Sumber 1: hari pekan yang tidak melayani.
  for (let t = mulai.getTime(); t <= selesai.getTime(); t += 86_400_000) {
    const d = new Date(t);
    if (!melayani.has(d.getUTCDay())) {
      hasil.set(keISO(d), { tanggal: keISO(d), alasan: "", jenis: null });
    }
  }

  // Sumber 2: tanggal khusus. Ditulis SETELAH sumber pertama supaya alasan
  // yang ditulis admin menimpa "tutup karena hari pekan" yang tanpa alasan.
  // Kalau urutannya dibalik, libur nasional yang jatuh di hari Minggu akan
  // kehilangan keterangannya, padahal keterangan itulah yang dicari orang.
  const khusus = await db.penutupan.findMany({
    where: { tanggal: { gte: mulai, lte: selesai } },
    select: { tanggal: true, alasan: true, jenis: true },
  });
  for (const p of khusus) {
    const iso = keISO(p.tanggal);
    hasil.set(iso, { tanggal: iso, alasan: p.alasan, jenis: p.jenis });
  }

  return hasil;
}

/**
 * Tanggal tutup yang jatuh di dalam rentang pengajuan, urut naik.
 *
 * Inilah yang dipakai untuk menolak: kalau hasilnya tidak kosong, rentang itu
 * menyentuh hari tutup. Sengaja mengembalikan SEMUA tanggalnya, bukan sekadar
 * benar atau salah, supaya pesannya bisa menyebut tanggal mana yang jadi
 * masalah. Orang yang cuma diberi tahu "ada tanggal yang tutup" harus menebak
 * sendiri, dan menebak di form tanggal berarti mencoba coba.
 */
export async function cekTutup(
  db: KlienDB,
  mulai: Date,
  selesai: Date
): Promise<Tutup[]> {
  const peta = await tanggalTutup(db, mulai, selesai);
  return [...peta.values()].sort((a, b) => a.tanggal.localeCompare(b.tanggal));
}

/** Apakah satu tanggal tutup. Dipakai pengingat, yang cuma menanyakan hari ini. */
export async function tanggalItuTutup(db: KlienDB, iso: string): Promise<boolean> {
  const d = dariISO(iso);
  const peta = await tanggalTutup(db, d, d);
  return peta.has(iso);
}

/**
 * Jendela hari buka berurutan pertama, mulai dari tanggal acuan.
 *
 * Dipakai tombol rentang cepat di form pengajuan. Tanpa ini tombol "besok"
 * bisa mendarat tepat di hari Minggu yang tutup, dan orangnya langsung
 * ditolak oleh tombol yang kita sendiri tawarkan. Tombol pintas yang
 * menyarankan tanggal mustahil lebih buruk daripada tidak ada tombol.
 *
 * Mengembalikan null kalau tidak ada jendela sepanjang itu di dalam cakrawala
 * pencarian. Itu keadaan yang nyata, bukan kemustahilan: kalau admin cuma
 * membuka hari Senin, maka dua hari buka berurutan memang tidak akan pernah
 * ada, dan pemanggil wajib menyembunyikan tombolnya alih alih menawarkan
 * rentang yang pasti ditolak.
 */
export async function jendelaBuka(
  db: KlienDB,
  mulaiDariISO: string,
  panjang: number,
  // Sekitar tiga bulan. Cukup jauh untuk melewati libur panjang, tapi tetap
  // satu kueri kecil dan tidak pernah jadi lingkaran tak berujung.
  cakrawala = 100
): Promise<{ mulai: string; selesai: string } | null> {
  if (panjang < 1) return null;

  const awal = dariISO(mulaiDariISO);
  const akhir = new Date(awal.getTime() + cakrawala * 86_400_000);
  const tutup = await tanggalTutup(db, awal, akhir);

  let berurutan = 0;
  for (let i = 0; i <= cakrawala; i++) {
    const iso = keISO(new Date(awal.getTime() + i * 86_400_000));
    if (tutup.has(iso)) {
      berurutan = 0;
      continue;
    }
    berurutan++;
    if (berurutan === panjang) {
      // Hari ke-i adalah hari TERAKHIR jendelanya, jadi awalnya dihitung
      // balik. Mengembalikan hari pertama yang ditemukan akan salah begitu
      // ada hari tutup di tengah rentang.
      const mulai = keISO(new Date(awal.getTime() + (i - panjang + 1) * 86_400_000));
      return { mulai, selesai: iso };
    }
  }
  return null;
}

/**
 * Teks untuk merakit pesan penolakan.
 *
 * Bentuknya struktural, bukan mengimpor Kamus, mengikuti pola yang sudah
 * dipakai TeksKetersediaan di lib/ketersediaan.ts. Alasannya sama: berkas ini
 * pustaka murni yang juga dipanggil dari aksi server dan skrip uji, dan
 * mengimpor kamus akan menyeret seluruhnya sekaligus membuat lingkaran impor.
 * Karena bentuknya struktural, pemanggil cukup mengoper kamusnya apa adanya.
 */
export type TeksTutup = {
  bulanPendek: string[];
  hariPanjang: string[];
  jadwal: { tutupKarenaHari: string; tutupKarenaAlasan: string };
};

const TEKS_BAWAAN: TeksTutup = {
  bulanPendek: ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"],
  hariPanjang: ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"],
  jadwal: {
    tutupKarenaHari: "{tanggal} tutup, hari {hari} tidak melayani.",
    tutupKarenaAlasan: "{tanggal} tutup: {alasan}",
  },
};

/**
 * Satu kalimat yang menjelaskan mengapa tanggal itu tutup.
 *
 * Alasan yang ditulis admin sengaja TIDAK diterjemahkan, dan ditampilkan apa
 * adanya. Menerjemahkan teks bebas berarti mengarang, dan "Libur Natal" yang
 * dikarang jadi kalimat lain justru menyesatkan. Yang diterjemahkan cuma
 * rangka kalimatnya dan nama hari serta bulannya.
 */
export function pesanTutup(t: Tutup, tt: TeksTutup = TEKS_BAWAAN): string {
  const [y, b, h] = t.tanggal.split("-").map(Number);
  const tanggal = `${h} ${tt.bulanPendek[b - 1]} ${y}`;

  if (t.alasan.trim()) {
    return tt.jadwal.tutupKarenaAlasan
      .replace("{tanggal}", tanggal)
      .replace("{alasan}", t.alasan.trim());
  }
  const hari = tt.hariPanjang[dariISO(t.tanggal).getUTCDay()];
  return tt.jadwal.tutupKarenaHari
    .replace("{tanggal}", tanggal)
    .replace("{hari}", hari);
}
