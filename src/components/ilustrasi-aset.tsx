/**
 * Ilustrasi pengganti untuk aset yang belum punya foto.
 *
 * Murni turunan tampilan: tidak ada apa pun yang ditulis ke kolom `foto`.
 * Begitu admin mengunggah foto asli, foto itu langsung menang tanpa perlu
 * membersihkan data palsu lebih dulu.
 */

type Props = {
  kategori: string;
  tipe: "BARANG" | "RUANG";
  /** Tinggi kotak. Kartu katalog memakai angka, detail memakai rasio. */
  tinggi?: number | string;
  rasio?: string;
  radius?: string;
};

type Motif = {
  latar: string;
  tinta: string;
  gambar: React.ReactNode;
};

// Dicocokkan dengan kata kunci, bukan daftar kategori yang kaku, supaya
// kategori baru yang dibuat admin tetap dapat ilustrasi yang masuk akal.
const KATA_KUNCI: { cocok: RegExp; motif: () => Motif }[] = [
  {
    cocok: /audio|visual|proyektor|sound|mic/i,
    motif: () => ({
      latar: "var(--color-neutral-200)",
      tinta: "var(--color-neutral-600)",
      gambar: (
        <>
          <rect x="10" y="22" width="44" height="26" rx="5" />
          <circle cx="26" cy="35" r="7" />
          <path d="M44 31h4" />
          <path d="M54 35h6" />
        </>
      ),
    }),
  },
  {
    cocok: /elektronik|kamera|tripod|komputer/i,
    motif: () => ({
      latar: "var(--color-neutral-200)",
      tinta: "var(--color-neutral-700)",
      gambar: (
        <>
          <path d="M12 24h10l4-5h12l4 5h10a4 4 0 0 1 4 4v18a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4V28a4 4 0 0 1 4-4z" />
          <circle cx="32" cy="36" r="9" />
        </>
      ),
    }),
  },
  {
    cocok: /furnitur|kursi|meja/i,
    motif: () => ({
      latar: "var(--color-neutral-200)",
      tinta: "var(--color-neutral-700)",
      gambar: (
        <>
          <path d="M14 18v18" />
          <path d="M50 18v18" />
          <path d="M10 36h44" />
          <path d="M18 36v12" />
          <path d="M46 36v12" />
        </>
      ),
    }),
  },
  {
    cocok: /pertemuan|aula|seminar|rapat/i,
    motif: () => ({
      latar: "var(--color-neutral-200)",
      tinta: "var(--color-neutral-800)",
      gambar: (
        <>
          <path d="M8 48V26l24-14 24 14v22" />
          <path d="M4 48h56" />
          <rect x="24" y="32" width="16" height="16" rx="2" />
        </>
      ),
    }),
  },
  {
    cocok: /lab|studio|multimedia|podcast/i,
    motif: () => ({
      latar: "var(--color-neutral-100)",
      tinta: "var(--color-neutral-700)",
      gambar: (
        <>
          <rect x="14" y="16" width="36" height="24" rx="3" />
          <path d="M24 46h16" />
          <path d="M32 40v6" />
          <path d="M22 24h20" />
          <path d="M22 31h12" />
        </>
      ),
    }),
  },
  {
    cocok: /outdoor|lapangan|taman/i,
    motif: () => ({
      latar: "var(--color-neutral-200)",
      tinta: "var(--color-neutral-700)",
      gambar: (
        <>
          <rect x="8" y="18" width="48" height="30" rx="3" />
          <path d="M32 18v30" />
          <circle cx="32" cy="33" r="7" />
        </>
      ),
    }),
  },
];

function motifUntuk(kategori: string, tipe: "BARANG" | "RUANG"): Motif {
  const cocok = KATA_KUNCI.find((k) => k.cocok.test(kategori));
  if (cocok) return cocok.motif();

  // Cadangan kalau kategorinya belum dikenal: bedakan minimal antara
  // barang dan ruang supaya tetap terbaca.
  return tipe === "RUANG"
    ? {
        latar: "var(--color-neutral-200)",
        tinta: "var(--color-neutral-800)",
        gambar: (
          <>
            <path d="M8 48V26l24-14 24 14v22" />
            <path d="M4 48h56" />
          </>
        ),
      }
    : {
        latar: "var(--color-neutral-200)",
        tinta: "var(--color-neutral-700)",
        gambar: (
          <>
            <path d="M32 10 56 22v20L32 54 8 42V22z" />
            <path d="M8 22l24 12 24-12" />
            <path d="M32 34v20" />
          </>
        ),
      };
}

export function IlustrasiAset({
  kategori,
  tipe,
  tinggi,
  rasio,
  radius,
}: Props) {
  const m = motifUntuk(kategori, tipe);

  return (
    <div
      role="img"
      aria-label={`Ilustrasi kategori ${kategori}`}
      style={{
        height: tinggi,
        aspectRatio: rasio,
        width: "100%",
        borderRadius: radius,
        background: m.latar,
        display: "grid",
        placeItems: "center",
        overflow: "hidden",
      }}
    >
      <svg
        width="42%"
        viewBox="0 0 64 64"
        fill="none"
        stroke={m.tinta}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ opacity: 0.65, maxWidth: 96 }}
      >
        {m.gambar}
      </svg>
    </div>
  );
}
