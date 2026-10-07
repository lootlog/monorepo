import { ArrowUpRight, Download } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@lootlog/ui/components/button";

import { LootlogMark } from "@/src/components/landing/lootlog-mark";
import { ADDON_URL } from "@/src/config/addon";
import { links } from "@/src/config/links";

export function ClosingCta() {
  const { t } = useTranslation();

  return (
    <section
      aria-labelledby="closing-cta-title"
      className="landing-section relative isolate overflow-hidden bg-[var(--broadcast-coral)] text-[var(--broadcast-ink)]"
    >
      <div aria-hidden="true" className="landing-cta-shapes">
        <span className="landing-shape" />
        <span className="landing-shape" />
        <span className="landing-shape" />
      </div>
      <div className="landing-container landing-cta-layout relative z-10">
        <div>
          <h2
            id="closing-cta-title"
            className="landing-heading-display max-w-4xl text-balance"
          >
            {t("landing.closingCta.title")}
          </h2>
          <p className="landing-lead mt-6 font-medium text-[var(--broadcast-paper-ink)]">
            {t("landing.closingCta.description")}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
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
                <a href={links.installationGuide}>
                  {t("landing.closingCta.guide")}
                  <ArrowUpRight className="size-4" />
                </a>
              }
              nativeButton={false}
            />
          </div>
        </div>
        <div aria-hidden="true" className="landing-cta-emblem">
          <LootlogMark />
        </div>
      </div>
    </section>
  );
}
