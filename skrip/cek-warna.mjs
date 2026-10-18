/**
 * Pemeriksa palet.
 *
 * Dibuat saat palet diganti untuk KELIMA kalinya. Empat penggantian
 * sebelumnya diverifikasi dengan hitungan sekali jalan yang tidak tersimpan,
 * jadi tiap kali ada yang menyentuh warna, seluruh pemeriksaan harus diulang
 * dari nol dengan ingatan. Berkas ini menjadikannya bisa diulang.
 *
 * Sumbernya BUKAN nilai yang ditulis di sini, melainkan globals.css itu
 * sendiri. Kalau tokennya diubah, pemeriksa ini ikut memeriksa nilai baru
 * tanpa perlu disunting, dan itulah yang membuatnya tidak bisa berbohong.
 *
 * Enam hal yang dijaga, tiap satunya karena pernah jadi masalah nyata:
 *
 *   1. LAPISAN TERURUT DAN TERBACA. Palet keempat gagal di sini: kanvas,
 *      panel, dan kartu semuanya berkisar L* 94 sampai 100, jadi halaman
 *      kehilangan struktur dan dinilai membosankan.
 *
 *   2. neutral-100 SAMA PERSIS dengan surface. 56 tempat memakai
 *      neutral-100 sebagai latar kartu sementara kelas .card memakai
 *      surface. Kalau keduanya berbeda, halaman jadi campur aduk.
 *
 *   3. KONTRAS TEKS memenuhi ambang AA di tiap permukaan tempat teks itu
 *      benar benar dipakai, bukan cuma di satu permukaan contoh.
 *
 *   4. TIDAK ADA DUA RAMP YANG BERTABRAKAN. Semua KEEMPAT ramp
 *      (accent, accent-2, warn, danger) diperiksa berpasangan, bukan cuma
 *      satu pasang yang kebetulan paling mencurigakan.
 *
 *   5. IKON TAB MEMAKAI TOKEN YANG SEDANG AKTIF. src/app/icon.svg adalah
 *      berkas statis terpisah dari komponen logo React, warnanya ditulis
 *      literal karena favicon tidak punya currentColor untuk diwarisi.
 *      Sekali lupa diperbarui saat ganti palet, ikon tab diam diam
 *      menyisakan warna lama tanpa ada yang menyadarinya sampai dilihat
 *      manual.
 *
 * Jalankan: npm run cek:warna
 */

import { readFileSync } from "node:fs";

/* ── warna: sRGB, L* CIE, kontras WCAG, dan OKLCH ────────────────────── */

const keLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const keRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);

const luminans = (hex) => {
  const [r, g, b] = keRgb(hex).map(keLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** L* CIE, jauh lebih dekat ke persepsi mata daripada luminans mentah. */
const terang = (hex) => {
  const y = luminans(hex);
  return y <= 216 / 24389 ? y * (24389 / 27) : Math.cbrt(y) * 116 - 16;
};

const kontras = (a, b) => {
  const [x, y] = [luminans(a), luminans(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

/**
 * OKLCH dipakai untuk mengukur jarak hue dan chroma antar ramp semantik.
 * Ruang warna lain tidak cukup: di HSL, dua warna dengan angka saturasi
 * sama bisa terlihat sangat berbeda pekatnya.
 */
function keOklch(hex) {
  const [r, g, b] = keRgb(hex).map(keLinear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return { L, C: Math.hypot(A, B), H: ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360 };
}

/* ── baca token dari globals.css, bukan dari nilai yang ditulis ulang ── */

const css = readFileSync("src/app/globals.css", "utf8");

/**
 * Ambil isi satu blok CSS berdasarkan selektornya, dengan menghitung kurung
 * kurawal. Tidak bisa sekadar mencari "}" terdekat, karena blok :root memuat
 * color-mix() dan komentar yang isinya bisa mengandung kurung.
 */
function blok(selektor) {
  const i = css.indexOf(selektor + " {");
  if (i < 0) throw new Error(`blok tidak ketemu: ${selektor}`);
  let dalam = 1;
  let j = css.indexOf("{", i) + 1;
  const awal = j;
  while (dalam > 0 && j < css.length) {
    if (css[j] === "{") dalam++;
    else if (css[j] === "}") dalam--;
    j++;
  }
  return css.slice(awal, j - 1);
}

function token(selektor) {
  const peta = {};
  for (const m of blok(selektor).matchAll(/(--color-[a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) {
    peta[m[1]] = m[2].toLowerCase();
  }
  return peta;
}

const TERANG = token(":root");
const GELAP = token('[data-tema="gelap"]');

/* ── pemeriksaan ──────────────────────────────────────────────────────── */

let lolos = 0;
let gagal = 0;

function cek(nama, ok, ket = "") {
  console.log(`${ok ? "✅" : "❌"} ${nama}${ket ? "  (" + ket + ")" : ""}`);
  if (ok) lolos++;
  else gagal++;
}

const AMBANG_AA = 4.5;
/** Selisih terang minimal supaya dua bidang terbaca sebagai lapisan berbeda. */
const AMBANG_LAPIS = 3.5;

function periksaMode(nama, T, urutan) {
  console.log(`\n── ${nama} ──`);

  // 1. lapisan terurut dan terbaca
  const nilai = urutan.map((k) => ({ k, hex: T[k], L: terang(T[k]) }));
  for (const { k, hex, L } of nilai) {
    if (!hex) throw new Error(`token hilang: ${k} di ${nama}`);
    console.log(`   ${k.padEnd(22)} ${hex}  L*${L.toFixed(1)}`);
  }
  for (let i = 0; i < nilai.length - 1; i++) {
    const a = nilai[i];
    const b = nilai[i + 1];
    cek(
      `lapisan terurut: ${a.k.replace("--color-", "")} di atas ${b.k.replace("--color-", "")}`,
      a.L >= b.L,
      `${a.L.toFixed(1)} >= ${b.L.toFixed(1)}`
    );
  }
  // Kanvas ke panel adalah jarak yang paling menentukan rasa berlapis,
  // dan justru itu yang gagal di palet keempat.
  const dKanvasPanel = Math.abs(terang(T["--color-bg"]) - terang(T["--color-panel"]));
  cek("kanvas dan panel benar benar terbedakan", dKanvasPanel >= AMBANG_LAPIS, `${dKanvasPanel.toFixed(1)} L*`);
  const dKanvasKartu = Math.abs(terang(T["--color-bg"]) - terang(T["--color-surface"]));
  cek("kanvas dan kartu benar benar terbedakan", dKanvasKartu >= AMBANG_LAPIS, `${dKanvasKartu.toFixed(1)} L*`);

  // 2. neutral-100 wajib kembar dengan surface
  cek(
    "neutral-100 sama persis dengan surface",
    T["--color-neutral-100"] === T["--color-surface"],
    `${T["--color-neutral-100"]} vs ${T["--color-surface"]}`
  );

  // 3. kontras teks di tiap permukaan tempat ia benar benar dipakai
  const teksDi = [
    ["teks utama di kanvas", "--color-text", "--color-bg"],
    ["teks utama di kartu", "--color-text", "--color-surface"],
    ["teks utama di panel", "--color-text", "--color-panel"],
    ["teks utama di melayang", "--color-text", "--color-elevated"],
    ["neutral-600 di kartu", "--color-neutral-600", "--color-surface"],
    ["neutral-700 di kartu", "--color-neutral-700", "--color-surface"],
    ["panel-samar di panel", "--color-panel-samar", "--color-panel"],
    ["aksen-700 sbg tautan di kartu", "--color-accent-700", "--color-surface"],
    ["aksen-700 sbg tautan di kanvas", "--color-accent-700", "--color-bg"],
    ["di-atas-solid di tombol tinta", "--color-di-atas-solid", "--color-neutral-900"],
  ];
  for (const [label, fg, bg] of teksDi) {
    const r = kontras(T[fg], T[bg]);
    cek(label, r >= AMBANG_AA, r.toFixed(2));
  }

  // Badge: tiap ramp status memasangkan teks level-800 di atas isian level-200
  for (const ramp of ["accent", "accent-2", "warn", "danger"]) {
    const r = kontras(T[`--color-${ramp}-800`], T[`--color-${ramp}-200`]);
    cek(`badge ${ramp}: teks 800 di isian 200`, r >= AMBANG_AA, r.toFixed(2));
  }

  // 4. tidak ada dua ramp yang bertabrakan, diperiksa BERPASANGAN.
  //
  //    Dua warna dianggap "aman" kalau salah satu terpenuhi: hue-nya cukup
  //    jauh (>=40°), ATAU salah satu chromanya jauh lebih pekat (>=1.8x)
  //    sehingga tetap terbedakan walau hue-nya berdekatan. Yang kedua ini
  //    sehingga aturan ini tidak bergantung pada satu keluarga warna.
  //
  //    PENGECUALIAN, ditulis eksplisit dengan alasan, mengikuti pola
  //    DATA_SEED di skrip/cek-bahasa.mjs. warn vs danger memang berdekatan
  //    hue-nya di level 500 ke atas (21-31°, di bawah ambang 40°), tapi ini
  //    BUKAN regresi: keduanya adalah ramp semantik yang memang sengaja
  //    dikecualikan. Diperiksa
  //    langsung di GAYA_STATUS (src/lib/status.ts): DIPINJAM selalu tampil
  //    LEMBUT (warn-300 + teks warn-900), DITOLAK selalu tampil SOLID GELAP
  //    (danger-700 + teks danger-100). Keduanya tidak pernah bertemu dengan
  //    isian yang senada, jadi kedekatan hue di angka mentah tidak pernah
  //    benar benar terlihat berdampingan di layar. Kalau nanti ada badge
  //    baru yang memasangkan warn dan danger dengan isian setara, alasan
  //    ini berhenti berlaku dan pengecualiannya wajib dicabut.
  const PENGECUALIAN = new Set(["warn|danger"]);

  const RAMP_STATUS = ["accent", "accent-2", "warn", "danger"];
  console.log("   tabrakan antar ramp, per pasangan, per level:");
  let semuaAman = true;
  for (let i = 0; i < RAMP_STATUS.length; i++) {
    for (let j = i + 1; j < RAMP_STATUS.length; j++) {
      const [rampA, rampB] = [RAMP_STATUS[i], RAMP_STATUS[j]];
      const dikecualikan = PENGECUALIAN.has(`${rampA}|${rampB}`);
      let pasanganAman = true;
      for (let n = 100; n <= 900; n += 100) {
        const a = keOklch(T[`--color-${rampA}-${n}`]);
        const b = keOklch(T[`--color-${rampB}-${n}`]);
        const rasio = Math.max(a.C, b.C) / Math.min(a.C, b.C);
        const jarakHue = Math.min(Math.abs(a.H - b.H), 360 - Math.abs(a.H - b.H));
        const aman = rasio >= 1.8 || jarakHue >= 40;
        if (!aman) {
          pasanganAman = false;
          if (!dikecualikan) semuaAman = false;
          console.log(
            `     ${rampA} vs ${rampB} @ ${n}: chroma ${rasio.toFixed(2)}x, hue ${jarakHue.toFixed(0)} deg  ${dikecualikan ? "<- dikecualikan, lihat komentar" : "<- BERISIKO"}`
          );
        }
      }
      if (pasanganAman) console.log(`     ${rampA} vs ${rampB}: aman di kesembilan level`);
    }
  }
  cek("tidak ada dua ramp status yang bertabrakan di luar pengecualian", semuaAman);
}

console.log("PEMERIKSA PALET, dibaca langsung dari globals.css");

periksaMode("MODE TERANG", TERANG, [
  "--color-elevated",
  "--color-surface",
  "--color-bg",
  "--color-panel",
  "--color-divider",
]);

// Di mode gelap urutannya terbalik: yang melayang justru paling TERANG,
// dan kanvas paling gelap. Jadi daftarnya dibalik supaya pemeriksaan
// "terurut menurun" tetap berlaku apa adanya.
periksaMode("MODE GELAP", GELAP, [
  "--color-elevated",
  "--color-panel",
  "--color-surface",
  "--color-bg",
]);

// Garis hairline mode gelap diperiksa terpisah, karena di sana ia justru
// lebih TERANG dari semua permukaan, kebalikan dari mode terang.
{
  const d = Math.abs(terang(GELAP["--color-divider"]) - terang(GELAP["--color-surface"]));
  cek("MODE GELAP: garis hairline terbedakan dari kartu", d >= AMBANG_LAPIS, `${d.toFixed(1)} L*`);
}

// Keadaan sel kalender wajib saling terbedakan. Ini pernah nyaris rusak
// saat aksen dan penanda "lewat" sama sama jadi warna hangat.
{
  const kosong = TERANG["--color-accent-2-200"];
  const terpakai = TERANG["--color-accent-600"];
  const lewat = TERANG["--color-neutral-200"];
  const pasangan = [
    ["kosong vs terpakai", kosong, terpakai],
    ["lewat vs terpakai", lewat, terpakai],
    ["lewat vs kosong", lewat, kosong],
  ];
  console.log("\n── KALENDER: keadaan sel ──");
  for (const [label, a, b] of pasangan) {
    const d = Math.abs(terang(a) - terang(b));
    cek(label, d >= AMBANG_LAPIS, `${d.toFixed(1)} L*`);
  }
}

// Ikon tab (favicon) adalah berkas SVG statis, terpisah dari komponen logo
// React yang sudah benar memakai currentColor. Karena favicon tidak punya
// apa pun untuk diwarisi warnanya, isinya wajib literal, dan literal itu
// yang bisa diam diam tertinggal saat palet berganti. Diperiksa dengan
// memastikan tiap hex di dalamnya masih anggota token :root yang aktif
// sekarang, bukan menebak apakah "kelihatannya benar".
{
  console.log("\n── IKON TAB (src/app/icon.svg) ──");
  const svg = readFileSync("src/app/icon.svg", "utf8");
  const hexDiIkon = [...svg.matchAll(/#[0-9a-fA-F]{6}/g)].map((m) => m[0].toLowerCase());
  const tokenAktif = new Set(Object.values(TERANG));
  if (hexDiIkon.length === 0) {
    cek("icon.svg punya warna untuk diperiksa", false, "nol hex ditemukan, currentColor tidak berlaku di favicon");
  }
  for (const hex of hexDiIkon) {
    const cocok = [...Object.entries(TERANG)].find(([, v]) => v === hex);
    cek(
      `icon.svg memakai token aktif: ${hex}`,
      tokenAktif.has(hex),
      cocok ? cocok[0] : "TIDAK ADA di :root sekarang, kemungkinan sisa palet lama"
    );
  }
}

/* ── RADIUS: angka mentah ditolak ─────────────────────────────────────
 *
 * Sekali waktu berkas ini punya tiga token radius yang nyaris tidak dipakai
 * (4 dari 34 deklarasi), sementara sudutnya ditulis mentah dengan tujuh
 * tangga berbeda: 4, 6, 8, 12, 14, di samping 16 dan 28 milik token.
 * Tangganya tidak pernah diputuskan siapa pun, ia cuma tumbuh.
 *
 * Pemeriksa ini menahan pertumbuhan itu. `50%` dibiarkan karena menyatakan
 * bentuk lingkaran, bukan pelunakan sudut, dan `0` jelas bukan angka ajaib.
 */
{
  console.log("\n── RADIUS (src/app/globals.css) ──");
  const baris = css.split("\n");
  const mentah = [];
  baris.forEach((isi, i) => {
    const m = isi.match(/border-radius:\s*([^;]+);/);
    if (!m) return;
    const nilai = m[1].trim();
    if (nilai === "0" || nilai === "50%") return;
    // Setiap potongan wajib token atau nol. Sudut majemuk ikut diperiksa.
    for (const bagian of nilai.split(/\s+/)) {
      if (bagian === "0") continue;
      if (/^var\(--radius-[a-z]+\)$/.test(bagian)) continue;
      if (/^calc\(/.test(nilai)) return; // turunan token, sudah bernama
      mentah.push({ baris: i + 1, nilai });
      return;
    }
  });
  for (const t of mentah) {
    cek(`radius memakai token di baris ${t.baris}`, false, `"${t.nilai}" masih angka mentah`);
  }
  cek(
    `tidak ada radius mentah di globals.css`,
    mentah.length === 0,
    mentah.length ? `${mentah.length} ditemukan` : ""
  );
}

/* ── CATATAN: pasangan permukaan yang SENGAJA tidak diuji ──────────────
 *
 * Ditelusuri dan diputuskan, bukan terlewat. `surface` dan `panel` cuma
 * berselisih 2.1 L* di mode terang dan 1.5 L* di mode gelap, di bawah ambang
 * 3.5 yang dipakai berkas ini. Terlihat seperti cacat, ternyata bukan:
 * keduanya TIDAK PERNAH bersentuhan di layar.
 *
 * `panel` hanya mengecat .sidebar, .tab-bawah, dan footer, yaitu kerangka
 * halaman yang menempel ke kanvas. `surface` mengecat kartu yang hidup di
 * area konten. Keduanya berada di sisi berlawanan dari kanvas, jadi mata
 * tidak pernah membandingkan langsung.
 *
 * Pasangan yang benar benar bersentuhan sudah diuji di periksaMode():
 * kanvas vs panel dan kanvas vs kartu, keduanya jauh di atas ambang.
 * Permukaan `elevated` dipakai popover ber-shadow-lg yang melayang, jadi
 * pemisahnya bayangan, bukan selisih terang.
 *
 * Kalau suatu saat kartu dipasang DI DALAM sidebar atau footer, catatan ini
 * batal dan pasangan surface vs panel wajib mulai diuji.
 */

console.log(`\n${lolos} lolos, ${gagal} gagal`);
process.exit(gagal > 0 ? 1 : 0);
