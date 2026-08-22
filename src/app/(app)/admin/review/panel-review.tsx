"use client";

import { useActionState } from "react";
import { aksiReview, type StatusReview } from "./aksi";
import { FieldArea, PesanGagal, PesanSukses, TombolKirim } from "@/components/form";
import { useKamus } from "@/components/kamus-provider";

export function PanelKeputusan({
  pengajuanId,
  bisaDiputuskan,
}: {
  pengajuanId: string;
  bisaDiputuskan: boolean;
}) {
  const t = useKamus();
  const [status, kirim] = useActionState<StatusReview, FormData>(aksiReview, null);

  const gagal = status && !status.ok ? status : null;
  const sukses = status && status.ok ? status : null;

  if (!bisaDiputuskan) return null;

  return (
    <form action={kirim} noValidate style={{ display: "contents" }}>
      <input type="hidden" name="pengajuanId" value={pengajuanId} />

      <PesanGagal pesan={gagal?.pesan} />
      {gagal?.error?.bentrok?.map((b, i) => (
        <div
          key={i}
          style={{
            padding: "10px 13px",
            borderRadius: "var(--radius-md)",
            background: "var(--color-danger-200)",
            color: "var(--color-danger-900)",
            fontSize: 12.5,
          }}
        >
          {b}
        </div>
      ))}
      <PesanSukses pesan={sukses?.pesan} />

      <FieldArea
        label={t.review.catatanLabel}
        nama="catatan"
        style={{ minHeight: 74 }}
        placeholder={t.review.catatanContoh}
      />
      <div style={{ fontSize: 11.5, color: "var(--color-neutral-600)" }}>
        {t.review.catatanPetunjuk}
      </div>

      <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
        {/* name dan value ikut terkirim di FormData, jadi satu form cukup
            untuk dua keputusan tanpa state tambahan. */}
        <TombolKirim
          className="btn btn-primary"
          style={{ flex: "1 1 130px" }}
          name="keputusan"
          value="SETUJU"
          sedang={t.review.memproses}
        >
          Setujui
        </TombolKirim>
        <TombolKirim
          className="btn btn-secondary"
          style={{
            flex: "1 1 130px",
            borderColor: "var(--color-danger-700)",
            color: "var(--color-danger-800)",
          }}
          name="keputusan"
          value="TOLAK"
          sedang={t.review.memproses}
        >
          Tolak
        </TombolKirim>
      </div>
    </form>
  );
}
