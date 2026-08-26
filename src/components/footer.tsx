import Link from "next/link";
import { LambangSipras } from "@/components/logo";
import type { Kamus } from "@/lib/kamus";

/**
 * Footer aplikasi.
 *
 * Selain menutup halaman, ini juga rumah baru kartu "Butuh bantuan" yang
 * dulu hanya ada di sidebar. Sejak sidebar ditiadakan di HP, kontak petugas
 * kehilangan tempat, dan footer terlihat di semua ukuran layar.
 */

type Props = {
  /** Tautan cepat menyesuaikan peran. Tanpa sesi, dipakai varian tamu. */
  peran?: "PEMINJAM" | "ADMIN" | null;
  t: Kamus;
};

export function Footer({ peran = null, t }: Props) {
  const wa = process.env.NEXT_PUBLIC_WA_PETUGAS ?? "";
  const email = process.env.NEXT_PUBLIC_EMAIL_PETUGAS ?? "";
  /* Nama lembaga sengaja TIDAK ditaruh di kamus. Nilainya sama persis di
     kedua bahasa, dan cek:bahasa menandai nilai kamus identik dua kata atau
     lebih sebagai terjemahan yang tertinggal. Selain itu aplikasinya jadi
     terikat satu sekolah. Kosong berarti footer tampil tanpa nama lembaga,
     jadi tidak ada yang rusak saat variabelnya belum diisi. */
  const instansi = process.env.NEXT_PUBLIC_NAMA_INSTANSI?.trim() ?? "";
  const waLink = `https://wa.me/${wa.replace(/\D/g, "").replace(/^0/, "62")}`;
  const tahun = new Date().getFullYear();

  const tautan =
    peran === "ADMIN"
      ? [
          { href: "/admin/review", label: t.footer.tautanAdmin.review },
          { href: "/admin/aset", label: t.footer.tautanAdmin.aset },
          { href: "/admin/verifikasi", label: t.footer.tautanAdmin.verifikasi },
          { href: "/admin/riwayat", label: t.footer.tautanAdmin.riwayat },
        ]
      : peran === "PEMINJAM"
        ? [
            { href: "/katalog", label: t.footer.tautanPeminjam.katalog },
            { href: "/ajukan", label: t.footer.tautanPeminjam.ajukan },
            { href: "/pengajuan", label: t.footer.tautanPeminjam.pengajuan },
            { href: "/profil", label: t.footer.tautanPeminjam.profil },
          ]
        : [
            { href: "/masuk", label: t.footer.tautanTamu.masuk },
            { href: "/daftar", label: t.footer.tautanTamu.daftar },
          ];

  return (
    <footer
      style={{
        borderTop: "1px solid var(--color-divider)",
        /* Permukaan bertona, sekelas dengan sidebar dan navigasi bawah.
           Ketiganya kerangka halaman, bukan isi, jadi tonanya disamakan.
           Hasilnya halaman terkurung biru di kiri dan di bawah, dengan
           pasir di tengah dan kartu putih di atasnya. */
        background: "var(--color-panel)",
        padding: "var(--space-8) clamp(18px,3vw,40px) var(--space-6)",
        marginTop: "var(--space-8)",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))",
          gap: "var(--space-6)",
          maxWidth: 1180,
          margin: "0 auto",
        }}
      >
        {/* 1. identitas sistem */}
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10 }}>
            <LambangSipras ukuran={28} />
            <span style={{ fontFamily: "var(--font-heading)", fontSize: 17, letterSpacing: ".1em" }}>
              {t.merek.nama}
            </span>
          </div>
          <p style={{ fontSize: 12.5, color: "var(--color-neutral-700)", margin: 0, maxWidth: "34ch" }}>
            {t.merek.ringkas}
          </p>
        </div>

        {/* 2. tautan cepat */}
        <nav style={{ minWidth: 0 }} aria-label={t.footer.tautanCepat}>
          <h2 style={judulKolom}>{t.footer.tautanCepat}</h2>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 7 }}>
            {tautan.map((x) => (
              <li key={x.href}>
                <Link href={x.href} className="tautan" style={{ fontSize: 12.5 }}>
                  {x.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* 3. kontak petugas */}
        <div style={{ minWidth: 0 }}>
          <h2 style={judulKolom}>{t.footer.bantuan}</h2>
          <div style={{ fontSize: 12.5, color: "var(--color-neutral-700)", display: "flex", flexDirection: "column", gap: 7 }}>
            <span>{t.footer.lokasi}</span>
            <span>{t.footer.jam}</span>
            {wa && (
              <span>
                {t.footer.whatsapp}{" "}
                <a href={waLink} target="_blank" rel="noreferrer" className="tautan">
                  {wa}
                </a>
              </span>
            )}
            {email && (
              <span style={{ wordBreak: "break-all" }}>
                {t.footer.email}{" "}
                <a href={`mailto:${email}`} className="tautan">
                  {email}
                </a>
              </span>
            )}
          </div>
        </div>

        {/* 4. ringkasan alur */}
        <div style={{ minWidth: 0 }}>
          <h2 style={judulKolom}>{t.footer.alur}</h2>
          <ol
            style={{
              margin: 0,
              paddingLeft: 18,
              fontSize: 12.5,
              color: "var(--color-neutral-700)",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            {t.footer.langkah.map((langkah) => (
              <li key={langkah}>{langkah}</li>
            ))}
          </ol>
        </div>
      </div>

      <div
        style={{
          maxWidth: 1180,
          margin: "var(--space-6) auto 0",
          paddingTop: "var(--space-3)",
          borderTop: "1px solid var(--color-divider)",
          fontSize: 11.5,
          /* Teks samar di atas permukaan bertona, jadi pakai token yang
             memang untuk itu, bukan neutral-600 yang cuma dapat 4.30 di
             mode terang. */
          color: "var(--color-panel-samar)",
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          justifyContent: "space-between",
        }}
      >
        <span>
          &copy; {tahun} {t.merek.nama}. {t.footer.hakCipta}
          {instansi ? ` ${instansi}.` : ""}
        </span>
        <span>{t.footer.kanalNotif}</span>
      </div>
    </footer>
  );
}

const judulKolom: React.CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: ".08em",
  textTransform: "uppercase",
  /* Sama alasannya: judul kolom sekarang duduk di atas permukaan bertona. */
  color: "var(--color-panel-samar)",
  margin: "0 0 10px",
};
