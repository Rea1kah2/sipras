"use client";

import { useActionState } from "react";
import { aksiTandaiTutup, type StatusJadwal } from "./aksi";
import { Field, PesanGagal, PesanSukses, TombolKirim } from "@/components/form";
import { useKamus } from "@/components/kamus-provider";

const JENIS = ["LIBUR", "PERAWATAN", "LAIN"] as const;

export function FormTutup({ hariIni }: { hariIni: string }) {
  const t = useKamus();
  const [status, kirim] = useActionState<StatusJadwal, FormData>(
    aksiTandaiTutup,
    null
  );

  const error = status && !status.ok ? status.error : undefined;

  return (
    <form action={kirim} className="card elev-sm" style={{ background: "var(--color-neutral-100)" }}>
      <span className="card-kicker">{t.jadwal.tambahJudul}</span>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
          gap: "var(--space-3)",
        }}
      >
        <Field
          label={t.jadwal.tanggalAwal}
          nama="tanggal"
          type="date"
          defaultValue={hariIni}
          error={error?.tanggal}
          required
        />
        {/* Sengaja TANPA atribut min. Admin yang baru memasang sistem wajar
            mengisi kalender libur setahun penuh termasuk bulan yang sudah
            lewat, supaya laporannya utuh. Tanggal lewat tidak bisa mengubah
            pengajuan yang sudah berjalan, karena penutupan hanya diperiksa
            saat orang mengajukan. */}
        <Field
          label={t.jadwal.tanggalAkhir}
          nama="tanggalAkhir"
          type="date"
          petunjuk={t.jadwal.tanggalAkhirPetunjuk}
          error={error?.tanggalAkhir}
        />
      </div>

      <Field
        label={t.jadwal.alasan}
        nama="alasan"
        placeholder={t.jadwal.alasanContoh}
        error={error?.alasan}
        required
      />

      <div className="field">
        <label htmlFor="jenis">{t.jadwal.jenis}</label>
        <select id="jenis" name="jenis" className="input" defaultValue="LIBUR">
          {JENIS.map((j) => (
            <option key={j} value={j}>
              {t.jadwal[`jenis${j}`]}
            </option>
          ))}
        </select>
      </div>

      <PesanGagal pesan={status && !status.ok ? status.pesan : undefined} />
      <PesanSukses pesan={status?.ok ? status.pesan : undefined} />

      <TombolKirim sedang={t.umum.memuat}>{t.jadwal.tandai}</TombolKirim>
    </form>
  );
}
