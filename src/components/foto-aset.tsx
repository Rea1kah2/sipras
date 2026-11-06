"use client";

import { useState } from "react";
import { IlustrasiAset } from "@/components/ilustrasi-aset";

type Props = {
  foto?: string | null;
  nama: string;
  kategori: string;
  tipe: "BARANG" | "RUANG";
  tinggi?: number | string;
  rasio?: string;
  className?: string;
  gaya?: React.CSSProperties;
};

/**
 * Komponen gambar aset dengan fallback otomatis ke IlustrasiAset.
 *
 * Menampilkan foto asli jika ada. Jika foto kosong atau gagal dimuat
 * (misalnya berkas hilang atau koneksi gagal), otomatis beralih
 * ke ilustrasi SVG kategori tanpa merusak tata letak kartu.
 */
export function FotoAset({
  foto,
  nama,
  kategori,
  tipe,
  tinggi,
  rasio,
  className,
  gaya,
}: Props) {
  const [gagal, setGagal] = useState(false);

  if (!foto || gagal) {
    return (
      <IlustrasiAset
        kategori={kategori}
        tipe={tipe}
        tinggi={tinggi}
        rasio={rasio}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={foto}
      alt={nama}
      onError={() => setGagal(true)}
      className={className}
      style={{
        width: "100%",
        height: tinggi,
        aspectRatio: rasio,
        objectFit: "cover",
        display: "block",
        ...gaya,
      }}
    />
  );
}
