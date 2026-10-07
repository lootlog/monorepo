import { ArrowUpRight, ChartColumn, Gem } from "lucide-react";
import { useTranslation } from "react-i18next";

import { SectionHead } from "@/src/components/landing/section-head";
import { links } from "@/src/config/links";

const evidenceItems = [
  {
    key: "dashboard",
    icon: Gem,
    tone: "amber",
    image: "/screenshots/guild-lootlog-current.jpg",
  },
  {
    key: "statistics",
    icon: ChartColumn,
    tone: "cyan",
    image: "/screenshots/guild-kill-stats-current.png",
  },
] as const;

export function ProductProof() {
  const { t } = useTranslation();

  return (
    <section
      id="product"
      aria-labelledby="product-proof-title"
      className="landing-section bg-[var(--broadcast-ink)] text-[var(--broadcast-white)]"
    >
      <div className="landing-container">
        <SectionHead
          id="product-proof-title"
          title={t("landing.proof.title")}
          description={t("landing.proof.description")}
        >
          <a
            href={links.organizationGuide}
            className="landing-footer-link mt-3"
          >
            {t("landing.proof.guide")}
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </a>
        </SectionHead>

        <div className="mt-12 grid gap-6 sm:mt-16 sm:gap-8">
          {evidenceItems.map(({ key, icon: Icon, tone, image }, index) => (
            <article
              key={key}
              className={`landing-proof-card landing-tone-${tone}`}
              data-reverse={index % 2 === 1 ? "" : undefined}
            >
              <div className="landing-proof-copy">
                <p className="landing-proof-meta">
                  <span className="landing-badge">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="landing-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {t(`landing.proof.${key}.caption`)}
                </p>
                <h3 className="landing-heading-card text-balance">
                  {t(`landing.proof.${key}.title`)}
                </h3>
                <p className="landing-lead">
                  {t(`landing.proof.${key}.description`)}
                </p>
              </div>

              <div className="landing-proof-visual">
                <span
                  aria-hidden="true"
                  className="landing-shape landing-ring"
                />
                <span
                  aria-hidden="true"
                  className="landing-shape landing-dot"
                />
                <img
                  src={image}
                  width={1280}
                  height={720}
                  alt={t(`landing.proof.${key}.imageAlt`)}
                  loading="lazy"
                  decoding="async"
                  className="landing-screen"
                />
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
