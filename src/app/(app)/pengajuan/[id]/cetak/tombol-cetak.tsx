"use client";

/**
 * Tombol cetak.
 *
 * Komponen klien terkecil yang mungkin, isinya hanya satu panggilan
 * `window.print()`. Sengaja dipisah supaya halaman buktinya sendiri tetap
 * server component dan tidak perlu mengirim data pengajuan ke peramban
 * hanya demi satu tombol.
 */
export function TombolCetak({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="btn btn-primary"
      style={{ fontSize: 13 }}
      onClick={() => window.print()}
    >
      {label}
    </button>
  );
}
