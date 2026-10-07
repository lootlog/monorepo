import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { LandingHeader } from "../landing/header";
import { LandingFooter } from "../landing/footer";

export function BlogLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-[var(--broadcast-ink)] text-[var(--broadcast-white)]">
      <a href="#blog-content" className="blog-skip-link">
        {t("landing.blog.skip")}
      </a>
      <LandingHeader />
      <main id="blog-content" tabIndex={-1} className="blog-main">
        {children}
      </main>
      <LandingFooter />
    </div>
  );
}
