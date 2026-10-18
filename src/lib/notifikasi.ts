import "server-only";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import type { KlienDB } from "@/lib/ketersediaan";
import { kamus } from "@/lib/kamus";
import { normalBahasa } from "@/lib/preferensi";
import { tampilkanNotif, type DataPesan } from "@/lib/pesan-notifikasi";

/**
 * Lapisan notifikasi. Aturannya satu: SELALU tulis ke tabel Notifikasi lebih
 * dulu, baru coba kirim email. Dengan begitu notifikasi in-app berfungsi
 * penuh sejak hari pertama, dan kegagalan kirim email tidak boleh
 * menggagalkan aksi admin, cukup dicatat statusnya.
 *
 * WhatsApp sengaja TIDAK dipakai lewat API (biaya). Nomor petugas hanya
 * ditampilkan sebagai tautan wa.me di UI.
 */

export type IsiNotifikasi = {
  userId: string;
  /**
   * Kalimat cadangan dalam bahasa Indonesia, sekaligus yang tersimpan
   * apa adanya untuk baris email. Tetap wajib walau sudah ada kunci,
   * karena baris tanpa kunci harus tetap bisa ditampilkan.
   */
  judul: string;
  isi: string;
  /** Kunci kamus, mis. "review.disetujui". Dipasangkan dengan data. */
  kunci?: string;
  /** Nilai MENTAH untuk penanda di kamus. Tanggal berupa ISO, bukan hasil format. */
  data?: DataPesan;
  tautan?: string;
  /** Kirim juga sebagai email, bukan hanya lonceng in-app. */
  email?: boolean;
};

let resendKlien: Resend | null = null;
function klienResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  resendKlien ??= new Resend(key);
  return resendKlien;
}

/**
 * Hasil satu percobaan kirim.
 *
 * Sengaja tiga keadaan, bukan dua. Dulu hanya ada berhasil dan gagal,
 * sehingga mode konsol yang sama sekali tidak mengirim apa apa ikut
 * tercatat sebagai TERKIRIM. Bagi admin yang menelusuri keluhan "saya
 * tidak dapat kabar", laporan keberhasilan palsu lebih merugikan daripada
 * tidak ada laporan sama sekali.
 */
type HasilKirim = {
  status: "TERKIRIM" | "GAGAL" | "TERTUNDA";
  catatan: string | null;
};

/**
 * Alamat tujuan sebenarnya.
 *
 * Resend tanpa domain terverifikasi hanya mau mengirim ke alamat pemilik
 * akun, sedangkan peminjam contoh memakai alamat kampus yang pasti ditolak.
 * Kalau EMAIL_UJI_KE diisi, semua email dialihkan ke sana dan subjeknya
 * diberi awalan penerima aslinya, supaya demo tetap memperlihatkan email
 * sungguhan tanpa menyembunyikan email itu sebenarnya untuk siapa.
 *
 * Begitu ada domain terverifikasi, cukup kosongkan variabelnya.
 */
function tujuan(aslinya: string): { ke: string; awalan: string; uji: boolean } {
  const uji = (process.env.EMAIL_UJI_KE ?? "").trim();
  if (!uji || uji === aslinya) return { ke: aslinya, awalan: "", uji: false };
  return { ke: uji, awalan: `[uji, untuk ${aslinya}] `, uji: true };
}

export async function kirimNotifikasi(
  isi: IsiNotifikasi,
  db: KlienDB = prisma
): Promise<void> {
  // 1. In-app dulu, ini yang tidak boleh gagal.
  await db.notifikasi.create({
    data: {
      userId: isi.userId,
      jenis: "IN_APP",
      judul: isi.judul,
      isi: isi.isi,
      kunci: isi.kunci,
      data: isi.data ?? undefined,
      tautan: isi.tautan,
      statusKirim: "TERKIRIM",
    },
  });

  if (!isi.email) return;

  // 2. Email, best effort. Dicatat hasilnya, tidak pernah dilempar ke UI.
  const user = await db.user.findUnique({
    where: { id: isi.userId },
    select: { email: true, nama: true, bahasa: true },
  });
  if (!user) return;

  // Email dirender dalam bahasa PENERIMANYA, bukan bahasa orang yang
  // memicu aksinya. Inilah alasan bahasa dipindah ke akun: cookie yang
  // tersedia di sini milik peramban pemicunya, bukan milik penerimanya.
  const t = kamus(normalBahasa(user.bahasa));
  const pesan = tampilkanNotif(
    { judul: isi.judul, isi: isi.isi, kunci: isi.kunci ?? null, data: isi.data },
    t
  );

  const hasil = await kirimEmail(user.email, user.nama, {
    ...isi,
    judul: pesan.judul,
    isi: pesan.isi,
  });

  await db.notifikasi.create({
    data: {
      userId: isi.userId,
      jenis: "EMAIL",
      // Baris email menyimpan kalimat yang BENAR BENAR dikirim, tanpa
      // kunci. Merender ulang baris ini nanti akan menampilkan kalimat
      // yang berbeda dari yang diterima orangnya, dan itu menyesatkan.
      judul: pesan.judul,
      isi: pesan.isi,
      tautan: isi.tautan,
      statusKirim: hasil.status,
      errorKirim: hasil.catatan,
      // Baris email tidak perlu muncul di lonceng, sudah diwakili baris IN_APP.
      dibaca: true,
    },
  });
}

/** Kirim satu email. Tidak pernah melempar, hasilnya selalu dilaporkan apa adanya. */
async function kirimEmail(
  emailAsli: string,
  nama: string,
  isi: IsiNotifikasi
): Promise<HasilKirim> {
  const resend = klienResend();

  // Tanpa kunci API tidak ada email yang keluar. Dicatat TERTUNDA, bukan
  // TERKIRIM, karena memang belum terkirim ke mana pun.
  if (!resend) {
    console.info(
      `\n[SIPRAS mode konsol] ke ${emailAsli}\n   ${isi.judul}\n   ${isi.isi}\n`
    );
    return {
      status: "TERTUNDA",
      catatan:
        "Mode konsol: RESEND_API_KEY belum diisi, jadi tidak ada email yang benar benar dikirim. Isinya tercetak di terminal server.",
    };
  }

  const { ke, awalan, uji } = tujuan(emailAsli);

  try {
    const { error } = await resend.emails.send({
      from: process.env.EMAIL_FROM ?? "SIPRAS <onboarding@resend.dev>",
      to: ke,
      replyTo: process.env.EMAIL_REPLY_TO,
      subject: awalan + isi.judul,
      html: templateEmail(nama, isi),
    });
    if (error) throw new Error(error.message);

    return {
      status: "TERKIRIM",
      // Kalau dialihkan, jejak alamat aslinya ikut disimpan supaya tidak
      // hilang dan admin tahu email itu sebenarnya ditujukan ke siapa.
      catatan: uji ? `Mode uji: dialihkan ke ${ke}, tujuan asli ${emailAsli}.` : null,
    };
  } catch (e) {
    const pesan = e instanceof Error ? e.message : String(e);
    console.error("[SIPRAS] gagal kirim email:", pesan);
    return { status: "GAGAL", catatan: pesan };
  }
}

function templateEmail(nama: string, isi: IsiNotifikasi): string {
  const wa = process.env.NEXT_PUBLIC_WA_PETUGAS ?? "";
  const waBersih = wa.replace(/\D/g, "").replace(/^0/, "62");
  const asal = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const tautanPenuh = isi.tautan && asal ? `${asal}${isi.tautan}` : "";

  // Hex ditulis harfiah, BUKAN var(--color-accent). Klien email tidak
  // mendukung CSS custom property, dan token yang tidak terbaca membuat
  // teks jatuh ke warna bawaan yang bisa saja tidak terbaca di atas
  // latarnya. Pemetaan ke token ditulis di sini supaya asalnya tetap jelas
  // kalau paletnya berubah lagi.
  //
  // Karena email tidak dapat membaca CSS custom property, nilai hex ini harus
  // mengikuti token Coastal Glass setiap kali palet aplikasi berubah.
  const C = {
    latar: "#eef4f8", // --color-bg
    kartu: "#dce8f2", // --color-surface
    tinta: "#142338", // --color-text
    redup: "#425a70", // --color-neutral-700
    samar: "#4d667d", // --color-neutral-600
    garis: "#c1d2e0", // --color-divider
    aksen: "#3157d5", // --color-accent
    aksenTua: "#2546bb", // --color-accent-800
  };

  const tombol = tautanPenuh
    ? `
      <tr><td style="padding:4px 0 20px">
        <a href="${lolos(tautanPenuh)}"
           style="display:inline-block;background:${C.aksen};color:#ffffff;
                  text-decoration:none;font-size:14px;font-weight:600;
                  padding:11px 22px;border-radius:999px">Buka di SIPRAS</a>
      </td></tr>`
    : "";

  return `
<div style="margin:0;padding:24px 12px;background:${C.latar};
            font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0"
         style="max-width:520px;margin:0 auto;width:100%;background:${C.kartu};
                border-radius:20px;border:1px solid ${C.garis}">
    <tr><td style="padding:28px 28px 0">
      <div style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;
                  color:${C.aksen};font-weight:700">SIPRAS</div>
      <h1 style="font-size:21px;line-height:1.25;margin:10px 0 0;color:${C.tinta}">
        ${lolos(isi.judul)}
      </h1>
    </td></tr>

    <tr><td style="padding:14px 28px 18px">
      <p style="font-size:14px;line-height:1.65;color:${C.redup};margin:0">
        Halo ${lolos(nama)},<br>${lolos(isi.isi)}
      </p>
    </td></tr>

    ${tombol ? `<tr><td style="padding:0 28px">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0">${tombol}</table>
    </td></tr>` : ""}

    <tr><td style="padding:0 28px 26px">
      <div style="border-top:1px solid ${C.garis};padding-top:15px;
                  font-size:12.5px;line-height:1.6;color:${C.samar}">
        Butuh bantuan? Hubungi petugas Sarpras lewat
        <a href="https://wa.me/${waBersih}" style="color:${C.aksenTua};font-weight:600">
          WhatsApp ${lolos(wa)}</a>.
        <br>Email ini dikirim otomatis, tidak perlu dibalas.
      </div>
    </td></tr>
  </table>
</div>`.trim();
}

function lolos(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Notifikasi ke semua admin, dipakai saat ada pengajuan baru masuk. */
export async function kabariAdmin(
  isi: Omit<IsiNotifikasi, "userId">,
  db: KlienDB = prisma
): Promise<void> {
  const admins = await db.user.findMany({
    where: { peran: "ADMIN", aktif: true },
    select: { id: true },
  });
  for (const a of admins) {
    await kirimNotifikasi({ ...isi, userId: a.id }, db);
  }
}
