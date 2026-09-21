"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { aksiResetSandi, type StatusForm } from "../aksi";
import { PesanGagal, PesanSukses, TombolKirim } from "@/components/form";
import { FieldSandi } from "@/components/kata-sandi";
import { useKamus } from "@/components/kamus-provider";

export function FormResetSandi({ token }: { token: string }) {
  const t = useKamus();
  const [status, kirim] = useActionState<StatusForm, FormData>(aksiResetSandi, null);
  const [sandiBaru, setSandiBaru] = useState("");
  const [ulangiSandi, setUlangiSandi] = useState("");
  const error = status && !status.ok ? status.error : undefined;
  const pesanUmum = status && !status.ok && !status.error ? status.pesan : undefined;

  // Tidak ada token sama sekali di tautan: tidak perlu menampilkan form
  // sandi baru, tinggal tunjukkan jalan keluarnya.
  if (!token) {
    return (
      <div>
        <PesanGagal pesan={t.lupaSandi.tokenTidakValid} />
        <p style={{ marginTop: "var(--space-4)", textAlign: "center" }}>
          <Link href="/lupa-sandi" className="tautan">
            {t.lupaSandi.mintaLagi}
          </Link>
        </p>
      </div>
    );
  }

  if (status?.ok) {
    return (
      <div>
        <PesanSukses pesan={status.pesan} />
        <p style={{ marginTop: "var(--space-4)", textAlign: "center" }}>
          <Link href="/masuk" className="tautan">
            {t.lupaSandi.masukDenganSandiBaru}
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form action={kirim} noValidate>
      <input type="hidden" name="token" value={token} />
      <PesanGagal pesan={pesanUmum} />

      <div style={{ marginTop: pesanUmum ? "var(--space-3)" : 0 }}>
        <FieldSandi
          label={t.lupaSandi.sandiBaru}
          nama="sandiBaru"
          nilai={sandiBaru}
          onUbah={setSandiBaru}
          autoComplete="new-password"
          error={error?.sandiBaru}
          meter
          required
        />
      </div>

      <div style={{ marginTop: "var(--space-3)" }}>
        <FieldSandi
          label={t.lupaSandi.ulangiSandi}
          nama="ulangiSandi"
          nilai={ulangiSandi}
          onUbah={setUlangiSandi}
          autoComplete="new-password"
          error={error?.ulangiSandi}
          required
        />
      </div>

      <div style={{ marginTop: "var(--space-4)" }}>
        <TombolKirim sedang={t.lupaSandi.resetSedang}>
          {t.lupaSandi.resetTombol}
        </TombolKirim>
      </div>
    </form>
  );
}
