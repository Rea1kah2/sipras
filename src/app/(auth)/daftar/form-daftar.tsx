"use client";

import { useActionState, useState } from "react";
import { aksiDaftar, type StatusForm } from "../aksi";
import { Field, PesanGagal, TombolKirim } from "@/components/form";
import { useKamus } from "@/components/kamus-provider";
import { FieldSandi } from "@/components/kata-sandi";

/**
 * Seluruh field di sini TERKENDALI, bukan memakai defaultValue.
 *
 * Alasannya bug nyata: React 19 mengosongkan input tak terkendali setelah
 * `<form action={...}>` selesai dijalankan. Jadi begitu server menolak
 * (paling sering karena kotak persetujuan belum dicentang), seluruh isian
 * ikut terhapus dan pengguna harus mengetik ulang dari awal. Dengan nilai
 * yang datang dari state React, perilaku reset itu tidak berpengaruh sama
 * sekali, dan sandi pun tidak perlu dikirim bolak balik lewat jaringan.
 */

type Isian = {
  nama: string;
  identitas: string;
  email: string;
  whatsapp: string;
  unit: string;
  sandi: string;
  ulangiSandi: string;
};

const KOSONG: Isian = {
  nama: "",
  identitas: "",
  email: "",
  whatsapp: "",
  unit: "",
  sandi: "",
  ulangiSandi: "",
};

export function FormDaftar() {
  const t = useKamus();
  const [status, kirim] = useActionState<StatusForm, FormData>(aksiDaftar, null);
  const [isian, setIsian] = useState<Isian>(KOSONG);
  const [setuju, setSetuju] = useState(false);
  const [lupaSetuju, setLupaSetuju] = useState(false);

  const error = status && !status.ok ? status.error : undefined;
  const pesanUmum =
    status && !status.ok && !status.error ? status.pesan : undefined;

  const ubah = (kunci: keyof Isian) => (nilai: string) =>
    setIsian((s) => ({ ...s, [kunci]: nilai }));

  return (
    <form
      action={kirim}
      noValidate
      className="card elev-md"
      style={{
        marginTop: "var(--space-4)",
        padding: "var(--space-6)",
        background: "var(--color-neutral-100)",
      }}
      onSubmit={(e) => {
        // Penjagaan di klien untuk kasus yang paling sering terjadi, supaya
        // tidak perlu bolak balik ke server hanya untuk satu centang.
        // Validasi di server tetap ada dan tidak dikurangi.
        if (!setuju) {
          e.preventDefault();
          setLupaSetuju(true);
        }
      }}
    >
      <PesanGagal pesan={pesanUmum} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
          gap: "var(--space-3)",
        }}
      >
        <Field
          label={t.daftar.nama}
          nama="nama"
          placeholder={t.daftar.namaContoh}
          autoComplete="name"
          value={isian.nama}
          onChange={(e) => ubah("nama")(e.target.value)}
          error={error?.nama}
          required
        />
        <Field
          label={t.daftar.identitas}
          nama="identitas"
          placeholder={t.daftar.identitasContoh}
          value={isian.identitas}
          onChange={(e) => ubah("identitas")(e.target.value)}
          error={error?.identitas}
          required
        />
        <Field
          label={t.daftar.email}
          nama="email"
          type="email"
          placeholder={t.daftar.emailContoh}
          autoComplete="email"
          value={isian.email}
          onChange={(e) => ubah("email")(e.target.value)}
          error={error?.email}
          required
        />
        <Field
          label={t.daftar.whatsapp}
          nama="whatsapp"
          placeholder={t.daftar.whatsappContoh}
          autoComplete="tel"
          value={isian.whatsapp}
          onChange={(e) => ubah("whatsapp")(e.target.value)}
          error={error?.whatsapp}
          petunjuk={t.daftar.whatsappBantuan}
          required
        />
        <FieldSandi
          label={t.daftar.sandi}
          nama="sandi"
          nilai={isian.sandi}
          onUbah={ubah("sandi")}
          autoComplete="new-password"
          placeholder={t.daftar.sandiContoh}
          error={error?.sandi}
          meter
          required
        />
        <FieldSandi
          label={t.daftar.ulangSandi}
          nama="ulangiSandi"
          nilai={isian.ulangiSandi}
          onUbah={ubah("ulangiSandi")}
          autoComplete="new-password"
          placeholder={t.daftar.ulangSandi}
          error={error?.ulangiSandi}
          required
        />
      </div>

      <div style={{ marginTop: "var(--space-3)" }}>
        <Field
          label={t.daftar.unit}
          nama="unit"
          placeholder={t.daftar.unitContoh}
          value={isian.unit}
          onChange={(e) => ubah("unit")(e.target.value)}
          error={error?.unit}
          required
        />
      </div>

      <label
        className="radio"
        style={{ marginTop: "var(--space-4)", alignItems: "flex-start", gap: 10 }}
      >
        <input
          type="checkbox"
          name="setuju"
          checked={setuju}
          onChange={(e) => {
            setSetuju(e.target.checked);
            if (e.target.checked) setLupaSetuju(false);
          }}
        />
        <span className="dot dot-square" />
        <span style={{ fontSize: 12.5, color: "var(--color-neutral-700)" }}>
            {t.daftar.setuju}
        </span>
      </label>

      {(lupaSetuju || error?.setuju) && (
        <div className="field-error" role="alert">
          {error?.setuju?.[0] ??
            t.daftar.belumSetuju}
        </div>
      )}

      <div style={{ marginTop: "var(--space-4)" }}>
        <TombolKirim sedang={t.daftar.sedang}>{t.daftar.tombol}</TombolKirim>
      </div>
    </form>
  );
}
