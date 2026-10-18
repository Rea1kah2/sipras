import type { Kamus } from "@/lib/kamus";

export function AuthFooter({ t }: { t: Kamus }) {
  const wa = process.env.NEXT_PUBLIC_WA_PETUGAS ?? "";
  const waLink = `https://wa.me/${wa.replace(/\D/g, "").replace(/^0/, "62")}`;
  const tahun = new Date().getFullYear();

  return (
    <footer className="auth-footer">
      <span>
        &copy; {tahun} {t.merek.nama}
      </span>
      <span>{t.auth.footerPrivacy}</span>
      {wa && (
        <a href={waLink} target="_blank" rel="noreferrer" className="tautan">
          {t.auth.footerHelp}
        </a>
      )}
    </footer>
  );
}
