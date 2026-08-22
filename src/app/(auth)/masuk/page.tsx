import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { penggunaSaatIni } from "@/lib/auth";
import { ModalSambutan } from "@/components/modal-sambutan";
import { Footer } from "@/components/footer";
import { BarTamu } from "@/components/bar-tamu";
import { PenyediaKamus } from "@/components/kamus-provider";
import { bacaPreferensi, teks } from "@/lib/preferensi-server";
import { kamus } from "@/lib/kamus";
import { FormMasuk } from "./form-masuk";

export async function generateMetadata(): Promise<Metadata> {
  const t = await teks();
  return { title: t.masuk.kartuJudul };
}

export default async function HalamanMasuk() {
  const user = await penggunaSaatIni();
  if (user) redirect(user.peran === "ADMIN" ? "/admin" : "/dasbor");

  const { tema, bahasa } = await bacaPreferensi();
  const t = kamus(bahasa);
  const LANGKAH = [
    { n: "1", teks: t.masuk.langkah1 },
    { n: "2", teks: t.masuk.langkah2 },
    { n: "3", teks: t.masuk.langkah3 },
  ];

  return (
    <PenyediaKamus nilai={t}>
      <div
        className="flex flex-wrap items-stretch"
        style={{ minHeight: "100vh", position: "relative" }}
      >
        <BarTamu tema={tema} bahasa={bahasa} t={t} />
      {/* Ucapan setelah keluar, dipicu penanda ?sambut=keluar dari aksiKeluar. */}
      <ModalSambutan />
      {/* Panel kiri: cerita produk */}
      <div
        className="relative overflow-hidden"
        style={{
          flex: "1 1 400px",
          padding: "clamp(28px,4vw,64px)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 26,
          background: "var(--color-panel)",
        }}
      >
        <div
          aria-hidden
          style={{
            position: "absolute", right: -100, top: -80, width: 300, height: 300,
            /* Tetap neutral-300, netral hangat. Sempat mau dibirukan, tapi
               justru salah: panel ini sekarang biru, dan lingkaran hangat di
               atasnya persis tema "Pasir dan Laut" itu sendiri. Lencana dan
               kartu langkah di panel yang sama juga sudah memakai warna
               pasir. Membirukannya juga akan menggeser mode gelap 8.3 L*
               tanpa alasan, karena di sana panelnya memang tidak bertona. */
            borderRadius: "50%", background: "var(--color-neutral-300)", opacity: 0.6,
          }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute", left: -70, bottom: -100, width: 230, height: 230,
            borderRadius: "50%", background: "var(--color-accent-100)", opacity: 0.55,
          }}
        />

        <div style={{ position: "relative" }}>
          <span
            className="tag"
            style={{ background: "var(--color-bg)", color: "var(--color-neutral-800)" }}
          >
            {t.masuk.lencana}
          </span>
          <h1
            style={{
              margin: "16px 0 12px",
              fontSize: "clamp(32px,4vw,50px)",
              maxWidth: "15ch",
              color: "var(--color-neutral-900)",
            }}
          >
            {t.masuk.judulBesar}
          </h1>
          <p
            style={{
              maxWidth: "42ch",
              fontSize: 15,
              color: "var(--color-neutral-800)",
            }}
          >
            {t.masuk.penjelasan}
          </p>
        </div>

        <div style={{ position: "relative", display: "flex", flexWrap: "wrap", gap: 10 }}>
          {LANGKAH.map((l) => (
            <div
              key={l.n}
              style={{
                flex: "1 1 120px",
                padding: "12px 14px",
                borderRadius: "var(--radius-md)",
                background: "var(--color-bg)",
              }}
            >
              <div style={{ fontFamily: "var(--font-heading)", fontSize: 22 }}>{l.n}</div>
              <div style={{ fontSize: 12, color: "var(--color-neutral-700)" }}>{l.teks}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Panel kanan: form */}
      <div
        style={{
          flex: "1 1 380px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "clamp(24px,4vw,48px) 22px",
        }}
      >
        <div
          className="card elev-md"
          style={{
            width: "min(400px,100%)",
            padding: "var(--space-6)",
            background: "var(--color-neutral-100)",
          }}
        >
            <FormMasuk />
          </div>
        </div>
      </div>

      {/* Footer ikut di halaman masuk supaya orang yang belum bisa login
          tetap menemukan kontak petugas. */}
      <Footer t={t} />
    </PenyediaKamus>
  );
}
