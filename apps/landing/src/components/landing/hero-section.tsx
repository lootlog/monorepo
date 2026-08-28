import { ArrowUpRight, Download } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@lootlog/ui/components/button";

import { ProductWindow } from "@/src/components/landing/product-window";
import { SignalRoute } from "@/src/components/landing/signal-route";
import { ADDON_URL } from "@/src/config/addon";
import { links } from "@/src/config/links";

export function HeroSection() {
  const { t } = useTranslation();

  return (
    <section
      id="product"
      aria-labelledby="landing-hero-title"
      className="relative isolate overflow-hidden bg-[#07111f]"
    >
      <div
        aria-hidden="true"
        className="absolute -left-28 top-32 size-72 rounded-full bg-[#173787]/55 sm:size-[28rem]"
      />
      <div
        aria-hidden="true"
        className="absolute -right-24 top-20 size-64 rounded-full bg-[#42251a]/55 sm:size-[24rem]"
      />
      <SignalRoute
        color="lime"
        motionEnabled
        className="-bottom-28 top-auto z-0 opacity-80 lg:-bottom-20"
      />

      <div className="broadcast-hero-layout relative z-10 mx-auto min-h-[calc(100svh-4.5rem)] max-w-[96rem] px-5 pb-14 pt-8 sm:px-8 sm:pb-20 sm:pt-14 lg:px-12 lg:pb-24 lg:pt-24">
        <div className="broadcast-hero-headline max-w-2xl self-end">
          <h1
            id="landing-hero-title"
            className="broadcast-display max-w-3xl text-balance text-[clamp(3rem,7.4vw,6rem)] font-black leading-[0.91] tracking-[-0.04em] text-[#f7f8f2]"
          >
            {t("landing.hero.title")}
          </h1>
        </div>

        <div className="broadcast-hero-details max-w-2xl self-start">
          <p className="max-w-[64ch] text-pretty text-base leading-7 text-[#b9c8de] sm:text-lg sm:leading-8 lg:text-xl">
            {t("landing.hero.description")}
          </p>

          <div className="mt-5 flex flex-col gap-3 sm:mt-7 sm:flex-row">
            <Button
              size="lg"
              className="h-14 rounded-xl bg-[#f7f8f2] px-6 text-base font-bold text-[#07111f] shadow-[8px_12px_28px_rgba(0,0,0,0.24)] transition-[background-color,transform] hover:bg-white motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-0 focus-visible:ring-2 focus-visible:ring-[#c8f135] focus-visible:ring-offset-4 focus-visible:ring-offset-[#07111f]"

              render={
                <a href={ADDON_URL} target="_blank" rel="noopener noreferrer">
                  <Download className="size-4" />
                  {t("landing.hero.installAddon")}
                </a>
              }
              nativeButton={false}
            />
            <Button
              size="lg"
              className="h-14 rounded-xl bg-[#3157f6] px-6 text-base font-bold text-white shadow-[8px_12px_28px_rgba(0,0,0,0.2)] transition-[background-color,transform] hover:bg-[#4168ff] motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-0 focus-visible:ring-2 focus-visible:ring-[#35d3e4] focus-visible:ring-offset-4 focus-visible:ring-offset-[#07111f]"

              render={
                <a href={links.dashboard}>
                  {t("landing.hero.openDashboard")}
                  <ArrowUpRight className="size-4" />
                </a>
              }
              nativeButton={false}
            />
          </div>

          <p className="mt-5 text-sm leading-6 text-[#91a4bf] sm:mt-6">
            {t("landing.hero.trustLine")}
          </p>
        </div>

        <div className="broadcast-hero-product relative min-w-0 self-center">
          <div
            aria-hidden="true"
            className="absolute -left-4 top-5 hidden size-20 rounded-full border-[12px] border-[#35d3e4]/80 sm:block lg:-left-10 lg:size-24 lg:border-[14px]"
          />
          <div
            aria-hidden="true"
            className="absolute -right-3 -top-4 grid size-16 place-items-center rounded-full bg-[#ffbd3f]/90 text-[#07111f] sm:-right-6 sm:-top-7 sm:size-24 lg:size-28"
          >
            <span className="size-4 rounded-full bg-current sm:size-6" />
          </div>
          <div
            aria-hidden="true"
            className="absolute -bottom-2 right-8 hidden gap-2 sm:flex lg:right-16"
          >
            <span className="size-4 rounded-full bg-[#ff665b]" />
            <span className="size-4 rounded-full bg-[#35d3e4]" />
            <span className="size-4 rounded-full bg-[#c8f135]" />
          </div>

          <ProductWindow
            src="/screenshots/dashboard-current.png"
            srcSet="/screenshots/dashboard-current-640.jpg 640w, /screenshots/dashboard-current-960.jpg 960w, /screenshots/dashboard-current.png 1280w"
            alt={t("landing.hero.screenshotAlt")}
            caption={t("landing.hero.screenshotCaption")}
            priority
            className="relative shadow-[18px_24px_64px_rgba(0,0,0,0.38)]"
          />
        </div>
      </div>
    </section>
  );
}
