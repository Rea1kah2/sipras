import { LambangSipras } from "@/components/logo";
import type { Kamus } from "@/lib/kamus";

export function AuthShowcase({ t }: { t: Kamus }) {
  return (
    <section className="auth-showcase">
      <div className="auth-showcase-grid" aria-hidden />

      <div className="auth-showcase-brand">
        <div className="flex items-center gap-3">
          <LambangSipras ukuran={38} />
          <div>
            <span className="auth-brand-name">SIPRAS</span>
            <span className="auth-brand-kicker">{t.auth.kicker}</span>
          </div>
        </div>

        <div className="auth-showcase-intro">
          <h1>{t.auth.title}</h1>
          <p>{t.auth.description}</p>
        </div>
      </div>

      <div className="auth-showcase-product">
        <div className="auth-request-card card elev-md">
          <div className="flex items-center justify-between gap-2" style={{ marginBottom: 14 }}>
            <span className="auth-request-id">PJ-2026-0042</span>
            <span className="tag tag-accent-2">
              <span className="tag-dot" style={{ background: "var(--color-accent-2-600)" }} />
              {t.status.DISETUJUI}
            </span>
          </div>
          <div style={{ marginBottom: 14 }}>
            <div className="auth-request-title">{t.auth.requestTitle}</div>
            <div className="auth-request-meta">{t.auth.requestApplicant}</div>
          </div>
          <div className="auth-request-schedule">
            <span>{t.auth.requestSchedule}</span>
            <span style={{ fontWeight: 700, color: "var(--color-accent-700)" }}>
              {t.auth.requestReady}
            </span>
          </div>
        </div>

        <div className="auth-feature-grid">
          <Feature title={t.auth.featureConflict} description={t.auth.featureConflictDescription} />
          <Feature title={t.auth.featureMulti} description={t.auth.featureMultiDescription} />
          <Feature title={t.auth.featureNotice} description={t.auth.featureNoticeDescription} />
        </div>
      </div>

      <div className="auth-showcase-footer">
        <span>{t.auth.footerUnit}</span>
        <span>{t.auth.footerTagline}</span>
      </div>
    </section>
  );
}

function Feature({ title, description }: { title: string; description: string }) {
  return (
    <div className="auth-feature">
      <div className="auth-feature-title">{title}</div>
      <div className="auth-feature-description">{description}</div>
    </div>
  );
}
