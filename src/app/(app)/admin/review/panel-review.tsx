"use client";

import { useActionState } from "react";
import { useState } from "react";
import { aksiReview, type StatusReview } from "./aksi";
import { FieldArea, PesanGagal, PesanSukses, TombolKirim } from "@/components/form";
import { useKamus } from "@/components/kamus-provider";
import { ModalKonfirmasi } from "@/components/modal";

export function PanelKeputusan({
  pengajuanId,
  bisaDiputuskan,
}: {
  pengajuanId: string;
  bisaDiputuskan: boolean;
}) {
  const t = useKamus();
  const [status, kirim] = useActionState<StatusReview, FormData>(aksiReview, null);
  const [keputusan, setKeputusan] = useState<"SETUJU" | "TOLAK" | null>(null);

  const gagal = status && !status.ok ? status : null;
  const sukses = status && status.ok ? status : null;

  if (!bisaDiputuskan) return null;

  return (
    <form action={kirim} noValidate style={{ display: "contents" }}>
      <input type="hidden" name="pengajuanId" value={pengajuanId} />
      <input type="hidden" name="keputusan" value={keputusan ?? ""} />

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
        <button
          type="button"
          className="btn btn-primary"
          style={{ flex: "1 1 130px" }}
          onClick={() => setKeputusan("SETUJU")}
        >
          {t.review.setujui}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          style={{
            flex: "1 1 130px",
            borderColor: "var(--color-danger-700)",
            color: "var(--color-danger-800)",
          }}
          onClick={() => setKeputusan("TOLAK")}
        >
          {t.review.tolak}
        </button>
      </div>

      <ModalKonfirmasi
        terbuka={keputusan !== null && !sukses}
        judul={keputusan === "SETUJU" ? t.review.tanyaSetujui : t.review.tanyaTolak}
        labelBatal={t.umum.batal}
        rupa={keputusan === "SETUJU" ? "sukses" : "bahaya"}
        onBatal={() => setKeputusan(null)}
        lanjut={
          <TombolKirim
            className={keputusan === "SETUJU" ? "btn btn-primary" : "btn btn-danger"}
            sedang={t.review.memproses}
          >
            {keputusan === "SETUJU" ? t.review.setujui : t.review.tolak}
          </TombolKirim>
        }
      >
        {keputusan === "SETUJU"
          ? t.review.konfirmasiSetujui
          : t.review.konfirmasiTolak}
      </ModalKonfirmasi>
    </form>
  );
}
