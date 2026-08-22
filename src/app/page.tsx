import { redirect } from "next/navigation";
import { penggunaSaatIni } from "@/lib/auth";

export default async function Beranda() {
  const user = await penggunaSaatIni();
  if (!user) redirect("/masuk");
  redirect(user.peran === "ADMIN" ? "/admin" : "/dasbor");
}
