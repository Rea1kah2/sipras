"use client";

import { useActionState } from "react";
import { aksiKirimPengembalian, type StatusKembali } from "./aksi";
import { FieldArea, PesanGagal, TombolKirim } from "@/components/form";
import { useKamus } from "@/components/kamus-provider";

export type BarisItem = {
  id: string;
  nama: string;
  meta: string;
};

export function FormKembali({
  pengajuanId,
  hariIni,
  items,
  opsiKondisi,
}: {
  pengajuanId: string;
  hariIni: string;
  items: BarisItem[];
  opsiKondisi: { nilai: string; label: string }[];
}) {
  const t = useKamus();
  const [status, kirim] = useActionState<StatusKembali, FormData>(
    aksiKirimPengembalian,
    null
  );
  const error = status && !status.ok ? status.error : undefined;
  const pesanUmum = status && !status.ok ? status.pesan : undefined;

  return (
    <form
      action={kirim}
      noValidate
      className="card elev-sm"
      style={{ minWidth: 0, background: "var(--color-neutral-100)" }}
    >
      <input type="hidden" name="pengajuanId" value={pengajuanId} />

      <h4 style={{ margin: 0 }}>{t.kembali.konfirmasi}</h4>
      <p style={{ fontSize: 12.5, color: "var(--color-neutral-700)", margin: 0 }}>
        {t.kembali.petunjukJujur}
      </p>

      <PesanGagal pesan={pesanUmum} />

      <div className="field" style={{ maxWidth: 220 }}>
        <label htmlFor="tanggalKembali">{t.kembali.tanggalKembali}</label>
        <input
          id="tanggalKembali"
          name="tanggalKembali"
          type="date"
          className="input"
          defaultValue={hariIni}
          max={hariIni}
          aria-invalid={error?.tanggalKembali ? true : undefined}
          required
        />
        {error?.tanggalKembali && (
          <div className="field-error">{error.tanggalKembali[0]}</div>
        )}
      </div>

      {items.map((it) => (
        <fieldset
          key={it.id}
          style={{
            padding: 12,
            borderRadius: "var(--radius-md)",
            background: "var(--color-bg)",
            border: 0,
            margin: 0,
          }}
        >
          <legend style={{ fontSize: 13.5, fontWeight: 600, padding: 0 }}>
            {it.nama}
          </legend>
          <div
            style={{
              fontSize: 11.5,
              color: "var(--color-neutral-600)",
              marginBottom: 8,
            }}
          >
            {it.meta}
          </div>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            {opsiKondisi.map((o, i) => (
              <label key={o.nilai} className="radio">
                <input
                  type="radio"
                  name={`kondisi:${it.id}`}
                  value={o.nilai}
                  defaultChecked={i === 0}
                  required
                />
                <span className="dot" />
                {o.label}
              </label>
            ))}
          </div>
        </fieldset>
      ))}

      <FieldArea
        label={t.kembali.catatan}
        nama="catatan"
        placeholder={t.kembali.catatanContoh}
        error={error?.catatan}
      />

      <TombolKirim sedang={t.kembali.mengirim}>
        {t.kembali.kirim}
      </TombolKirim>
    </form>
  );
}
