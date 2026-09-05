import { Clock3, UsersRound } from "lucide-react";
import { useTranslation } from "react-i18next";

import { LootIllustration } from "@/src/components/landing/loot-illustration";
import { RankingIllustration } from "@/src/components/landing/ranking-illustration";

const evidenceItems = [
  {
    key: "dashboard",
    surface: "blue",
  },
  {
    key: "statistics",
    surface: "slate",
  },
] as const;

export function ProductProof() {
  const { t } = useTranslation();

  return (
    <section aria-labelledby="product-proof-title" className="bg-[#07111f]">
      <div className="mx-auto max-w-[96rem] px-3 py-3 sm:px-5 sm:py-5">
        <div className="px-5 py-12 sm:px-8 sm:py-16 lg:px-14 lg:py-24">
          <h2
            id="product-proof-title"
            className="broadcast-display max-w-4xl text-balance text-4xl font-black leading-[0.98] tracking-[-0.035em] text-[#f7f8f2] sm:text-5xl"
          >
            {t("landing.proof.title")}
          </h2>
          <p className="mt-6 max-w-[68ch] text-lg leading-8 text-[#aebed4]">
            {t("landing.proof.description")}
          </p>
        </div>

        {evidenceItems.map((item, index) => {
          const isSlate = item.surface === "slate";

          return (
            <article
              key={item.key}
              className={[
                "relative isolate mb-6 sm:mb-8 overflow-hidden rounded-2xl px-5 py-12 last:mb-0 sm:px-8 sm:py-16 lg:min-h-[36rem] lg:rounded-[1.75rem] lg:px-14 lg:py-20",
                isSlate
                  ? "bg-[var(--broadcast-cyan)] text-[var(--broadcast-ink)]"
                  : "bg-[#101f45] text-[#f7f8f2]",
              ].join(" ")}
            >
              <div
                aria-hidden="true"
                className="landing-shape pointer-events-none absolute right-8 top-8 size-6 rounded-lg bg-[var(--broadcast-amber)]/60 sm:right-12 sm:size-9"
              />
              <div
                aria-hidden="true"
                className="landing-shape pointer-events-none absolute bottom-5 left-[30%] size-5 rounded-full bg-[var(--broadcast-coral)]/70 sm:size-8"
              />
              <div
                className={[
                  "relative z-10 grid items-center gap-10 sm:gap-12 lg:grid-cols-2 lg:gap-20",
                  isSlate ? "lg:[&>*:first-child]:order-2" : "",
                ].join(" ")}
              >
                <div>
                  <div
                    className={[
                      "mb-6 flex items-center gap-3 text-sm font-bold sm:mb-8",
                      isSlate
                        ? "text-[var(--broadcast-ink)]"
                        : "text-[#8fe6f2]",
                    ].join(" ")}
                  >
                    {index === 0 ? (
                      <Clock3 className="size-5" />
                    ) : (
                      <UsersRound className="size-5" />
                    )}
                    {t(`landing.proof.${item.key}.caption`)}
                  </div>
                  <h3 className="broadcast-display max-w-xl text-balance text-4xl font-black leading-[0.98] tracking-[-0.035em] sm:text-5xl">
                    {t(`landing.proof.${item.key}.title`)}
                  </h3>
                  <p
                    className={[
                      "mt-6 max-w-[64ch] text-lg leading-8",
                      isSlate
                        ? "text-[var(--broadcast-paper-ink)]"
                        : "text-[#b7c6ee]",
                    ].join(" ")}
                  >
                    {t(`landing.proof.${item.key}.description`)}
                  </p>
                </div>

                <div className="relative isolate min-w-0 pb-8 lg:pb-0">
                  <div
                    aria-hidden="true"
                    className={[
                      "landing-shape absolute -left-3 -top-5 size-20 rounded-full border-[12px] sm:size-24 sm:border-[14px]",
                      isSlate ? "border-[#ff665b]" : "border-[#c8f135]",
                    ].join(" ")}
                  />
                  <div
                    aria-hidden="true"
                    className={[
                      "landing-shape absolute -bottom-5 right-8 size-20 rounded-full",
                      isSlate ? "bg-[#3157f6]" : "bg-[#ffbd3f]",
                    ].join(" ")}
                  />
                  {isSlate ? <RankingIllustration /> : <LootIllustration />}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
