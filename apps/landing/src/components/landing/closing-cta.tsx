import { ArrowUpRight, Download } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@lootlog/ui/components/button";

import { ADDON_URL } from "@/src/config/addon";
import { links } from "@/src/config/links";

export function ClosingCta() {
  const { t } = useTranslation();

  return (
    <section
      aria-labelledby="closing-cta-title"
      className="relative isolate overflow-hidden bg-[var(--broadcast-coral)] px-5 py-16 text-[var(--broadcast-ink)] sm:px-8 sm:py-20 lg:py-28"
    >
      <div className="relative z-10 mx-auto max-w-[90rem]">
        <h2
          id="closing-cta-title"
          className="broadcast-display max-w-5xl text-balance text-5xl font-black leading-[0.94] tracking-[-0.04em] sm:text-7xl"
        >
          {t("landing.closingCta.title")}
        </h2>
        <div className="mt-9 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <p className="max-w-[65ch] text-lg leading-8 text-[var(--broadcast-paper-ink)]">
            {t("landing.closingCta.description")}
          </p>
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
            <Button
              size="lg"
              className="landing-action landing-action-dark"
              render={
                <a href={ADDON_URL} target="_blank" rel="noopener noreferrer">
                  <Download className="size-4" />
                  {t("landing.closingCta.install")}
                </a>
              }
              nativeButton={false}
            />
            <Button
              size="lg"
              variant="outline"
              className="landing-action landing-action-outline"
              render={
                <a href={links.docs}>
                  {t("landing.closingCta.guide")}
                  <ArrowUpRight className="size-4" />
                </a>
              }
              nativeButton={false}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
