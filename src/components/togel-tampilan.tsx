"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { COOKIE_BAHASA, COOKIE_TEMA, SETAHUN } from "@/lib/preferensi";
import type { Bahasa, Tema } from "@/lib/preferensi";

function simpan(nama: string, nilai: string) {
  document.cookie = `${nama}=${nilai}; path=/; max-age=${SETAHUN}; samesite=lax`;
}

/**
 * Togel tema terang dan gelap.
 *
 * Perubahannya langsung terasa tanpa memuat ulang halaman, karena seluruh
 * warna sudah lewat token CSS. Cukup mengganti atribut `data-tema` di
 * elemen html, dan satu blok penimpaan di globals.css mengurus sisanya.
 * Cookie hanya dipakai supaya render pertama kunjungan berikutnya sudah
 * benar dan tidak berkedip.
 */
export function TogelTema({
  awal,
  labelKeGelap,
  labelKeTerang,
}: {
  awal: Tema;
  labelKeGelap: string;
  labelKeTerang: string;
}) {
  const [tema, setTema] = useState<Tema>(awal);
  const gelap = tema === "gelap";
  const label = gelap ? labelKeTerang : labelKeGelap;

  return (
    <button
      type="button"
      className="btn btn-secondary btn-icon"
      aria-label={label}
      title={label}
      aria-pressed={gelap}
      onClick={() => {
        const berikutnya: Tema = gelap ? "terang" : "gelap";
        setTema(berikutnya);
        document.documentElement.setAttribute("data-tema", berikutnya);
        simpan(COOKIE_TEMA, berikutnya);
      }}
    >
      {gelap ? <IkonMatahari /> : <IkonBulan />}
    </button>
  );
}

/**
 * Togel bahasa Indonesia dan Inggris.
 *
 * Berbeda dari tema, teks dirakit di server component, jadi setelah cookie
 * berganti halaman perlu dirender ulang. `router.refresh()` melakukan itu
 * tanpa memuat ulang penuh, sehingga posisi gulir dan state klien lain
 * tetap utuh.
 */
export function TogelBahasa({
  awal,
  label,
  simpanKeAkun,
}: {
  awal: Bahasa;
  label: string;
  /** Dikirim dari server. Kosong di halaman tamu yang belum punya akun. */
  simpanKeAkun?: (nilai: string) => Promise<void>;
}) {
  const router = useRouter();
  const [bahasa, setBahasa] = useState<Bahasa>(awal);
  const [sedang, mulai] = useTransition();

  function pilih(berikutnya: Bahasa) {
    if (berikutnya === bahasa) return;
    setBahasa(berikutnya);
    // Cookie tetap ditulis walau sudah login, supaya render pertama setelah
    // keluar tidak berkedip kembali ke bahasa bawaan.
    simpan(COOKIE_BAHASA, berikutnya);
    document.documentElement.setAttribute("lang", berikutnya);
    mulai(async () => {
      if (simpanKeAkun) await simpanKeAkun(berikutnya);
      else router.refresh();
    });
  }

  return (
    <div className="sakelar-bahasa" role="group" aria-label={label}>
      {/* Penanda digeser dengan transform, bukan dengan mengubah posisi
          atau lebar, supaya animasinya halus dan tidak memicu perhitungan
          ulang tata letak di tiap frame. */}
      <span className="sakelar-penanda" data-sisi={bahasa} aria-hidden />
      {(["id", "en"] as const).map((kode) => (
        <button
          key={kode}
          type="button"
          className="sakelar-sisi"
          aria-pressed={bahasa === kode}
          disabled={sedang}
          onClick={() => pilih(kode)}
        >
          {kode.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

function IkonBulan() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}

function IkonMatahari() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" /><path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" /><path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" />
    </svg>
  );
}

