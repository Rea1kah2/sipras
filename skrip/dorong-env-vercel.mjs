/**
 * Mendorong variabel lingkungan dari .env lokal ke proyek Vercel.
 *
 * KENAPA ADA. Menyalin sembilan variabel satu per satu lewat dashboard sudah
 * gagal dua kali: pertama DATABASE_URL, lalu SESSION_SECRET. Keduanya baru
 * ketahuan setelah situsnya error di depan pengguna. Yang salah bukan
 * nilainya, tapi prosesnya: menyalin manual tanpa daftar hampir pasti ada
 * yang terlewat, dan tidak ada yang memberi tahu kalau ada yang kurang.
 *
 * Skrip ini membalik keadaannya. Daftarnya dibaca dari berkas, bukan dari
 * ingatan, dan tiap variabel yang SENGAJA tidak didorong tetap dicetak
 * beserta alasannya, supaya yang dilewati terlihat, bukan hilang diam diam.
 *
 * Pakai:
 *   npx vercel login     (sekali saja)
 *   npx vercel link      (sekali saja, sambungkan folder ini ke proyeknya)
 *   npm run env:dorong
 */
import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const LINGKUNGAN = ["production", "preview", "development"];

/**
 * Variabel yang TIDAK boleh disalin apa adanya dari .env lokal.
 * Alasannya ikut dicetak, karena "dilewati" tanpa alasan sama saja dengan
 * hilang tanpa jejak, dan itu justru kelas kesalahan yang mau ditutup.
 */
const JANGAN_SALIN = {
  DATABASE_URL:
    "sudah diisi otomatis oleh integrasi Postgres di Vercel, menimpanya merusak sambungan",
  POSTGRES_URL: "ikut disediakan integrasi Postgres",
  PRISMA_DATABASE_URL: "ikut disediakan integrasi Postgres",
  BLOB_READ_WRITE_TOKEN:
    "sudah diisi otomatis oleh integrasi Blob di Vercel, menimpanya merusak unggah foto",
};

/**
 * Variabel yang nilainya di produksi MEMANG beda dari lokal, jadi harus
 * ditanyakan, bukan disalin. Menyalinnya diam diam justru menghasilkan bug
 * yang tidak terlihat sebagai bug.
 */
const TANYA_ULANG = {
  NEXT_PUBLIC_APP_URL:
    "di lokal berisi localhost. Kalau disalin, tombol di dalam email menunjuk ke laptopmu, bukan ke situsnya",
  EMAIL_UJI_KE:
    "kalau diisi, SEMUA email dialihkan ke alamat itu dan guru tidak akan pernah menerima notifikasi. Kosongkan untuk produksi sungguhan",
};

function bacaEnv(jalur) {
  if (!existsSync(jalur)) {
    console.error(`Berkas ${jalur} tidak ada. Jalankan skrip ini dari akar proyek.`);
    process.exit(1);
  }
  const hasil = new Map();
  for (const baris of readFileSync(jalur, "utf8").split("\n")) {
    const bersih = baris.trim();
    if (!bersih || bersih.startsWith("#")) continue;
    const pisah = bersih.indexOf("=");
    if (pisah === -1) continue;
    const nama = bersih.slice(0, pisah).trim();
    let nilai = bersih.slice(pisah + 1).trim();
    // Tanda kutip pembungkus dibuang. Kalau ikut terkirim, nilainya sampai
    // ke server lengkap dengan kutipnya dan gagal dengan cara yang
    // membingungkan, misalnya token yang terlihat benar tapi selalu ditolak.
    if (
      (nilai.startsWith('"') && nilai.endsWith('"')) ||
      (nilai.startsWith("'") && nilai.endsWith("'"))
    ) {
      nilai = nilai.slice(1, -1);
    }
    hasil.set(nama, nilai);
  }
  return hasil;
}

function sudahTersambung() {
  return existsSync(".vercel/project.json");
}

/** Satu variabel, satu lingkungan. Nilai dikirim lewat stdin, bukan argumen,
 *  supaya tidak tercatat di riwayat shell. */
function dorong(nama, nilai, lingkungan) {
  const r = spawnSync(
    "npx",
    ["vercel", "env", "add", nama, lingkungan, "--force"],
    { input: nilai, encoding: "utf8" }
  );
  return { ok: r.status === 0, pesan: (r.stderr || r.stdout || "").trim() };
}

async function main() {
  // Skrip ini bertanya, jadi butuh terminal sungguhan. Tanpa penjaga ini,
  // dijalankan lewat pipe atau CI ia berhenti diam diam saat stdin habis,
  // TIDAK mendorong apa pun, dan tetap keluar dengan kode 0 seolah berhasil.
  // Ketahuan saat menguji skrip ini sendiri.
  if (!stdin.isTTY) {
    console.error(
      "Skrip ini perlu terminal interaktif karena menanyakan dua nilai.\n" +
        "Jalankan langsung di terminal, jangan lewat pipe atau skrip lain."
    );
    process.exit(1);
  }

  if (!sudahTersambung()) {
    console.error(
      "Folder ini belum tersambung ke proyek Vercel.\n" +
        "Jalankan dua perintah ini dulu, masing masing sekali saja:\n\n" +
        "  npx vercel login\n" +
        "  npx vercel link\n"
    );
    process.exit(1);
  }

  const env = bacaEnv(".env");
  const rl = createInterface({ input: stdin, output: stdout });

  const akanDidorong = new Map();
  const dilewati = [];

  for (const [nama, nilai] of env) {
    if (nama in JANGAN_SALIN) {
      dilewati.push([nama, JANGAN_SALIN[nama]]);
      continue;
    }
    if (nama in TANYA_ULANG) continue; // ditangani setelah ini
    if (!nilai) {
      dilewati.push([nama, "nilainya kosong di .env lokal"]);
      continue;
    }
    akanDidorong.set(nama, nilai);
  }

  console.log("\nDILEWATI, dan ini disengaja:");
  for (const [nama, alasan] of dilewati) console.log(`  ${nama}\n    ${alasan}`);

  console.log("\nPERLU NILAI BARU, beda dari lokal:");
  for (const [nama, alasan] of Object.entries(TANYA_ULANG)) {
    if (!env.has(nama)) continue;
    console.log(`\n  ${nama}`);
    console.log(`    ${alasan}`);
    console.log(`    nilai di lokal sekarang: ${env.get(nama) || "(kosong)"}`);
    const jawab = await rl.question("    nilai untuk produksi (Enter = kosongkan): ");
    if (jawab.trim()) akanDidorong.set(nama, jawab.trim());
    else console.log("    dikosongkan.");
  }

  console.log(`\nAKAN DIDORONG (${akanDidorong.size} variabel):`);
  for (const nama of akanDidorong.keys()) console.log(`  ${nama}`);

  const lanjut = await rl.question("\nLanjutkan? (y/n) ");
  rl.close();
  if (lanjut.trim().toLowerCase() !== "y") {
    console.log("Dibatalkan, tidak ada yang diubah.");
    return;
  }

  let berhasil = 0;
  let gagal = 0;
  for (const [nama, nilai] of akanDidorong) {
    for (const ling of LINGKUNGAN) {
      const r = dorong(nama, nilai, ling);
      if (r.ok) {
        berhasil++;
      } else {
        gagal++;
        console.error(`  GAGAL ${nama} (${ling}): ${r.pesan.split("\n")[0]}`);
      }
    }
    console.log(`  ${nama} selesai`);
  }

  console.log(`\n${berhasil} berhasil, ${gagal} gagal.`);
  if (gagal > 0) process.exitCode = 1;
  else {
    console.log(
      "\nVariabel baru TIDAK otomatis dipakai deployment yang sudah ada.\n" +
        "Buka tab Deployments di Vercel, klik titik tiga di deployment teratas,\n" +
        "pilih Redeploy, dan JANGAN centang Use existing Build Cache."
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
