"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { aksiMasuk, type StatusForm } from "../aksi";
import { Field, PesanGagal, TombolKirim } from "@/components/form";
import { FieldSandi } from "@/components/kata-sandi";
import { useKamus } from "@/components/kamus-provider";
import { LambangSipras } from "@/components/logo";

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

  function isiDemo(e: string, p: string) {
    setEmail(e);
    setSandi(p);
  }

  return (
    <form action={kirim} noValidate>
      <div className="flex items-center gap-3" style={{ marginBottom: 16 }}>
        <LambangSipras ukuran={32} />
        <div>
          <h3 style={{ margin: 0, fontSize: 18, lineHeight: 1.2 }}>{t.masuk.kartuJudul}</h3>
          <p
            style={{
              fontSize: 12.5,
              color: "var(--color-neutral-600)",
              margin: 0,
            }}
          >
            {t.masuk.kartuSub}
          </p>
        </div>
      </div>

      {/* Akun Uji Cepat (Demo Chips) */}
      <div
        style={{
          padding: "10px 12px",
          background: "var(--color-bg)",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--color-divider)",
          marginBottom: "var(--space-4)",
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            color: "var(--color-neutral-600)",
            marginBottom: 6,
          }}
        >
          {t.masuk.demoJudul}:
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => isiDemo("admin@sekolah.sch.id", "admin1234")}
            className="btn btn-secondary"
            style={{ fontSize: 11.5, padding: "4px 10px", minHeight: 28 }}
          >
            {t.masuk.demoAdmin}
          </button>
          <button
            type="button"
            onClick={() => isiDemo("siti@gmail.com", "peminjam1234")}
            className="btn btn-secondary"
            style={{ fontSize: 11.5, padding: "4px 10px", minHeight: 28 }}
          >
            {t.masuk.demoPeminjam}
          </button>
        </div>
      </div>

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

      <p style={{ marginTop: 8, textAlign: "right" }}>
        <Link href="/lupa-sandi" className="tautan" style={{ fontSize: 12.5 }}>
          {t.masuk.lupaSandi}
        </Link>
      </p>

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
