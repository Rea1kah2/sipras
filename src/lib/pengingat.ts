import "server-only";
import { prisma } from "@/lib/prisma";
import { kirimNotifikasi } from "@/lib/notifikasi";
import { dariISO, fmtTanggal, hariIniISO, keISO, sisaHari } from "@/lib/waktu";
import { teksItem } from "@/lib/pengajuan";
import { tanggalItuTutup } from "@/lib/penutupan";
import type { JenisPengingat } from "@/generated/prisma/enums";

/**
 * Pengingat jatuh tempo.
 *
 * Menutup celah nyata: sebelumnya barang bisa lewat tenggat tanpa ada yang
 * mengingatkan siapa pun. Peminjam dikabari sehari sebelum dan tepat di hari
 * pengembalian, lalu sekali lagi saat benar benar terlambat. Admin ikut
 * dikabari hanya untuk yang terlambat, karena dua yang pertama masih urusan
 * peminjam dan belum perlu campur tangan petugas.
 *
 * TIDAK mengubah status pengajuan. "Terlambat" dihitung dari tanggal, bukan
 * disimpan sebagai status, mengikuti prinsip yang sama dengan ketersediaan:
 * apa yang bisa dihitung tidak perlu disimpan, supaya tidak bisa jadi tidak
 * sinkron dengan kenyataan.
 */

export type HasilPengingat = {
  sehariLagi: number;
  hariIni: number;
  terlambat: number;
  dilewati: number;
  /** Hari ini layanan tutup, jadi teguran terlambat ditahan dulu. */
  tutupHariIni: boolean;
};

const PILIH = {
  id: true,
  kode: true,
  selesai: true,
  pemohonId: true,
  items: { select: { namaAset: true, jumlah: true, aset: { select: { tipe: true } } } },
} as const;

export async function jalankanPengingat(): Promise<HasilPengingat> {
  const isoHariIni = hariIniISO();
  const hariIni = dariISO(isoHariIni);
  const besok = dariISO(keISO(new Date(hariIni.getTime() + 86_400_000)));

  const hasil: HasilPengingat = {
    sehariLagi: 0,
    hariIni: 0,
    terlambat: 0,
    dilewati: 0,
    tutupHariIni: await tanggalItuTutup(prisma, isoHariIni),
  };

  // Ketiganya hanya berlaku untuk yang sedang dipinjam. Yang sudah
  // dikembalikan atau sudah selesai jelas tidak perlu diingatkan.
  const [sehariLagi, jatuhHariIni, terlambat] = await Promise.all([
    prisma.pengajuan.findMany({
      where: { status: "DIPINJAM", selesai: besok },
      select: PILIH,
    }),
    prisma.pengajuan.findMany({
      where: { status: "DIPINJAM", selesai: hariIni },
      select: PILIH,
    }),
    prisma.pengajuan.findMany({
      where: { status: "DIPINJAM", selesai: { lt: hariIni } },
      select: PILIH,
    }),
  ]);

  for (const p of sehariLagi) {
    const kirim = await sekaliSaja(p.id, "SEHARI_LAGI");
    if (!kirim) {
      hasil.dilewati++;
      continue;
    }
    await kirimNotifikasi({
      userId: p.pemohonId,
      judul: `Besok waktunya mengembalikan ${p.kode}`,
      isi: `${teksItem(p.items)} dijadwalkan kembali besok, ${fmtTanggal(p.selesai)}. Ajukan pengembalian dari halaman pengajuan kamu supaya tidak terlambat.`,
      kunci: "ingat.sehariLagi",
      data: { kode: p.kode, item: teksItem(p.items), selesai: keISO(p.selesai) },
      tautan: "/pengajuan",
      email: true,
    });
    hasil.sehariLagi++;
  }

  for (const p of jatuhHariIni) {
    const kirim = await sekaliSaja(p.id, "HARI_INI");
    if (!kirim) {
      hasil.dilewati++;
      continue;
    }
    await kirimNotifikasi({
      userId: p.pemohonId,
      judul: `Hari ini batas pengembalian ${p.kode}`,
      isi: `${teksItem(p.items)} dijadwalkan kembali hari ini. Kalau sudah dikembalikan, ajukan konfirmasi pengembalian supaya petugas bisa memverifikasinya.`,
      kunci: "ingat.hariIni",
      data: { kode: p.kode, item: teksItem(p.items) },
      tautan: "/pengajuan",
      email: true,
    });
    hasil.hariIni++;
  }

  /**
   * Teguran terlambat DITAHAN saat layanan tutup.
   *
   * Menyebut orang terlambat di hari kampus tutup itu tidak benar: mereka
   * memang tidak bisa datang mengembalikan. Yang ditahan hanya teguran
   * terlambat. Pengingat sehari sebelum dan pengingat di hari jatuh tempo
   * tetap dikirim, karena keduanya memberi tahu sesuatu yang berguna
   * dipersiapkan lebih awal, bukan menuduh.
   *
   * Penahanan ini AMAN karena baris Pengingat tidak ditulis saat dilewati,
   * jadi tegurannya tetap keluar di hari buka berikutnya. Kalau barisnya
   * ditulis lebih dulu lalu pengirimannya dilewati, tegurannya akan hilang
   * selamanya, dan batasan unik yang tadinya penjaga duplikat justru berubah
   * jadi penyebab pesan yang tidak pernah sampai.
   */
  const tahanTeguran = hasil.tutupHariIni;
  if (tahanTeguran) {
    hasil.dilewati += terlambat.length;
    return hasil;
  }

  // Untuk yang terlambat, admin ikut dikabari karena di titik ini barangnya
  // sudah menahan ketersediaan orang lain dan perlu ditagih.
  const admin =
    terlambat.length > 0
      ? await prisma.user.findMany({
          where: { peran: "ADMIN", aktif: true },
          select: { id: true },
        })
      : [];

  for (const p of terlambat) {
    const kirim = await sekaliSaja(p.id, "TERLAMBAT");
    if (!kirim) {
      hasil.dilewati++;
      continue;
    }
    const lewat = Math.abs(sisaHari(p.selesai));

    await kirimNotifikasi({
      userId: p.pemohonId,
      judul: `${p.kode} sudah lewat batas pengembalian`,
      isi: `${teksItem(p.items)} seharusnya kembali ${fmtTanggal(p.selesai)}, terlambat ${lewat} hari. Segera kembalikan supaya bisa dipakai orang lain.`,
      kunci: "ingat.terlambat",
      data: { kode: p.kode, item: teksItem(p.items), selesai: keISO(p.selesai), n: lewat },
      tautan: "/pengajuan",
      email: true,
    });

    for (const a of admin) {
      await kirimNotifikasi({
        userId: a.id,
        judul: `${p.kode} terlambat ${lewat} hari`,
        isi: `${teksItem(p.items)} belum dikembalikan, jatuh tempo ${fmtTanggal(p.selesai)}.`,
        kunci: "ingat.adminTerlambat",
        data: { kode: p.kode, item: teksItem(p.items), selesai: keISO(p.selesai), n: lewat },
        tautan: "/admin/riwayat",
        email: false,
      });
    }
    hasil.terlambat++;
  }

  return hasil;
}

/**
 * Tandai satu pengingat sudah dikirim. Mengembalikan false kalau sudah
 * pernah, sehingga pemanggil melewatinya.
 *
 * Penjaganya batasan unik di basis data, bukan pengecekan lebih dulu. Jadi
 * dua panggilan bersamaan tidak bisa dua duanya lolos: yang kedua ditolak
 * saat menulis, bukan saat mengecek.
 */
async function sekaliSaja(
  pengajuanId: string,
  jenis: JenisPengingat
): Promise<boolean> {
  try {
    await prisma.pengingat.create({ data: { pengajuanId, jenis } });
    return true;
  } catch {
    return false;
  }
}
