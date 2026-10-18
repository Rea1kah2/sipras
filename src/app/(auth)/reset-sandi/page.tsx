import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { penggunaSaatIni } from "@/lib/auth";
import { AuthShell } from "@/components/auth-shell";
import { bacaPreferensi, teks } from "@/lib/preferensi-server";
import { kamus } from "@/lib/kamus";
import { FormResetSandi } from "./form-reset-sandi";

export async function generateMetadata(): Promise<Metadata> {
  const t = await teks();
  return { title: t.lupaSandi.resetJudul };
}

export default async function HalamanResetSandi(props: PageProps<"/reset-sandi">) {
  const user = await penggunaSaatIni();
  if (user) redirect(user.peran === "ADMIN" ? "/admin" : "/dasbor");

  const sp = (await props.searchParams) as { token?: string };
  const token = sp.token ?? "";

  const { tema, bahasa } = await bacaPreferensi();
  const t = kamus(bahasa);

  return (
    <AuthShell tema={tema} bahasa={bahasa} t={t}>
      <div className="anim-rise">
          <Link href="/masuk" className="tautan" style={{ fontSize: 13 }}>
            ← {t.lupaSandi.kembali}
          </Link>
          <h2 style={{ margin: "14px 0 6px" }}>{t.lupaSandi.resetJudul}</h2>
          <p
            style={{
              fontSize: 14,
              color: "var(--color-neutral-700)",
              maxWidth: "52ch",
              marginBottom: "var(--space-4)",
            }}
          >
            {t.lupaSandi.resetPenjelasan}
          </p>

          <FormResetSandi token={token} />
      </div>
    </AuthShell>
  );
}
