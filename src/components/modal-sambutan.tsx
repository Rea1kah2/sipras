"use client";

import { Suspense, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ModalInfo } from "@/components/modal";
import { useKamus } from "@/components/kamus-provider";
import type { Kamus } from "@/lib/kamus";

/**
 * Modal ucapan setelah masuk, daftar, atau keluar.
 *
 * Penandanya dititipkan lewat query string oleh server action yang melakukan
 * redirect. Saat modal ditutup, penanda itu dibuang dari URL supaya modal
 * tidak muncul lagi kalau halaman disegarkan atau di-bookmark.
 */

type Ucapan = {
  judul: string;
  isi: string;
  tombol: string;
  rupa: "sukses" | "pamit";
};

function ucapan(sambut: string, nama: string, t: Kamus): Ucapan | null {
  const panggilan = nama.split(" ")[0] || t.sambutan.panggilanUmum;
  const u = t.sambutan;
  switch (sambut) {
    case "masuk":
      return {
        judul: u.masukJudul.replace("{nama}", panggilan),
        isi: u.masukIsi,
        tombol: u.masukTombol,
        rupa: "sukses",
      };
    case "daftar":
      return {
        judul: u.daftarJudul.replace("{nama}", panggilan),
        isi: u.daftarIsi,
        tombol: u.daftarTombol,
        rupa: "sukses",
      };
    case "keluar":
      return {
        judul: u.keluarJudul,
        isi: u.keluarIsi,
        tombol: u.keluarTombol,
        rupa: "pamit",
      };
    default:
      return null;
  }
}

function Inti({ nama }: { nama: string }) {
  const t = useKamus();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [ditutup, setDitutup] = useState(false);

  const sambut = params.get("sambut");
  const pesan = sambut ? ucapan(sambut, nama, t) : null;

  function tutup() {
    // Tutup di layar dulu supaya terasa langsung, baru bersihkan URL-nya.
    setDitutup(true);
    const sisa = new URLSearchParams(params);
    sisa.delete("sambut");
    const q = sisa.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  }

  if (!pesan) return null;

  return (
    <ModalInfo
      terbuka={!ditutup}
      judul={pesan.judul}
      labelTombol={pesan.tombol}
      rupa={pesan.rupa}
      onTutup={tutup}
    >
      {pesan.isi}
    </ModalInfo>
  );
}

export function ModalSambutan({ nama = "" }: { nama?: string }) {
  // useSearchParams butuh batas Suspense supaya aman terhadap prerender.
  return (
    <Suspense fallback={null}>
      <Inti nama={nama} />
    </Suspense>
  );
}
