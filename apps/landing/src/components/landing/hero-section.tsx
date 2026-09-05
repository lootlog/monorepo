import { ArrowUpRight, Download } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@lootlog/ui/components/button";

import { TimerIllustration } from "@/src/components/landing/timer-illustration";
import { ADDON_URL } from "@/src/config/addon";
import { links } from "@/src/config/links";

export function HeroSection() {
  const { t } = useTranslation();

  return (
    <section
      id="product"
      aria-labelledby="landing-hero-title"
      className="relative isolate overflow-hidden bg-[var(--broadcast-ink)]"
    >
      <div
        aria-hidden="true"
        className="landing-shape absolute -left-28 top-32 size-72 rounded-full bg-[var(--broadcast-blue)]/20 sm:size-[28rem]"
      />
      <div
        aria-hidden="true"
        className="landing-shape absolute -right-24 top-20 size-64 rounded-full bg-[var(--broadcast-amber)]/10 sm:size-[24rem]"
      />

      <div
        aria-hidden="true"
        className="landing-shape pointer-events-none absolute bottom-10 left-[8%] size-8 rounded-full bg-[var(--broadcast-coral)]/70 sm:size-12"
      />
      <div
        aria-hidden="true"
        className="landing-shape pointer-events-none absolute right-[12%] top-8 size-7 rounded-lg bg-[var(--broadcast-cyan)]/60 sm:size-10"
      />
      <div
        aria-hidden="true"
        className="landing-shape pointer-events-none absolute bottom-8 right-[20%] hidden size-16 rounded-full border-[10px] border-[var(--broadcast-lime)]/40 sm:block"
      />

      <div className="broadcast-hero-layout relative z-10 landing-container min-h-[calc(100svh-6rem)] pb-14 pt-3 sm:pb-20 sm:pt-14 lg:pb-20 lg:pt-20">
        <div className="broadcast-hero-copy min-w-0 self-center">
          <div className="max-w-2xl">
            <h1
              id="landing-hero-title"
              className="landing-heading-display max-w-3xl text-balance text-[var(--broadcast-white)]"
            >
              {t("landing.hero.title")}
            </h1>
          </div>

          <div className="mt-5 max-w-2xl sm:mt-7">
            <p className="max-w-[64ch] text-pretty text-base leading-6 text-[var(--broadcast-text-muted)] sm:text-lg sm:leading-8 lg:text-xl">
              {t("landing.hero.description")}
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:mt-7 sm:flex-row">
              <Button
                size="lg"
                className="landing-action landing-action-solid"
                render={
                  <a href={links.dashboard}>
                    {t("landing.hero.openDashboard")}
                    <ArrowUpRight className="size-4" />
                  </a>
                }
                nativeButton={false}
              />
              <Button
                size="lg"
                className="landing-action landing-action-light"
                render={
                  <a href={ADDON_URL} target="_blank" rel="noopener noreferrer">
                    <Download className="size-4" />
                    {t("landing.hero.installAddon")}
                  </a>
                }
                nativeButton={false}
              />
            </div>
          </div>
        </div>

        <div className="broadcast-hero-product relative min-w-0 self-center">
          <div
            aria-hidden="true"
            className="landing-shape absolute -left-4 top-5 hidden size-20 rounded-full border-[12px] border-[var(--broadcast-cyan)]/80 sm:block lg:-left-10 lg:size-24 lg:border-[14px]"
          />
          <div
            aria-hidden="true"
            className="landing-shape absolute -right-3 -top-4 grid size-16 place-items-center rounded-full bg-[var(--broadcast-amber)]/90 text-[var(--broadcast-ink)] sm:-right-6 sm:-top-7 sm:size-24 lg:size-28"
          >
            <span className="size-4 rounded-full bg-current sm:size-6" />
          </div>

          <TimerIllustration />
        </div>
      </div>
    </section>
  );
}
