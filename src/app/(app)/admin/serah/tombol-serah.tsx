"use client";

import { useActionState, useState } from "react";
import { aksiSerahkan, type StatusSerah } from "./aksi";
import { PesanGagal, PesanSukses, TombolKirim } from "@/components/form";
import { ModalKonfirmasi } from "@/components/modal";
import { useKamus } from "@/components/kamus-provider";

/**
 * Tombol serah terima beserta modal konfirmasinya.
 *
 * `useActionState` SENGAJA tinggal di komponen ini, bukan ikut pindah ke dalam
 * modal. Modal hanya menyumbang tombol kirimnya. Kalau state ikut pindah, ia
 * dilepas bersama modal saat modal tertutup, dan pesan sukses atau gagalnya
 * hilang sebelum sempat terbaca. Pelajaran ini sudah dibayar sekali di
 * admin/pengguna/baris-pengguna.tsx, jadi polanya diulang di sini.
 */
export function TombolSerah({
  pengajuanId,
  kode,
  namaPemohon,
}: {
  pengajuanId: string;
  kode: string;
  namaPemohon: string;
}) {
  const t = useKamus();
  const [status, kirim] = useActionState<StatusSerah, FormData>(aksiSerahkan, null);
  const [tanya, setTanya] = useState(false);

  const isiJudul = t.serah.tanyaJudul
    .replace("{kode}", kode)
    .replace("{nama}", namaPemohon);

  return (
    <div className="flex flex-col" style={{ gap: 6, alignItems: "flex-start" }}>
      <button
        type="button"
        className="btn btn-primary"
        style={{ fontSize: 12.5 }}
        onClick={() => setTanya(true)}
      >
        {t.serah.tombol}
      </button>

      {status && !status.ok && <PesanGagal pesan={status.pesan} />}
      {status?.ok && <PesanSukses pesan={status.pesan} />}

      <ModalKonfirmasi
        terbuka={tanya}
        rupa="tanya"
        judul={isiJudul}
        labelBatal={t.umum.batal}
        onBatal={() => setTanya(false)}
        lanjut={
          // Form sendiri di dalam modal, bukan menumpang form di luar. Dengan
          // begitu tidak ada form bersarang, dan tidak perlu bergantung pada
          // perilaku <dialog> yang hidup di top layer.
          <form action={kirim} onSubmit={() => setTanya(false)}>
            <input type="hidden" name="pengajuanId" value={pengajuanId} />
            <TombolKirim className="btn btn-primary" sedang={t.serah.mengerjakan}>
              {t.serah.tanyaLanjut}
            </TombolKirim>
          </form>
        }
      >
        {t.serah.tanyaIsi}
      </ModalKonfirmasi>
    </div>
  );
}
