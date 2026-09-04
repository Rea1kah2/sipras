import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";

/**
 * Membuat SATU akun admin di basis data produksi. Tidak ada data fiktif
 * apa pun, beda dengan prisma/seed.ts yang mengisi puluhan pengajuan dan
 * pengguna contoh untuk demo.
 *
 * Pakai:
 *   npx tsx -r dotenv/config prisma/buat-admin-produksi.ts "Nama Admin" admin@sekolah.sch.id "kata-sandi"
 */

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL belum diisi di .env");

// Tanda "--" dibuang kalau ada. Ia WAJIB dipakai lewat `npm run` supaya npm
// meneruskan argumennya, tapi jadi argumen biasa kalau dipanggil lewat npx.
// Tanpa baris ini, memanggil dengan "--" menggeser semuanya satu langkah dan
// membuat akun bernama "--" beralamat surel "Nama Admin". Sudah pernah
// terjadi, dan diamnya kegagalan itu yang berbahaya: skripnya melapor sukses.
const argumen = process.argv.slice(2).filter((a) => a !== "--");

const [nama, email, sandi] = argumen;
if (!nama || !email || !sandi) {
  console.error(
    'Pakai: npx tsx -r dotenv/config prisma/buat-admin-produksi.ts "Nama Admin" admin@sekolah.sch.id "kata-sandi"'
  );
  process.exit(1);
}
if (!email.includes("@")) {
  console.error(`"${email}" bukan alamat surel. Urutannya: nama, email, kata sandi.`);
  process.exit(1);
}
if (sandi.length < 8) {
  console.error("Kata sandi minimal 8 karakter.");
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  const sudahAda = await prisma.user.findUnique({ where: { email } });
  if (sudahAda) {
    console.error(`Email ${email} sudah terdaftar (peran: ${sudahAda.peran}). Tidak ada yang dibuat.`);
    process.exit(1);
  }

  const admin = await prisma.user.create({
    data: {
      nama,
      email,
      password: await hash(sandi, 10),
      peran: "ADMIN",
    },
  });

  console.log(`Admin dibuat: ${admin.nama} <${admin.email}>`);
  console.log("Segera ganti kata sandinya sendiri dari halaman profil setelah masuk pertama kali.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
