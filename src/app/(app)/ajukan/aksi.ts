"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { wajibPeminjam } from "@/lib/auth";
import { teks } from "@/lib/preferensi-server";
import { bacaKeranjang, tulisKeranjang } from "@/lib/keranjang";
import { cekBentrok } from "@/lib/ketersediaan";
import { cekTutup, pesanTutup } from "@/lib/penutupan";
import { kodeBerikutnya } from "@/lib/pengajuan";
import { kabariAdmin, kirimNotifikasi } from "@/lib/notifikasi";
import { errorField, gagal, pengajuanSchema } from "@/lib/validasi";
import { dariISO, fmtRentang , keISO} from "@/lib/waktu";
import type { HasilAksi } from "@/lib/validasi";

export type StatusAjukan = HasilAksi<null> | null;

export async function aksiKirimPengajuan(
  _sebelum: StatusAjukan,
  data: FormData
): Promise<StatusAjukan> {
  const user = await wajibPeminjam();
  const t = await teks();

  // Item selalu diambil dari keranjang di server, tidak dari input form,
  // supaya tidak bisa disisipi aset lain lewat POST langsung.
  const keranjang = await bacaKeranjang();

  const hasil = pengajuanSchema.safeParse({
    namaKegiatan: data.get("namaKegiatan") || undefined,
    keperluan: data.get("keperluan"),
    kontakWhatsapp: data.get("kontakWhatsapp"),
    mulai: data.get("mulai"),
    selesai: data.get("selesai"),
    setuju: data.get("setuju") === "on",
    items: keranjang,
  });
  if (!hasil.success) {
    return gagal("Periksa lagi isian kamu.", errorField(hasil.error));
  }

  const mulai = dariISO(hasil.data.mulai);
  const selesai = dariISO(hasil.data.selesai);

  let kode: string;
  try {
    kode = await prisma.$transaction(async (tx) => {
      // Hari tutup diperiksa DI DALAM transaksi, sama seperti bentrok, dan
      // bukan cuma di form. Admin bisa menandai satu tanggal jadi tutup tepat
      // setelah halaman peminjam dirender, dan tanpa pemeriksaan di sini
      // pengajuannya tetap masuk.
      //
      // Diperiksa SEBELUM bentrok aset, karena tanggal tutup membatalkan
      // seluruh rentang. Melaporkan "proyektor tinggal 2" untuk tanggal yang
      // kampusnya tutup cuma menyuruh orang membetulkan hal yang salah.
      const tutup = await cekTutup(tx, mulai, selesai);
      if (tutup.length > 0) {
        throw new TutupError(tutup.map((x) => pesanTutup(x, t)));
      }

      // Cek ulang DI DALAM transaksi. Inilah yang mencegah dua orang
      // menyetujui ruang yang sama di detik yang sama. Cek di form saja
      // tidak cukup karena keadaan bisa berubah di antara keduanya.
      const bentrok = await cekBentrok(tx, hasil.data.items, mulai, selesai);
      if (bentrok.length > 0) {
        throw new BentrokError(bentrok.map((b) => b.pesan));
      }

      const aset = await tx.aset.findMany({
        where: { id: { in: hasil.data.items.map((i) => i.asetId) } },
        select: { id: true, nama: true },
      });
      const nama = new Map(aset.map((a) => [a.id, a.nama]));

      const kodeBaru = await kodeBerikutnya(tx);

      // Pengajuan yang baru dibuat langsung ditandai terlihat, karena
      // pembuatnya jelas sudah tahu isinya. Tanpa ini lencana akan
      // menyala tepat setelah orangnya sendiri mengirim pengajuan.
      await tx.pengajuan.create({
        data: {
          kode: kodeBaru,
          pemohonId: user.id,
          mulai,
          selesai,
          namaKegiatan: hasil.data.namaKegiatan,
          keperluan: hasil.data.keperluan,
          kontakWhatsapp: hasil.data.kontakWhatsapp,
          status: "MENUNGGU",
          dilihatPada: new Date(),
          items: {
            create: hasil.data.items.map((i) => ({
              asetId: i.asetId,
              jumlah: i.jumlah,
              namaAset: nama.get(i.asetId) ?? "Aset",
            })),
          },
          riwayatStatus: {
            create: {
              dari: null,
              ke: "MENUNGGU",
              olehId: user.id,
              catatan: "Pengajuan dibuat.",
            },
          },
        },
      });

      return kodeBaru;
    });
  } catch (e) {
    // Tanggalnya dilekatkan ke field "mulai" supaya alasannya muncul tepat di
    // bawah input tanggal, bukan cuma sebagai kalimat umum di kartu ringkasan.
    // Yang harus diperbaiki orangnya memang tanggal itu.
    if (e instanceof TutupError) {
      return gagal(t.jadwal.adaTutup, { mulai: e.pesan });
    }
    if (e instanceof BentrokError) {
      return gagal(
        "Ada jadwal yang bentrok. Perbaiki dulu sebelum mengirim.",
        { items: e.pesan }
      );
    }
    throw e;
  }

  // Notifikasi di luar transaksi: gagal kirim email tidak boleh membatalkan
  // pengajuan yang sudah tersimpan.
  await kirimNotifikasi({
    userId: user.id,
    judul: `Pengajuan ${kode} terkirim`,
    isi: `Pengajuan kamu untuk ${fmtRentang(mulai, selesai)} sudah masuk antrean admin.`,
    kunci: "ajukan.terkirim",
    // Tanggal disimpan mentah sebagai ISO, bukan hasil format, supaya
    // nama bulannya ikut bahasa pembacanya saat ditampilkan nanti.
    data: { kode, mulai: keISO(mulai), selesai: keISO(selesai) },
    tautan: "/pengajuan",
    email: true,
  });
  await kabariAdmin({
    judul: "Pengajuan baru menunggu review",
    isi: `${kode} dari ${user.nama} (${user.unit ?? "-"}) menunggu review.`,
    kunci: "ajukan.adminBaru",
    data: { kode, nama: user.nama, unit: user.unit ?? "-" },
    tautan: "/admin/review",
  });

  await tulisKeranjang([]);
  redirect(`/pengajuan?baru=${encodeURIComponent(kode)}`);
}

class BentrokError extends Error {
  pesan: string[];
  constructor(pesan: string[]) {
    super("bentrok");
    this.pesan = pesan;
  }
}

/**
 * Dipakai untuk keluar dari transaksi saat rentangnya menyentuh hari tutup.
 *
 * Dibedakan dari BentrokError karena artinya memang berbeda: bentrok berarti
 * asetnya sudah dipakai orang lain dan bisa diakali dengan mengurangi jumlah
 * atau mengganti aset, sedangkan tutup berarti tanggalnya yang tidak mungkin
 * dan satu satunya jalan keluar adalah mengubah tanggal.
 */
class TutupError extends Error {
  pesan: string[];
  constructor(pesan: string[]) {
    super("tutup");
    this.pesan = pesan;
  }
}
