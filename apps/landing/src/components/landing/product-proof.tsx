import { ArrowUpRight, BellRing, Clock3, UsersRound } from "lucide-react";
import { useTranslation } from "react-i18next";

import { ProductWindow } from "@/src/components/landing/product-window";
import { SignalRoute } from "@/src/components/landing/signal-route";

const evidenceItems = [
  {
    key: "dashboard",
    image: "/screenshots/guild-lootlog-current.jpg",
    surface: "blue",
  },
  {
    key: "statistics",
    image: "/screenshots/guild-kill-stats-current.png",
    surface: "paper",
  },
] as const;

export function ProductProof() {
  const { t } = useTranslation();

  return (
    <section aria-labelledby="product-proof-title" className="bg-[#07111f]">
      <div className="mx-auto max-w-[96rem] px-3 py-3 sm:px-5 sm:py-5">
        <div className="px-3 py-12 sm:px-6 sm:py-16 lg:px-10 lg:py-24">
          <h2
            id="product-proof-title"
            className="broadcast-display max-w-4xl text-balance text-4xl font-black leading-[0.98] tracking-[-0.035em] text-[#f7f8f2] sm:text-6xl"
          >
            {t("landing.proof.title")}
          </h2>
          <p className="mt-6 max-w-[68ch] text-lg leading-8 text-[#aebed4]">
            {t("landing.proof.description")}
          </p>
        </div>

        {evidenceItems.map((item, index) => {
          const isPaper = item.surface === "paper";

          return (
            <article
              key={item.key}
              className={[
                "relative isolate mb-3 overflow-hidden rounded-2xl px-5 py-12 last:mb-0 sm:px-8 sm:py-16 lg:min-h-[44rem] lg:rounded-[1.75rem] lg:px-14 lg:py-20",
                isPaper
                  ? "bg-[#f4f1e8] text-[#0a1830]"
                  : "bg-[#3157f6] text-white",
              ].join(" ")}
            >
              {isPaper ? (
                <div
                  aria-hidden="true"
                  className="absolute bottom-10 left-[7%] hidden items-center gap-4 lg:flex"
                >
                  <span className="grid size-16 place-items-center rounded-full border-[10px] border-[#3157f6]">
                    <span className="size-3 rounded-full bg-[#3157f6]" />
                  </span>
                  <span className="h-2 w-20 rounded-full bg-[#3157f6]" />
                  <span className="size-7 rounded-full bg-[#35d3e4]" />
                  <span className="size-7 rounded-full bg-[#c8f135]" />
                  <span className="size-7 rounded-full bg-[#ffbd3f]" />
                  <span className="ml-5 grid size-12 rotate-45 place-items-center rounded-xl bg-[#ff665b]">
                    <span className="size-3 rounded-full bg-[#f4f1e8]" />
                  </span>
                </div>
              ) : null}

              <div
                className={[
                  "relative z-10 grid items-center gap-10 sm:gap-12 lg:grid-cols-2 lg:gap-20",
                  isPaper ? "lg:[&>*:first-child]:order-2" : "",
                ].join(" ")}
              >
                <div>
                  <div
                    className={[
                      "mb-6 flex items-center gap-3 text-sm font-bold sm:mb-8",
                      isPaper ? "text-[#c93f36]" : "text-[#dff7ff]",
                    ].join(" ")}
                  >
                    {index === 0 ? (
                      <Clock3 className="size-5" />
                    ) : (
                      <UsersRound className="size-5" />
                    )}
                    {t(`landing.proof.${item.key}.caption`)}
                  </div>
                  <h3 className="broadcast-display max-w-xl text-balance text-4xl font-black leading-[0.98] tracking-[-0.035em] sm:text-6xl">
                    {t(`landing.proof.${item.key}.title`)}
                  </h3>
                  <p
                    className={[
                      "mt-6 max-w-[64ch] text-lg leading-8",
                      isPaper ? "text-[#3a4a60]" : "text-[#d8e3ff]",
                    ].join(" ")}
                  >
                    {t(`landing.proof.${item.key}.description`)}
                  </p>
                  <div
                    className={[
                      "relative z-20 -ml-3 mt-8 inline-flex w-fit items-center gap-3 rounded-xl px-3 py-2 text-sm font-bold",
                      isPaper
                        ? "bg-[#f4f1e8] text-[#0a1830]"
                        : "bg-[#3157f6] text-white",
                    ].join(" ")}
                  >
                    <BellRing className="size-4" />
                    {t(`landing.proof.${item.key}.decision`)}
                    <ArrowUpRight className="size-4" />
                  </div>
                </div>

                <div className="relative isolate min-w-0 pb-8 lg:pb-0">
                  <SignalRoute
                    color={isPaper ? "coral" : "cyan"}
                    direction={index % 2 === 0 ? "right" : "left"}
                    className="-bottom-20 top-auto opacity-65"
                  />
                  <div
                    aria-hidden="true"
                    className={[
                      "absolute -left-3 -top-5 size-20 rounded-full border-[12px] sm:size-24 sm:border-[14px]",
                      isPaper ? "border-[#ff665b]" : "border-[#c8f135]",
                    ].join(" ")}
                  />
                  <div
                    aria-hidden="true"
                    className={[
                      "absolute -bottom-5 right-8 size-20 rounded-full",
                      isPaper ? "bg-[#3157f6]" : "bg-[#ffbd3f]",
                    ].join(" ")}
                  />
                  <ProductWindow
                    src={item.image}
                    alt={t(`landing.proof.${item.key}.alt`)}
                    caption={t(`landing.proof.${item.key}.caption`)}
                    className="relative"
                  />
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
