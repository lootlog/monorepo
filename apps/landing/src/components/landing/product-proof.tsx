import { ChartColumn, Gem } from "lucide-react";
import { useTranslation } from "react-i18next";

import { LootIllustration } from "@/src/components/landing/loot-illustration";
import { RankingIllustration } from "@/src/components/landing/ranking-illustration";

const evidenceItems = [
  { key: "dashboard", icon: Gem, surface: "blue" },
  { key: "statistics", icon: ChartColumn, surface: "cyan" },
] as const;

export function ProductProof() {
  const { t } = useTranslation();

  return (
    <section
      id="product"
      aria-labelledby="product-proof-title"
      className="landing-section bg-[var(--broadcast-ink)]"
    >
      <div className="landing-container">
        <h2
          id="product-proof-title"
          className="landing-heading-section max-w-4xl text-balance text-[var(--broadcast-white)]"
        >
          {t("landing.proof.title")}
        </h2>
        <p className="landing-lead mt-6 text-[var(--broadcast-text-muted)]">
          {t("landing.proof.description")}
        </p>

        <div className="mt-12 grid gap-6 sm:mt-16 sm:gap-8">
          {evidenceItems.map(({ key, icon: Icon, surface }) => {
            const isCyan = surface === "cyan";

            return (
              <article
                key={key}
                className={[
                  "relative isolate overflow-hidden rounded-[var(--broadcast-radius-card)] px-4 py-10 sm:px-10 sm:py-14 lg:rounded-[var(--broadcast-radius-panel)] lg:px-14 lg:py-16",
                  isCyan
                    ? "bg-[var(--broadcast-cyan)] text-[var(--broadcast-ink)]"
                    : "bg-[var(--broadcast-navy)] text-[var(--broadcast-white)]",
                ].join(" ")}
              >
                <div
                  className={[
                    "grid items-center gap-10 sm:gap-12 lg:grid-cols-2 lg:gap-20",
                    isCyan ? "lg:[&>*:first-child]:order-2" : "",
                  ].join(" ")}
                >
                  <div>
                    <p
                      className={[
                        "mb-5 flex items-center gap-2.5 text-sm font-bold sm:mb-6",
                        isCyan
                          ? "text-[var(--broadcast-ink)]"
                          : "text-[var(--broadcast-cyan)]",
                      ].join(" ")}
                    >
                      <Icon className="size-5" aria-hidden="true" />
                      {t(`landing.proof.${key}.caption`)}
                    </p>
                    <h3 className="landing-heading-card max-w-xl text-balance">
                      {t(`landing.proof.${key}.title`)}
                    </h3>
                    <p
                      className={[
                        "landing-lead mt-5",
                        isCyan
                          ? "text-[var(--broadcast-paper-ink)]"
                          : "text-[var(--broadcast-navy-muted)]",
                      ].join(" ")}
                    >
                      {t(`landing.proof.${key}.description`)}
                    </p>
                  </div>

                  <div className="relative isolate min-w-0">
                    <div
                      aria-hidden="true"
                      className={[
                        "landing-shape absolute -left-3 -top-5 size-20 rounded-full border-[12px] sm:size-24 sm:border-[14px]",
                        isCyan
                          ? "border-[var(--broadcast-coral)]"
                          : "border-[var(--broadcast-lime)]",
                      ].join(" ")}
                    />
                    <div
                      aria-hidden="true"
                      className={[
                        "landing-shape absolute bottom-10 -right-2 size-20 rounded-full sm:-right-4",
                        isCyan
                          ? "bg-[var(--broadcast-blue)]"
                          : "bg-[var(--broadcast-amber)]",
                      ].join(" ")}
                    />
                    {isCyan ? <RankingIllustration /> : <LootIllustration />}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
