"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

/**
 * Judul halaman yang sekaligus tombol muat ulang data.
 *
 * Alasannya nyata: admin memantau antrean review dan verifikasi yang
 * bertambah tanpa mereka berpindah halaman. Memuat ulang lewat
 * `router.refresh()` merender ulang server component saja, jadi posisi
 * gulir dan state klien lain tetap utuh.
 *
 * Karena teks yang bisa ditekan mudah terlewat, afordansinya dibuat jelas:
 * ikon putar muncul saat disorot, dan subjudul berubah jadi keterangan
 * hidup yang menyebut kapan terakhir diperbarui.
 */
export function JudulHalaman({
  judul,
  sub,
  labelMuatUlang,
  sedangMemuat,
  baruSaja,
  menitLalu,
  jamLalu,
}: {
  judul: string;
  sub: string;
  labelMuatUlang: string;
  sedangMemuat: string;
  baruSaja: string;
  menitLalu: string;
  jamLalu: string;
}) {
  const router = useRouter();
  const [sedang, mulai] = useTransition();
  const [sejak, setSejak] = useState(() => Date.now());
  const [sekarang, setSekarang] = useState(() => Date.now());

  // Keterangan umur data hanya berguna kalau ikut berjalan. Satu menit
  // sekali sudah cukup, karena satuan terkecil yang ditampilkan menit.
  useEffect(() => {
    const jam = setInterval(() => setSekarang(Date.now()), 60_000);
    return () => clearInterval(jam);
  }, []);

  const menit = Math.floor((sekarang - sejak) / 60_000);
  const umur =
    menit < 1
      ? baruSaja
      : menit < 60
        ? menitLalu.replace("{n}", String(menit))
        : jamLalu.replace("{n}", String(Math.floor(menit / 60)));

  return (
    <button
      type="button"
      className="judul-halaman"
      aria-label={`${judul}. ${labelMuatUlang}`}
      title={labelMuatUlang}
      disabled={sedang}
      onClick={() =>
        mulai(() => {
          router.refresh();
          setSejak(Date.now());
          setSekarang(Date.now());
        })
      }
    >
      <span className="judul-baris">
        <span className="judul-teks">{judul}</span>
        <IkonPutar berputar={sedang} />
      </span>
      <span className="judul-sub">{sedang ? sedangMemuat : `${sub} · ${umur}`}</span>
    </button>
  );
}

function IkonPutar({ berputar }: { berputar: boolean }) {
  return (
    <svg
      className={berputar ? "ikon-putar berputar" : "ikon-putar"}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 12a9 9 0 0 1 15.5-6.2L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15.5 6.2L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}
