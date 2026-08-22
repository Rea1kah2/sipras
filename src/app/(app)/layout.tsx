import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { inisial, wajibLogin } from "@/lib/auth";
import { navUntuk } from "@/lib/navigasi";
import { bacaPreferensi } from "@/lib/preferensi-server";
import { kamus } from "@/lib/kamus";
import { tampilkanNotif } from "@/lib/pesan-notifikasi";
import { fmtWaktu } from "@/lib/waktu";
import { Shell } from "@/components/shell";
import { Footer } from "@/components/footer";
import { ModalSambutan } from "@/components/modal-sambutan";
import { aksiKeluar } from "../(auth)/aksi";
import { tandaiDibaca, tandaiSatuDibaca } from "./aksi-notifikasi";
import { simpanBahasa } from "./aksi-preferensi";

export default async function LayoutAplikasi({
  children,
}: LayoutProps<"/">) {
  const user = await wajibLogin();
  const admin = user.peran === "ADMIN";

  // Preferensi sidebar dibaca di server supaya render pertama sudah benar
  // dan tidak berkedip dari terbuka ke tertutup. Default terbuka.
  const jar = await cookies();
  const sidebarAwal = jar.get("sipras_sidebar")?.value !== "tutup";

  const { tema, bahasa } = await bacaPreferensi();
  const t = kamus(bahasa);

  const [notif, belumDibaca, lencana] = await Promise.all([
    prisma.notifikasi.findMany({
      where: { userId: user.id, jenis: "IN_APP" },
      orderBy: { dibuatPada: "desc" },
      take: 8,
      select: {
        id: true, judul: true, isi: true, kunci: true, data: true,
        tautan: true, dibaca: true, dibuatPada: true,
      },
    }),
    prisma.notifikasi.count({
      where: { userId: user.id, jenis: "IN_APP", dibaca: false },
    }),
    hitungLencana(user.id, admin),
  ]);

  return (
    <Shell
      nama={user.nama}
      inisial={inisial(user.nama)}
      peranLabel={admin ? t.peran.admin : t.peran.peminjam}
      brand={t.merek.nama}
      items={navUntuk(user.peran, t)}
      lencana={lencana}
      notif={notif.map((n) => ({
        id: n.id,
        // Dirender di server dengan kamus pembacanya, jadi lonceng cukup
        // menerima kalimat yang sudah jadi dan tidak perlu tahu soal kunci.
        ...tampilkanNotif(n, t),
        tautan: n.tautan,
        dibaca: n.dibaca,
        waktu: fmtWaktu(n.dibuatPada, t),
      }))}
      belumDibaca={belumDibaca}
      sidebarAwal={sidebarAwal}
      keluar={aksiKeluar}
      tandaiDibaca={tandaiDibaca}
      tandaiSatu={tandaiSatuDibaca}
      simpanBahasa={simpanBahasa}
      t={t}
      tema={tema}
      bahasa={bahasa}
      footer={<Footer peran={user.peran} t={t} />}
    >
      <ModalSambutan nama={user.nama} />
      {children}
    </Shell>
  );
}

/** Angka kecil di samping menu: antrean kerja yang menunggu orang ini. */
async function hitungLencana(
  userId: string,
  admin: boolean
): Promise<Record<string, number>> {
  if (admin) {
    const [review, verifikasi] = await Promise.all([
      prisma.pengajuan.count({ where: { status: "MENUNGGU" } }),
      prisma.pengajuan.count({ where: { status: "DIKEMBALIKAN" } }),
    ]);
    return { "/admin/review": review, "/admin/verifikasi": verifikasi };
  }

  // Lencana peminjam adalah penanda KABAR BARU, bukan jumlah pengajuan aktif.
  // Dulu ia menghitung semua pengajuan berjalan, jadi wajar tidak pernah
  // hilang walau kartunya sudah dibuka: memang tidak dirancang untuk hilang.
  //
  // Sekarang yang dihitung adalah pengajuan yang statusnya berpindah setelah
  // terakhir kali peminjam membuka rinciannya. Pembandingnya waktu di
  // RiwayatStatus, bukan diubahPada, karena diubahPada bertanda @updatedAt
  // sehingga ikut berubah saat kita menulis dilihatPada itu sendiri.
  // Membandingkan dua kolom lintas relasi tidak didukung Prisma, jadi
  // perbandingannya dilakukan di aplikasi. Aman karena satu peminjam hanya
  // punya segelintir pengajuan, dan yang diambil cuma dua kolom waktu.
  const daftar = await prisma.pengajuan.findMany({
    where: { pemohonId: userId },
    select: {
      dilihatPada: true,
      riwayatStatus: {
        orderBy: { waktu: "desc" },
        take: 1,
        select: { waktu: true },
      },
    },
  });

  const belumDilihat = daftar.filter((p) => {
    const terakhir = p.riwayatStatus[0]?.waktu;
    if (!terakhir) return false;
    return !p.dilihatPada || terakhir > p.dilihatPada;
  }).length;

  return { "/pengajuan": belumDilihat };
}
