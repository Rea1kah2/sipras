/**
 * Lambang SIPRAS, konsep "Ruang dan Barang".
 *
 * Denah ruang dengan satu pintu terbuka di sisi kanan, dan sebuah barang
 * di dalamnya. Dua hal yang dipinjamkan sistem ini jadi satu bentuk, dan
 * pintu yang terbuka menyiratkan keluar lalu masuk kembali.
 *
 * Digambar pada kanvas 48x48 dengan ketebalan garis 6,5px. Tidak ada
 * detail yang lebih kecil dari 4px, jadi bentuknya tetap utuh saat
 * diperkecil ke favicon 16px.
 *
 * Warnanya memakai `currentColor`, jadi lambang ini mengikuti warna teks
 * induknya dan otomatis benar di mode terang maupun gelap.
 */
export function LogoSipras({
  ukuran = 24,
  className,
}: {
  ukuran?: number;
  className?: string;
}) {
  return (
    <svg
      className={className}
      width={ukuran}
      height={ukuran}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden
      focusable="false"
    >
      {/* dinding ruang, terputus di kanan sebagai pintu */}
      <path
        d="M39 19A10 10 0 0 0 29 9L19 9A10 10 0 0 0 9 19L9 29A10 10 0 0 0 19 39L29 39A10 10 0 0 0 39 29"
        fill="none"
        stroke="currentColor"
        strokeWidth="6.5"
        strokeLinecap="round"
      />
      {/* barang di dalam ruang */}
      <rect x="18" y="18" width="12" height="12" rx="4" fill="currentColor" />
    </svg>
  );
}

/**
 * Lambang di dalam wadah bulat, seperti yang dipakai di sidebar dan footer.
 * Wadahnya memakai warna aksen, lambangnya putih.
 */
export function LambangSipras({ ukuran = 30 }: { ukuran?: number }) {
  return (
    <span
      aria-hidden
      style={{
        width: ukuran,
        height: ukuran,
        flex: "none",
        borderRadius: "50%",
        background: "var(--color-accent)",
        color: "var(--color-di-atas-solid)",
        display: "grid",
        placeItems: "center",
      }}
    >
      <LogoSipras ukuran={Math.round(ukuran * 0.63)} />
    </span>
  );
}
