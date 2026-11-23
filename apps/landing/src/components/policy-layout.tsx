import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SiteLayout } from "@/components/site-layout";

interface PolicyLayoutProps {
  children: ReactNode;
  lastUpdated?: string;
}

export function PolicyLayout({ children, lastUpdated }: PolicyLayoutProps) {
  const { t } = useTranslation();

  return (
    <SiteLayout>
      <div className="landing-container">
        <Link to="/" className="blog-back-link">
          <ArrowLeft className="size-4" aria-hidden="true" />
          {t("landing.policyLayout.backToHome")}
        </Link>
        <article className="blog-prose policy-prose" data-surface="cyan">
          {lastUpdated && (
            <p className="text-sm text-muted-foreground">
              {t("landing.policyLayout.lastUpdated", { date: lastUpdated })}
            </p>
          )}
          {children}
        </article>
      </div>
    </SiteLayout>
  );
}
