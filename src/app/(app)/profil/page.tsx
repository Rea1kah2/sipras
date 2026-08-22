import type { Metadata } from "next";
import { wajibLogin } from "@/lib/auth";
import { teks } from "@/lib/preferensi-server";
import { FormProfil, FormSandi } from "./form-profil";

export async function generateMetadata(): Promise<Metadata> {
  const t = await teks();
  return { title: t.judul.profil[0] };
}

export default async function Profil() {
  const user = await wajibLogin();
  const t = await teks();

  return (
    <div
      className="anim-rise"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))",
        gap: "var(--space-4)",
        alignItems: "start",
        maxWidth: 900,
      }}
    >
      <div className="flex flex-col" style={{ minWidth: 0, gap: "var(--space-3)" }}>
        <FormProfil
          nama={user.nama}
          whatsapp={user.whatsapp ?? ""}
          unit={user.unit ?? ""}
        />
      </div>

      <div className="flex flex-col" style={{ minWidth: 0, gap: "var(--space-3)" }}>
        {/* Email dan NIM sengaja tidak bisa diubah sendiri: keduanya dipakai
            sebagai identitas di riwayat peminjaman. Perubahan lewat petugas
            supaya jejaknya tetap bisa dipertanggungjawabkan. */}
        <div className="card elev-sm" style={{ background: "var(--color-neutral-100)" }}>
          <span className="card-kicker">{t.profil.identitas}</span>
          {[
            [t.profil.email, user.email],
            [t.profil.nim, user.identitas ?? "-"],
            [t.profil.peran, user.peran === "ADMIN" ? t.peran.admin : t.peran.peminjam],
          ].map(([label, nilai]) => (
            <div
              key={label}
              style={{
                display: "flex", justifyContent: "space-between",
                gap: 10, fontSize: 13, padding: "6px 0",
                borderBottom: "1px solid var(--color-divider)",
              }}
            >
              <span style={{ color: "var(--color-neutral-700)" }}>{label}</span>
              <b style={{ textAlign: "right", wordBreak: "break-all" }}>{nilai}</b>
            </div>
          ))}
          <p style={{ fontSize: 11.5, color: "var(--color-neutral-600)", margin: 0 }}>
            {t.profil.petunjukIdentitas}
          </p>
        </div>

        <FormSandi />
      </div>
    </div>
  );
}
