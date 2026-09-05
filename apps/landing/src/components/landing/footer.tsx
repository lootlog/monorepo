import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Heart, MessageCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { links } from "@/src/config/links";

export function LandingFooter() {
  const { t } = useTranslation();
  return (
    <footer className="bg-[var(--broadcast-ink)] py-8 text-[var(--broadcast-white)] sm:py-10">
      <div className="landing-container">
        <nav
          aria-label={t("landing.footer.navigationLabel")}
          className="flex flex-col gap-6 border-b border-[var(--broadcast-line)] pb-6 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
            <a className="landing-footer-link" href={links.docs}>
              {t("landing.footer.docs")}
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
        <div className="flex flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-[var(--broadcast-text-subtle)]">
            {t("landing.footer.copyright", { year: new Date().getFullYear() })}
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
