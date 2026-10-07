import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Heart, MessageCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LootlogMark } from "@/src/components/landing/lootlog-mark";
import { links } from "@/src/config/links";

const copyrightYear = new Date().getFullYear();

export function LandingFooter() {
  const { t } = useTranslation();

  return (
    <footer className="bg-[var(--broadcast-ink)] py-8 text-[var(--broadcast-white)] sm:py-10">
      <div className="landing-container">
        <div className="grid gap-8 border-b border-[var(--broadcast-line)] pb-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-12">
          <div>
            <Link to="/" className="landing-footer-brand">
              <LootlogMark className="size-10 shrink-0 rounded-lg" />
              {t("landing.header.brand")}
            </Link>
            <p className="mt-3 max-w-md text-pretty text-sm leading-6 text-[var(--broadcast-text-muted)]">
              {t("landing.footer.tagline")}
            </p>
          </div>
          <nav
            aria-label={t("landing.footer.navigationLabel")}
            className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between lg:gap-10"
          >
            <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
              <Link className="landing-footer-link" to="/blog">
                {t("landing.footer.blog")}
              </Link>
              <a className="landing-footer-link" href={links.docs}>
                {t("landing.footer.docs")}
                <ArrowUpRight className="size-3.5" aria-hidden="true" />
              </a>
              <a className="landing-footer-link" href={links.developer}>
                {t("landing.footer.developer")}
                <ArrowUpRight className="size-3.5" aria-hidden="true" />
              </a>
              <a
                className="landing-footer-link"
                href={links.github}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("landing.footer.github")}
                <ArrowUpRight className="size-3.5" aria-hidden="true" />
              </a>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:flex">
              <a
                className="landing-footer-social"
                href={links.discord}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle
                  className="size-4 text-[var(--broadcast-cyan)]"
                  aria-hidden="true"
                />
                {t("landing.footer.discord")}
              </a>
              <a
                className="landing-footer-social"
                href={links.support}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Heart
                  className="size-4 text-[var(--broadcast-coral)]"
                  aria-hidden="true"
                />
                {t("landing.footer.support")}
              </a>
            </div>
          </nav>
        </div>
        <div className="flex flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-[var(--broadcast-text-subtle)]">
            {t("landing.footer.copyright", { year: copyrightYear })}
          </p>
          <div className="flex gap-6">
            <Link className="landing-footer-link" to="/privacy-policy">
              {t("landing.footer.privacy")}
            </Link>
            <Link className="landing-footer-link" to="/terms-of-service">
              {t("landing.footer.terms")}
            </Link>
          </div>
        </div>
        <p className="mt-3 text-xs leading-5 text-[var(--broadcast-text-subtle)]">
          {t("landing.footer.legalNotice")}
        </p>
      </div>
    </footer>
  );
}
