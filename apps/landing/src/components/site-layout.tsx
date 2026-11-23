import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { SkipLink } from "@lootlog/ui/components/skip-link";
import { LandingFooter } from "@/components/landing/footer";
import { LandingHeader } from "@/components/landing/header";

export const SITE_CONTENT_ID = "site-content";

export function SiteLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen overflow-x-clip bg-background text-foreground">
      <SkipLink target={SITE_CONTENT_ID}>{t("landing.skipToContent")}</SkipLink>
      <LandingHeader />
      <main
        id={SITE_CONTENT_ID}
        tabIndex={-1}
        className="blog-main outline-none"
      >
        {children}
      </main>
      <LandingFooter />
    </div>
  );
}
