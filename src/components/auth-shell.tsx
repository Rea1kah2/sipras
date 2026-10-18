import type { ReactNode } from "react";
import { AuthFooter } from "@/components/auth-footer";
import { AuthShowcase } from "@/components/auth-showcase";
import { BarTamu } from "@/components/bar-tamu";
import { PenyediaKamus } from "@/components/kamus-provider";
import type { Kamus } from "@/lib/kamus";
import type { Bahasa, Tema } from "@/lib/preferensi";

export function AuthShell({
  tema,
  bahasa,
  t,
  children,
}: {
  tema: Tema;
  bahasa: Bahasa;
  t: Kamus;
  children: ReactNode;
}) {
  return (
    <PenyediaKamus nilai={t}>
      <div className="auth-shell">
        <BarTamu tema={tema} bahasa={bahasa} t={t} />
        <AuthShowcase t={t} />
        <main className="auth-content">
          <div className="auth-card card elev-md">{children}</div>
          <AuthFooter t={t} />
        </main>
      </div>
    </PenyediaKamus>
  );
}
