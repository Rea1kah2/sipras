"use client";

import { useActionState } from "react";
import { aksiSimpanLayanan, type StatusJadwal } from "./aksi";
import { Field, PesanGagal, PesanSukses, TombolKirim } from "@/components/form";
import { useKamus } from "@/components/kamus-provider";

type Props = {
  hariLayanan: number[];
  jamBuka: string;
  jamTutup: string;
};

/**
 * Hari layanan dan jam layanan.
 *
 * Urutan hari dimulai dari Senin, bukan Minggu, karena itu cara orang di sini
 * membaca pekan. Nilai yang dikirim tetap penomoran getUTCDay, yaitu Minggu 0
 * sampai Sabtu 6, jadi tampilannya saja yang digeser dan tidak ada konversi
 * yang perlu diingat di sisi server.
 */
const URUTAN_TAMPIL = [1, 2, 3, 4, 5, 6, 0];

export function FormLayanan({ hariLayanan, jamBuka, jamTutup }: Props) {
  const t = useKamus();
  const [status, kirim] = useActionState<StatusJadwal, FormData>(
    aksiSimpanLayanan,
    null
  );

  const error = status && !status.ok ? status.error : undefined;
  const aktif = new Set(hariLayanan);

  return (
    <form action={kirim} className="card elev-sm" style={{ background: "var(--color-neutral-100)" }}>
      <span className="card-kicker">{t.jadwal.hariLayanan}</span>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
        {URUTAN_TAMPIL.map((h) => (
          <label key={h} className="radio" style={{ gap: 7 }}>
            {/* defaultChecked, bukan checked, karena keadaan tersimpan datang
                dari server dan form ini tidak perlu mengendalikannya di klien.
                Nilainya tetap penomoran getUTCDay walau urutan tampilnya
                dimulai dari Senin. */}
            <input
              type="checkbox"
              name="hariLayanan"
              value={h}
              defaultChecked={aktif.has(h)}
            />
            <span className="dot dot-square" />
            <span style={{ fontSize: 13 }}>{t.hariPanjang[h]}</span>
          </label>
        ))}
      </div>

      <div style={{ fontSize: 11.5, color: "var(--color-neutral-600)" }}>
        {t.jadwal.hariLayananPetunjuk}
      </div>

      <div style={{ height: 1, background: "var(--color-divider)", margin: "4px 0" }} />

      <span className="card-kicker">{t.jadwal.jamLayanan}</span>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))",
          gap: "var(--space-3)",
          maxWidth: 320,
        }}
      >
        <Field
          label={t.jadwal.jamBuka}
          nama="jamBuka"
          defaultValue={jamBuka}
          placeholder="08.00"
          inputMode="numeric"
          error={error?.jamBuka}
        />
        <Field
          label={t.jadwal.jamTutup}
          nama="jamTutup"
          defaultValue={jamTutup}
          placeholder="16.00"
          inputMode="numeric"
          error={error?.jamTutup}
        />
      </div>

      {/* Dikatakan terang terangan bahwa jam ini cuma keterangan. Menyimpan
          jam lalu membiarkan orang menyangka sistemnya menjadwalkan per jam
          adalah janji yang tidak ditepati kode. */}
      <div style={{ fontSize: 11.5, color: "var(--color-neutral-600)" }}>
        {t.jadwal.jamPetunjuk}
      </div>

      <PesanGagal pesan={status && !status.ok ? status.pesan : undefined} />
      <PesanSukses pesan={status?.ok ? status.pesan : undefined} />

      <TombolKirim sedang={t.umum.memuat}>{t.jadwal.simpanPengaturan}</TombolKirim>
    </form>
  );
}
