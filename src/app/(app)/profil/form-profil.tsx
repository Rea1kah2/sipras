"use client";

import { useActionState, useState } from "react";
import { aksiSimpanProfil, aksiUbahSandi, type StatusProfil } from "./aksi";
import { Field, PesanGagal, PesanSukses, TombolKirim } from "@/components/form";
import { useKamus } from "@/components/kamus-provider";
import { FieldSandi } from "@/components/kata-sandi";

export function FormProfil({
  nama,
  whatsapp,
  unit,
}: {
  nama: string;
  whatsapp: string;
  unit: string;
}) {
  const t = useKamus();
  const [status, kirim] = useActionState<StatusProfil, FormData>(
    aksiSimpanProfil,
    null
  );
  const error = status && !status.ok ? status.error : undefined;

  return (
    <form
      action={kirim}
      noValidate
      className="card elev-sm"
      style={{ background: "var(--color-neutral-100)" }}
    >
      <h4 style={{ margin: 0 }}>{t.profil.dataDiri}</h4>

      <PesanGagal pesan={status && !status.ok ? status.pesan : undefined} />
      <PesanSukses pesan={status && status.ok ? status.pesan : undefined} />

      <Field
        label={t.profil.nama}
        nama="nama"
        defaultValue={nama}
        autoComplete="name"
        error={error?.nama}
        required
      />
      <Field
        label={t.profil.whatsapp}
        nama="whatsapp"
        defaultValue={whatsapp}
        autoComplete="tel"
        petunjuk={t.profil.whatsappBantuan}
        error={error?.whatsapp}
        required
      />
      <Field
        label={t.profil.unit}
        nama="unit"
        defaultValue={unit}
        error={error?.unit}
        required
      />

      <TombolKirim className="btn btn-primary" sedang={t.profil.menyimpan}>
        {t.profil.simpan}
      </TombolKirim>
    </form>
  );
}

export function FormSandi() {
  const t = useKamus();
  const [status, kirim] = useActionState<StatusProfil, FormData>(
    aksiUbahSandi,
    null
  );
  const [lama, setLama] = useState("");
  const [baru, setBaru] = useState("");
  const [ulangi, setUlangi] = useState("");
  const error = status && !status.ok ? status.error : undefined;

  return (
    <form
      action={kirim}
      noValidate
      className="card elev-sm"
      style={{ background: "var(--color-neutral-100)" }}
    >
      <h4 style={{ margin: 0 }}>{t.profil.gantiSandi}</h4>

      <PesanGagal
        pesan={status && !status.ok && !status.error ? status.pesan : undefined}
      />
      <PesanSukses pesan={status && status.ok ? status.pesan : undefined} />

      <FieldSandi
        label={t.profil.sandiSekarang}
        nama="sandiLama"
        nilai={lama}
        onUbah={setLama}
        autoComplete="current-password"
        error={error?.sandiLama}
        required
      />
      <FieldSandi
        label={t.profil.sandiBaru}
        nama="sandiBaru"
        nilai={baru}
        onUbah={setBaru}
        autoComplete="new-password"
        error={error?.sandiBaru}
        meter
        required
      />
      <FieldSandi
        label={t.profil.ulangSandiBaru}
        nama="ulangiSandi"
        nilai={ulangi}
        onUbah={setUlangi}
        autoComplete="new-password"
        error={error?.ulangiSandi}
        required
      />

      <TombolKirim className="btn btn-primary" sedang={t.profil.mengganti}>
        {t.profil.tombolGanti}
      </TombolKirim>
    </form>
  );
}
