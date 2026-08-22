import type { Metadata } from "next";
import { Caprasimo, Figtree } from "next/font/google";
import { bacaPreferensi, teks } from "@/lib/preferensi-server";
import "./globals.css";

const caprasimo = Caprasimo({
  variable: "--font-caprasimo",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

const figtree = Figtree({
  variable: "--font-figtree",
  weight: ["400", "600", "700"],
  subsets: ["latin"],
  display: "swap",
});

/**
 * Judul dan keterangan situs ikut bahasa pembacanya.
 *
 * Dulu ini objek `metadata` statis berisi kalimat Indonesia, jadi tab peramban
 * tetap berbahasa Indonesia walau seluruh isi halaman sudah Inggris. Diubah
 * jadi generateMetadata supaya dirakit per permintaan, saat bahasa pembacanya
 * sudah diketahui. Templatnya tetap sama di kedua bahasa karena isinya cuma
 * nama merek.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await teks();
  return {
    title: { default: t.merek.situsJudul, template: `%s · ${t.merek.nama}` },
    description: t.merek.situsDeskripsi,
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Tema dan bahasa dibaca di server supaya HTML pertama sudah benar. Kalau
  // ditentukan di klien, halaman sempat berkedip terang sebelum jadi gelap.
  const { tema, bahasa } = await bacaPreferensi();

  return (
    <html
      lang={bahasa}
      data-tema={tema}
      className={`${caprasimo.variable} ${figtree.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
