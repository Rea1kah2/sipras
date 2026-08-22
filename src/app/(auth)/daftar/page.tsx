import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { penggunaSaatIni } from "@/lib/auth";
import { Footer } from "@/components/footer";
import { BarTamu } from "@/components/bar-tamu";
import { PenyediaKamus } from "@/components/kamus-provider";
import { bacaPreferensi, teks } from "@/lib/preferensi-server";
import { kamus } from "@/lib/kamus";
import { FormDaftar } from "./form-daftar";

export async function generateMetadata(): Promise<Metadata> {
  const t = await teks();
  return { title: t.daftar.judul };
}

export default async function HalamanDaftar() {
  const user = await penggunaSaatIni();
  if (user) redirect(user.peran === "ADMIN" ? "/admin" : "/dasbor");

  const { tema, bahasa } = await bacaPreferensi();
  const t = kamus(bahasa);

  return (
    <PenyediaKamus nilai={t}>
      <div
      className="anim-rise"
      style={{
        position: "relative",
        display: "flex",
        justifyContent: "center",
        padding: "clamp(24px,4vw,56px) 22px",
      }}
    >
      <BarTamu tema={tema} bahasa={bahasa} t={t} />
      <div style={{ width: "min(620px,100%)" }}>
        <Link href="/masuk" className="tautan" style={{ fontSize: 13 }}>
          ← {t.daftar.kembali}
        </Link>
        <h2 style={{ margin: "14px 0 6px" }}>{t.daftar.judul}</h2>
        <p
          style={{
            fontSize: 14,
            color: "var(--color-neutral-700)",
            maxWidth: "52ch",
          }}
        >
          {t.daftar.penjelasan}
        </p>

          <FormDaftar />
        </div>
      </div>

      <Footer t={t} />
    </PenyediaKamus>
  );
}
