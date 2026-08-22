import { TogelBahasa, TogelTema } from "@/components/togel-tampilan";
import type { Bahasa, Tema } from "@/lib/preferensi";
import type { Kamus } from "@/lib/kamus";

/**
 * Togel tema dan bahasa untuk halaman yang belum punya navbar, yaitu masuk
 * dan daftar. Orang perlu bisa memilih bahasanya sebelum bisa login, bukan
 * sesudah.
 */
export function BarTamu({
  tema,
  bahasa,
  t,
}: {
  tema: Tema;
  bahasa: Bahasa;
  t: Kamus;
}) {
  return (
    <div
      style={{
        position: "absolute",
        top: 16,
        right: 16,
        zIndex: 20,
        display: "flex",
        gap: 8,
      }}
    >
      <TogelBahasa awal={bahasa} label={t.shell.gantiBahasa} />
      <TogelTema
        awal={tema}
        labelKeGelap={t.shell.keGelap}
        labelKeTerang={t.shell.keTerang}
      />
    </div>
  );
}
