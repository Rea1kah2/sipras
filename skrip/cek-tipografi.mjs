/**
 * Pagar tipografi: gagal kalau ada em dash atau en dash yang lolos masuk.
 * Aturan gaya jadi sesuatu yang bisa diperiksa mesin, bukan sekadar niat baik.
 *
 * Jalankan: npm run cek:tipografi
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const AKAR = join(fileURLToPath(import.meta.url), "..", "..");
const PERIKSA = ["src", "prisma"];
const EKSTENSI = [".ts", ".tsx", ".css", ".prisma", ".md"];

/**
 * Berkas di akar proyek yang tidak tertangkap penelusuran direktori di atas,
 * tapi tetap dibaca orang. `.env.example` sempat menyimpan dua em dash tanpa
 * ketahuan justru karena ekstensinya tidak cocok dengan satu pun di EKSTENSI,
 * padahal itu berkas pertama yang dibuka orang saat menyiapkan deploy.
 */
const BERKAS_AKAR = [".env.example", "README.md"];

// Hasil generate Prisma ditimpa tiap `prisma generate`, jadi percuma diperbaiki.
const LEWATI = ["src/generated", "node_modules", ".next"];

const TERLARANG = [
  { karakter: "—", nama: "em dash" },
  { karakter: "–", nama: "en dash" },
];

function* berkas(dir) {
  for (const nama of readdirSync(dir)) {
    const jalur = join(dir, nama);
    const rel = relative(AKAR, jalur);
    if (LEWATI.some((l) => rel.startsWith(l))) continue;
    if (statSync(jalur).isDirectory()) yield* berkas(jalur);
    else if (EKSTENSI.some((e) => nama.endsWith(e))) yield jalur;
  }
}

const temuan = [];

function periksa(jalur) {
  const baris = readFileSync(jalur, "utf8").split("\n");
  baris.forEach((isi, i) => {
    for (const { karakter, nama } of TERLARANG) {
      if (isi.includes(karakter)) {
        temuan.push({ jalur: relative(AKAR, jalur), baris: i + 1, nama, isi: isi.trim() });
      }
    }
  });
}

for (const dir of PERIKSA) {
  for (const jalur of berkas(join(AKAR, dir))) periksa(jalur);
}
for (const nama of BERKAS_AKAR) {
  const jalur = join(AKAR, nama);
  if (existsSync(jalur)) periksa(jalur);
}

if (temuan.length === 0) {
  console.log("Tipografi bersih: tidak ada em dash atau en dash.");
  process.exit(0);
}

console.error(`Ditemukan ${temuan.length} pemakaian tanda yang dilarang:\n`);
for (const t of temuan) {
  console.error(`  ${t.jalur}:${t.baris}  (${t.nama})`);
  console.error(`    ${t.isi.slice(0, 100)}`);
}
console.error("\nTulis ulang kalimatnya, jangan sekadar menukar karakternya.");
console.error("Sisipan penjelas jadi koma. Label dan nilai jadi titik dua.");
console.error("Rentang dan nilai kosong pakai tanda hubung biasa.");
process.exit(1);
