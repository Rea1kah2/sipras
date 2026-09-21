"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { aksiMintaResetSandi, type StatusForm } from "../aksi";
import { Field, PesanGagal, PesanSukses, TombolKirim } from "@/components/form";
import { useKamus } from "@/components/kamus-provider";

export function FormLupaSandi() {
  const t = useKamus();
  const [status, kirim] = useActionState<StatusForm, FormData>(
    aksiMintaResetSandi,
    null
  );
  const [email, setEmail] = useState("");
  const error = status && !status.ok ? status.error : undefined;
  const pesanUmum = status && !status.ok && !status.error ? status.pesan : undefined;

  // Setelah sukses, form tidak perlu tampil lagi: tidak ada apa apa lagi
  // yang bisa dilakukan pengguna di halaman ini selain menunggu emailnya.
  if (status?.ok) {
    return (
      <div>
        <PesanSukses pesan={status.pesan} />
        <p style={{ marginTop: "var(--space-4)", textAlign: "center" }}>
          <Link href="/masuk" className="tautan">
            {t.lupaSandi.masukSekarang}
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form action={kirim} noValidate>
      <PesanGagal pesan={pesanUmum} />

      <div style={{ marginTop: pesanUmum ? "var(--space-3)" : 0 }}>
        <Field
          label={t.lupaSandi.email}
          nama="email"
          type="email"
          autoComplete="email"
          placeholder={t.lupaSandi.emailContoh}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={error?.email}
          required
        />
      </div>

      <div style={{ marginTop: "var(--space-4)" }}>
        <TombolKirim sedang={t.lupaSandi.sedang}>{t.lupaSandi.tombol}</TombolKirim>
      </div>
    </form>
  );
}
