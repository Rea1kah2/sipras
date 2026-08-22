"use client";

import { useActionState, useState } from "react";
import { aksiVerifikasi, type StatusVerifikasi } from "./aksi";
import { PesanGagal, PesanSukses, TombolKirim } from "@/components/form";
import { ModalKonfirmasi } from "@/components/modal";
import { useKamus } from "@/components/kamus-provider";

type Pilihan = "SESUAI" | "PERLU_TINDAK_LANJUT";

/**
 * Panel keputusan verifikasi pengembalian.
 *
 * Kedua tombol menutup pengajuan jadi SELESAI, dan itu memang perilaku yang
 * dipilih. Yang membedakan cuma catatan dan bunyi notifikasinya. Karena nama
 * tombolnya "perlu tindak lanjut", modalnya WAJIB menyebut bahwa pengajuan
 * tetap ditutup sekarang juga, kalau tidak admin akan menyangka pengajuannya
 * menggantung sampai perbaikan beres.
 *
 * `useActionState` sengaja TETAP di komponen ini, bukan ikut pindah ke dalam
 * modal. Modal hanya menyumbang tombol kirimnya. Kalau state ikut pindah, ia
 * dilepas bersama modal saat modal tertutup, dan pesan sukses atau gagalnya
 * hilang sebelum sempat terbaca.
 */
export function PanelVerifikasi({ pengajuanId, kode }: { pengajuanId: string; kode: string }) {
  const t = useKamus();
  const [status, kirim] = useActionState<StatusVerifikasi, FormData>(
    aksiVerifikasi,
    null
  );

  const [tanya, setTanya] = useState<Pilihan | null>(null);

  /**
   * Isi catatan diangkat jadi state React, bukan dibiarkan hidup di dalam DOM
   * textarea saja. Tombol kirimnya berada di form lain di dalam modal, jadi
   * tanpa diangkat, catatan yang sudah diketik admin tidak akan pernah ikut
   * terkirim dan hilang begitu saja.
   */
  const [catatan, setCatatan] = useState("");

  const sesuai = tanya === "SESUAI";
  const v = t.verifikasi;

  return (
    <>
      <PesanGagal pesan={status && !status.ok ? status.pesan : undefined} />
      <PesanSukses pesan={status && status.ok ? status.pesan : undefined} />

      <div className="field">
        <label htmlFor={`catatan-${pengajuanId}`}>{v.catatanLabel}</label>
        <textarea
          id={`catatan-${pengajuanId}`}
          name="catatan"
          className="input"
          style={{ minHeight: 64 }}
          placeholder={v.catatanContoh}
          value={catatan}
          onChange={(e) => setCatatan(e.target.value)}
        />
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          className="btn btn-primary"
          style={{ fontSize: 12.5 }}
          onClick={() => setTanya("SESUAI")}
        >
          {v.sesuaiTombol}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          style={{
            fontSize: 12.5,
            borderColor: "var(--color-warn-700)",
            color: "var(--color-warn-800)",
          }}
          onClick={() => setTanya("PERLU_TINDAK_LANJUT")}
        >
          {v.lanjutTombol}
        </button>
      </div>

      {/* Rupa dibedakan: sukses untuk yang sesuai, tanya untuk yang bercatatan
          kerusakan, jadi bobot keputusannya terbaca sebelum kalimatnya dibaca. */}
      <ModalKonfirmasi
        terbuka={tanya !== null}
        rupa={sesuai ? "sukses" : "tanya"}
        judul={(sesuai ? v.tanyaSesuaiJudul : v.tanyaLanjutJudul).replace("{kode}", kode)}
        labelBatal={t.umum.batal}
        onBatal={() => setTanya(null)}
        lanjut={
          // Form sendiri di dalam modal. Catatan dan pilihan hasilnya dibawa
          // sebagai input tersembunyi, jadi tidak ada form bersarang dan tidak
          // bergantung pada perilaku <dialog> yang hidup di top layer.
          <form action={kirim} onSubmit={() => setTanya(null)}>
            <input type="hidden" name="pengajuanId" value={pengajuanId} />
            <input type="hidden" name="catatan" value={catatan} />
            <input type="hidden" name="hasil" value={tanya ?? "SESUAI"} />
            <TombolKirim
              className={sesuai ? "btn btn-primary" : "btn btn-danger"}
              sedang={v.menutup}
            >
              {sesuai ? v.tanyaSesuaiLanjut : v.tanyaLanjutLanjut}
            </TombolKirim>
          </form>
        }
      >
        {sesuai ? v.tanyaSesuaiIsi : v.tanyaLanjutIsi}
      </ModalKonfirmasi>
    </>
  );
}
