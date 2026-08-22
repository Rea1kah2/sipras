import type { NamaIkon } from "@/lib/navigasi";

/**
 * Ikon menu, dipakai bersama oleh sidebar (termasuk saat menyusut jadi rel)
 * dan navigasi bawah di HP. Sebelumnya navigasi bawah cuma memakai titik
 * kecil yang tidak menjelaskan apa apa.
 *
 * Digambar sebagai stroke dengan `currentColor`, jadi warnanya otomatis
 * mengikuti keadaan aktif dan hover tanpa perlu diatur terpisah.
 */

const GAMBAR: Record<NamaIkon, React.ReactNode> = {
  dasbor: (
    <>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </>
  ),
  katalog: (
    <>
      <path d="M12 3 21 7.5v9L12 21 3 16.5v-9z" />
      <path d="M3 7.5 12 12l9-4.5" />
      <path d="M12 12v9" />
    </>
  ),
  pengajuan: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6" />
      <path d="M9 17h4" />
    </>
  ),
  ajukan: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8" />
      <path d="M8 12h8" />
    </>
  ),
  review: (
    <>
      <path d="M3 12h4l2 4 4-10 2 6h6" />
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
    </>
  ),
  aset: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M3 11h18" />
      <path d="M8 7V4h8v3" />
    </>
  ),
  verifikasi: (
    <>
      <path d="M9 4h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1z" />
      <path d="M16 5h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2" />
      <path d="m9 13 2 2 4-4" />
    </>
  ),
  riwayat: (
    <>
      <path d="M3 20V10" />
      <path d="M9 20V4" />
      <path d="M15 20v-7" />
      <path d="M21 20V8" />
    </>
  ),
  kalender: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <path d="M3 10h18" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
      <path d="M8 14h3" />
      <path d="M14 14h2" />
      <path d="M8 18h6" />
    </>
  ),
  /* Kotak berpindah ke tangan yang terbuka. Serah terima itu peristiwa fisik,
     jadi ikonnya menggambarkan perpindahan, bukan dokumen atau centang, supaya
     tidak tertukar dengan Review yang memang soal keputusan di atas kertas. */
  serah: (
    <>
      <path d="M3 14v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4" />
      <path d="M12 3v11" />
      <path d="m8 10 4 4 4-4" />
    </>
  ),
  /* Kalender dengan tanda silang. Sengaja dibedakan jelas dari ikon kalender
     biasa, karena keduanya muncul bersamaan di menu admin dan ikon yang mirip
     akan membuat orang salah masuk halaman. */
  jadwal: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <path d="M3 10h18" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
      <path d="m9.5 13.5 5 5" />
      <path d="m14.5 13.5-5 5" />
    </>
  ),
  pengguna: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 5.5a3.5 3.5 0 0 1 0 7" />
      <path d="M17.5 14.5a6.2 6.2 0 0 1 4 5.5" />
    </>
  ),
};

export function IkonNav({
  nama,
  ukuran = 18,
}: {
  nama: NamaIkon;
  ukuran?: number;
}) {
  return (
    <svg
      className="ikon-nav"
      width={ukuran}
      height={ukuran}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
    >
      {GAMBAR[nama]}
    </svg>
  );
}
