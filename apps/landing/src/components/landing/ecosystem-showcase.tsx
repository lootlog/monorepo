import { ChevronLink } from "@lootlog/ui/components/chevron-link";
import { BookOpen, Code } from "lucide-react";
import { useTranslation } from "react-i18next";

import { SectionHead } from "@/src/components/landing/section-head";
import { links } from "@/src/config/links";

const products = [
  {
    key: "wiki",
    href: links.wiki,
    host: "wiki.lootlog.pl",
    icon: BookOpen,
    surface: "cyan",
  },
  {
    key: "developer",
    href: links.developer,
    host: "developer.lootlog.pl",
    icon: Code,
    surface: "amber",
  },
] as const;

export function EcosystemShowcase() {
  const { t } = useTranslation();

  return (
    <section
      id="ecosystem"
      aria-labelledby="ecosystem-title"
      className="landing-section bg-[var(--broadcast-ink)] text-[var(--broadcast-white)]"
    >
      <div className="landing-container">
        <SectionHead
          id="ecosystem-title"
          title={t("landing.ecosystem.title")}
          description={t("landing.ecosystem.description")}
        />
        <ul className="blog-more-list mt-12 sm:mt-16">
          {products.map(({ key, href, host, icon: Icon, surface }) => (
            <li key={key}>
              <ChevronLink
                className="blog-guide-card focus-visible:ring-0 focus-visible:ring-offset-0"
                data-surface={surface}
                href={href}
              >
                <div className="blog-guide-copy">
                  <div className="blog-guide-meta">
                    <span className="blog-guide-badge">
                      <Icon size={20} strokeWidth={2.25} aria-hidden="true" />
                    </span>
                    <span className="blog-guide-number">{host}</span>
                  </div>
                  <h3>{t(`landing.ecosystem.${key}.title`)}</h3>
                  <p>{t(`landing.ecosystem.${key}.description`)}</p>
                  <span className="blog-guide-read">
                    {t(`landing.ecosystem.${key}.action`)}
                  </span>
                </div>
              </ChevronLink>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
