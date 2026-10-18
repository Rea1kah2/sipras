import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { penggunaSaatIni } from "@/lib/auth";
import { ModalSambutan } from "@/components/modal-sambutan";
import { AuthShell } from "@/components/auth-shell";
import { bacaPreferensi, teks } from "@/lib/preferensi-server";
import { kamus } from "@/lib/kamus";
import { FormMasuk } from "./form-masuk";

export async function generateMetadata(): Promise<Metadata> {
  const t = await teks();
  return { title: t.masuk.kartuJudul };
}

export default async function HalamanMasuk() {
  const user = await penggunaSaatIni();
  if (user) redirect(user.peran === "ADMIN" ? "/admin" : "/dasbor");

  const { tema, bahasa } = await bacaPreferensi();
  const t = kamus(bahasa);
  return (
    <AuthShell tema={tema} bahasa={bahasa} t={t}>
      <ModalSambutan />
      <FormMasuk />
    </AuthShell>
  );
}
