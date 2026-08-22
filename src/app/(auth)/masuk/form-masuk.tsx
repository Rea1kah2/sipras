"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { aksiMasuk, type StatusForm } from "../aksi";
import { Field, PesanGagal, TombolKirim } from "@/components/form";
import { FieldSandi } from "@/components/kata-sandi";
import { useKamus } from "@/components/kamus-provider";

export function FormMasuk() {
  const t = useKamus();
  const [status, kirim] = useActionState<StatusForm, FormData>(aksiMasuk, null);
  // Terkendali supaya isian tidak ikut terhapus saat login gagal.
  const [email, setEmail] = useState("");
  const [sandi, setSandi] = useState("");
  const error = status && !status.ok ? status.error : undefined;
  // Pesan umum hanya ditampilkan kalau tidak ada error per-field, supaya
  // tidak dobel dengan pesan di bawah masing-masing input.
  const pesanUmum =
    status && !status.ok && !status.error ? status.pesan : undefined;

  return (
    <form action={kirim} noValidate>
      <h3 style={{ marginBottom: 4 }}>{t.masuk.kartuJudul}</h3>
      <p
        style={{
          fontSize: 13,
          color: "var(--color-neutral-600)",
          marginBottom: "var(--space-4)",
        }}
      >
        {t.masuk.kartuSub}
      </p>

      <PesanGagal pesan={pesanUmum} />

      <div style={{ marginTop: pesanUmum ? "var(--space-3)" : 0 }}>
        <Field
          label={t.masuk.email}
          nama="email"
          type="email"
          autoComplete="email"
          placeholder={t.masuk.emailContoh}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={error?.email}
          required
        />
      </div>

      <div style={{ marginTop: "var(--space-3)" }}>
        {/* Tanpa meter: saat masuk yang penting bisa memastikan sandinya
            benar diketik, bukan menilai kekuatannya. */}
        <FieldSandi
          label={t.masuk.sandi}
          nama="sandi"
          nilai={sandi}
          onUbah={setSandi}
          autoComplete="current-password"
          error={error?.sandi}
          required
        />
      </div>

      <div style={{ marginTop: "var(--space-4)" }}>
        <TombolKirim sedang={t.masuk.sedang}>{t.masuk.tombol}</TombolKirim>
      </div>

      <p
        style={{
          fontSize: 12.5,
          textAlign: "center",
          margin: "var(--space-4) 0 0",
          color: "var(--color-neutral-700)",
        }}
      >
        {t.masuk.belumPunya}{" "}
        <Link href="/daftar" className="tautan">
          {t.masuk.daftarSekarang}
        </Link>
      </p>
    </form>
  );
}
