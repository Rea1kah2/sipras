import { jalankanPengingat } from "@/lib/pengingat";

/**
 * Rute pengingat jatuh tempo, dipanggil terjadwal sekali sehari.
 *
 * Dijaga token rahasia, bukan sesi, karena yang memanggilnya penjadwal
 * (cron, Vercel Cron, atau launchd di laptop) yang tidak punya sesi login.
 * Tanpa penjaga ini siapa pun yang tahu alamatnya bisa membanjiri peminjam
 * dengan email.
 *
 * Aman dipanggil berkali kali: penjaga duplikatnya ada di batasan unik tabel
 * Pengingat, jadi panggilan kedua di hari yang sama tidak mengirim ulang
 * apa pun, hanya melaporkannya sebagai dilewati.
 *
 * Contoh pemanggilan:
 *   curl -H "Authorization: Bearer $PENGINGAT_SECRET" \
 *        http://localhost:3000/api/pengingat
 */
export async function GET(req: Request): Promise<Response> {
  const rahasia = process.env.PENGINGAT_SECRET;

  // Tanpa rahasia terpasang, rutenya dimatikan sama sekali. Lebih baik
  // fiturnya tidak jalan daripada terbuka untuk siapa saja.
  if (!rahasia) {
    return Response.json(
      { galat: "PENGINGAT_SECRET belum diisi, rute pengingat dimatikan." },
      { status: 503 }
    );
  }

  const dibawa = req.headers.get("authorization");
  if (dibawa !== `Bearer ${rahasia}`) {
    return Response.json({ galat: "Tidak berwenang." }, { status: 401 });
  }

  const hasil = await jalankanPengingat();
  return Response.json({ ok: true, ...hasil });
}
