import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { wajibLogin } from "@/lib/auth";
import { fmtWaktu } from "@/lib/waktu";
import { teks } from "@/lib/preferensi-server";
import { tampilkanNotif } from "@/lib/pesan-notifikasi";
import { bukaNotifikasi, tandaiDibaca } from "../aksi-notifikasi";

export async function generateMetadata(): Promise<Metadata> {
  const t = await teks();
  return { title: t.judul.notifikasi[0] };
}

export default async function Notifikasi() {
  const user = await wajibLogin();
  const t = await teks();

  const [daftar, belumDibaca] = await Promise.all([
    prisma.notifikasi.findMany({
      where: { userId: user.id },
      orderBy: { dibuatPada: "desc" },
      take: 100,
    }),
    prisma.notifikasi.count({
      where: { userId: user.id, jenis: "IN_APP", dibaca: false },
    }),
  ]);

  return (
    <div className="anim-rise flex flex-col" style={{ gap: "var(--space-3)", maxWidth: 760 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <p style={{ fontSize: 13, color: "var(--color-neutral-700)", margin: 0, flex: 1 }}>
          {t.notif.penjelasan}
        </p>
        {belumDibaca > 0 && (
          <form action={tandaiDibaca}>
            <button type="submit" className="btn btn-secondary" style={{ fontSize: 12.5 }}>
              {t.shell.tandaiSemua}
            </button>
          </form>
        )}
      </div>

      {daftar.map((n) => {
        const email = n.jenis === "EMAIL";
        const gagal = n.statusKirim === "GAGAL";
        // Keadaan ketiga: baris email yang tercatat tapi belum benar benar
        // terkirim, misalnya karena kunci API belum diisi. Dulu keadaan ini
        // tidak ada dan diam diam terlihat seperti berhasil.
        const tertunda = n.statusKirim === "TERTUNDA";
        const pesan = tampilkanNotif(n, t);
        return (
          <div
            key={n.id}
            className="card elev-sm"
            style={{
              background: "var(--color-neutral-100)",
              gap: 6,
              borderLeft: `3px solid ${
                gagal
                  ? "var(--color-danger-600)"
                  : tertunda
                    ? "var(--color-warn-600)"
                    : n.dibaca
                      ? "var(--color-neutral-300)"
                      : "var(--color-accent-600)"
              }`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span
                className="tag"
                style={{
                  fontWeight: 600,
                  background: email
                    ? "var(--color-accent-2-100)"
                    : "var(--color-neutral-200)",
                  color: email
                    ? "var(--color-accent-2-800)"
                    : "var(--color-neutral-800)",
                }}
              >
                {email ? t.notif.email : t.notif.dalamAplikasi}
              </span>
              {gagal && (
                <span
                  className="tag"
                  style={{
                    fontWeight: 600,
                    background: "var(--color-danger-700)",
                    color: "var(--color-di-atas-solid)",
                  }}
                >
                  {t.notif.gagalTerkirim}
                </span>
              )}
              {tertunda && (
                <span
                  className="tag"
                  style={{
                    fontWeight: 600,
                    background: "var(--color-warn-300)",
                    color: "var(--color-warn-900)",
                  }}
                >
                  {t.notif.tertunda}
                </span>
              )}
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: 11,
                  color: "var(--color-neutral-600)",
                }}
              >
                {fmtWaktu(n.dibuatPada, t)}
              </span>
            </div>

            <div style={{ fontSize: 14, fontWeight: n.dibaca ? 600 : 700 }}>{pesan.judul}</div>
            <div style={{ fontSize: 13, color: "var(--color-neutral-800)" }}>{pesan.isi}</div>

            {/* Alasan gagal ditampilkan apa adanya, supaya kegagalan kirim
                bukan misteri yang cuma kelihatan di log server. */}
            {/* Alasan ditampilkan apa adanya untuk gagal MAUPUN tertunda,
                supaya kenapa emailnya tidak sampai bukan misteri yang cuma
                kelihatan di log server. */}
            {n.errorKirim && (
              <div
                style={{
                  fontSize: 11.5,
                  padding: "8px 10px",
                  borderRadius: "var(--radius-md)",
                  background: gagal
                    ? "var(--color-danger-200)"
                    : tertunda
                      ? "var(--color-warn-200)"
                      : "var(--color-neutral-200)",
                  color: gagal
                    ? "var(--color-danger-900)"
                    : tertunda
                      ? "var(--color-warn-900)"
                      : "var(--color-neutral-800)",
                }}
              >
                {gagal ? t.notif.alasan : t.notif.keterangan}: {n.errorKirim}
              </div>
            )}

            {n.tautan && (
              <form action={bukaNotifikasi} style={{ marginTop: 2 }}>
                <input type="hidden" name="id" value={n.id} />
                <button type="submit" className="btn btn-secondary" style={{ fontSize: 12.5 }}>
                  {t.notif.buka}
                </button>
              </form>
            )}

            {/* Yang tanpa tautan tetap bisa ditandai terbaca satu per satu. */}
            {!n.tautan && !n.dibaca && (
              <form action={bukaNotifikasi} style={{ marginTop: 2 }}>
                <input type="hidden" name="id" value={n.id} />
                <button type="submit" className="btn btn-secondary" style={{ fontSize: 12.5 }}>
                  {t.notif.tandaiSatu}
                </button>
              </form>
            )}
          </div>
        );
      })}

      {daftar.length === 0 && (
        <div
          className="card"
          style={{
            alignItems: "center", textAlign: "center",
            padding: "var(--space-8)", background: "var(--color-neutral-100)",
          }}
        >
          <div style={{ fontFamily: "var(--font-heading)", fontSize: 16 }}>
            {t.notif.kosong}
          </div>
          <p style={{ fontSize: 12.5, color: "var(--color-neutral-700)", margin: "4px 0 0", maxWidth: "34ch" }}>
            {t.notif.kosongIsi}
          </p>
        </div>
      )}
    </div>
  );
}
