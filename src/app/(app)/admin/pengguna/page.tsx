import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { teks } from "@/lib/preferensi-server";
import { inisial, wajibAdmin } from "@/lib/auth";
import { fmtTanggal } from "@/lib/waktu";
import { AksiPengguna, type Pengguna } from "./baris-pengguna";
import type { Peran } from "@/generated/prisma/enums";

export async function generateMetadata(): Promise<Metadata> {
  const t = await teks();
  return { title: t.judul.adminPengguna[0] };
}

export default async function KelolaPengguna(props: PageProps<"/admin/pengguna">) {
  const admin = await wajibAdmin();
  const t = await teks();
  const sp = (await props.searchParams) as { q?: string; peran?: string };

  const q = (sp.q ?? "").trim();
  const peran = sp.peran === "ADMIN" || sp.peran === "PEMINJAM" ? sp.peran : "SEMUA";

  const daftar = await prisma.user.findMany({
    where: {
      ...(peran !== "SEMUA" ? { peran: peran as Peran } : {}),
      ...(q
        ? {
            OR: [
              { nama: { contains: q, mode: "insensitive" as const } },
              { email: { contains: q, mode: "insensitive" as const } },
              { unit: { contains: q, mode: "insensitive" as const } },
              { identitas: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    orderBy: [{ peran: "asc" }, { aktif: "desc" }, { nama: "asc" }],
    select: {
      id: true, nama: true, email: true, identitas: true, unit: true,
      whatsapp: true, peran: true, aktif: true, dibuatPada: true,
      _count: { select: { pengajuan: true } },
    },
  });

  const jumlahAdminAktif = await prisma.user.count({
    where: { peran: "ADMIN", aktif: true },
  });

  const rows: Pengguna[] = daftar.map((u) => ({
    id: u.id,
    nama: u.nama,
    email: u.email,
    identitas: u.identitas,
    unit: u.unit,
    whatsapp: u.whatsapp,
    peran: u.peran,
    aktif: u.aktif,
    jumlahPengajuan: u._count.pengajuan,
    diriSendiri: u.id === admin.id,
  }));

  return (
    <div className="anim-rise flex flex-col" style={{ gap: "var(--space-3)" }}>
      {jumlahAdminAktif === 1 && (
        <div
          style={{
            padding: "11px 13px",
            borderRadius: "var(--radius-md)",
            background: "var(--color-warn-200)",
            color: "var(--color-warn-900)",
            fontSize: 12.5,
          }}
        >
          {t.penggunaHal.peringatanSatuAdmin}
        </div>
      )}

      <form
        method="GET"
        action="/admin/pengguna"
        style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)", alignItems: "flex-end" }}
      >
        <div className="field" style={{ flex: "1 1 220px", minWidth: 0 }}>
          <label htmlFor="q">{t.penggunaHal.cari}</label>
          <input
            id="q"
            name="q"
            className="input"
            defaultValue={q}
            placeholder={t.penggunaHal.cariContoh}
          />
        </div>
        <div className="seg" style={{ flex: "none" }}>
          {(["SEMUA", "PEMINJAM", "ADMIN"] as const).map((p) => (
            <label key={p} className="seg-opt">
              <input
                type="radio"
                name="peran"
                value={p === "SEMUA" ? "" : p}
                defaultChecked={peran === p}
              />
              {p === "SEMUA" ? "SEMUA" : p === "ADMIN" ? "Admin" : t.peran.peminjam}
            </label>
          ))}
        </div>
        <button type="submit" className="btn btn-secondary">
          {t.umum.terapkan}
        </button>
      </form>

      <div
        className="card elev-sm table-wrap"
        style={{ padding: "var(--space-2) var(--space-3)", background: "var(--color-neutral-100)" }}
      >
        <table className="table">
          <thead>
            <tr>
              <th>{t.penggunaHal.kolomNama}</th>
              <th>{t.penggunaHal.kolomUnit}</th>
              <th>{t.penggunaHal.kolomPeran}</th>
              <th>{t.penggunaHal.kolomPengajuan}</th>
              <th>{t.penggunaHal.kolomBergabung}</th>
              <th style={{ textAlign: "right" }}>{t.penggunaHal.kolomAksi}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u, i) => (
              <tr key={u.id} style={{ opacity: u.aktif ? 1 : 0.55 }}>
                <td style={{ minWidth: 200 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <span
                      aria-hidden
                      style={{
                        width: 30, height: 30, borderRadius: "50%", flex: "none",
                        background: "var(--color-neutral-300)",
                        display: "grid", placeItems: "center",
                        fontSize: 11.5, fontWeight: 700,
                        color: "var(--color-neutral-900)",
                      }}
                    >
                      {inisial(u.nama)}
                    </span>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ fontWeight: 600, display: "block" }}>
                        {u.nama}
                        {u.diriSendiri && (
                          <span
                            className="tag tag-neutral"
                            style={{ marginLeft: 6, fontWeight: 600 }}
                          >
                            {t.penggunaHal.kamu}
                          </span>
                        )}
                        {!u.aktif && (
                          <span
                            className="tag"
                            style={{
                              marginLeft: 6, fontWeight: 600,
                              background: "var(--color-danger-700)",
                              color: "var(--color-di-atas-solid)",
                            }}
                          >
                            {t.penggunaHal.nonaktif}
                          </span>
                        )}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          color: "var(--color-neutral-600)",
                          wordBreak: "break-all",
                        }}
                      >
                        {u.email}
                      </span>
                    </span>
                  </div>
                </td>
                <td style={{ minWidth: 130 }}>
                  <div>{u.unit ?? "-"}</div>
                  <div style={{ fontSize: 11, color: "var(--color-neutral-600)" }}>
                    {u.identitas ?? "-"}
                  </div>
                </td>
                <td>
                  <span
                    className="tag"
                    style={{
                      fontWeight: 600,
                      background:
                        u.peran === "ADMIN"
                          ? "var(--color-accent-200)"
                          : "var(--color-neutral-200)",
                      color:
                        u.peran === "ADMIN"
                          ? "var(--color-accent-800)"
                          : "var(--color-neutral-800)",
                    }}
                  >
                    {u.peran === "ADMIN" ? t.peran.admin : t.peran.peminjam}
                  </span>
                </td>
                <td style={{ whiteSpace: "nowrap" }}>{u.jumlahPengajuan}</td>
                <td style={{ whiteSpace: "nowrap" }}>{fmtTanggal(daftar[i].dibuatPada, t)}</td>
                <td>
                  <AksiPengguna u={u} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ fontSize: 11.5, color: "var(--color-neutral-600)" }}>
        {t.penggunaHal.catatanKaki.replace("{n}", String(rows.length))}
      </div>

      {rows.length === 0 && (
        <div
          className="card"
          style={{
            alignItems: "center", textAlign: "center",
            padding: "var(--space-8)", background: "var(--color-neutral-100)",
          }}
        >
          <div style={{ fontFamily: "var(--font-heading)", fontSize: 16 }}>
            {t.penggunaHal.kosong}
          </div>
          <p style={{ fontSize: 12.5, color: "var(--color-neutral-700)", margin: "4px 0 10px", maxWidth: "34ch" }}>
            {t.penggunaHal.kosongIsi}
          </p>
          <Link href="/admin/pengguna" className="btn btn-secondary">
            {t.umum.hapusFilter}
          </Link>
        </div>
      )}
    </div>
  );
}
