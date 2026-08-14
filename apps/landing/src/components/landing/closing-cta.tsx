"use client";

import { ArrowUpRight, Download } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@lootlog/ui/components/button";

import { SignalRoute } from "@/src/components/landing/signal-route";
import { ADDON_URL } from "@/src/config/addon";
import { links } from "@/src/config/links";

export function ClosingCta() {
  const { t } = useTranslation();

  return (
    <section
      aria-labelledby="closing-cta-title"
      className="relative isolate overflow-hidden bg-[#ff665b] px-5 py-16 text-[#07111f] sm:px-8 sm:py-20 lg:py-28"
    >
      <SignalRoute
        color="lime"
        direction="left"
        className="-bottom-40 top-auto opacity-70"
      />
      <div
        aria-hidden="true"
        className="absolute -right-20 -top-20 size-72 rounded-full bg-[#f4f1e8]"
      />

      <div className="relative z-10 mx-auto max-w-[90rem]">
        <h2
          id="closing-cta-title"
          className="broadcast-display max-w-5xl text-balance text-5xl font-black leading-[0.94] tracking-[-0.04em] sm:text-7xl"
        >
          {t("landing.closingCta.title")}
        </h2>
        <div className="mt-9 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <p className="max-w-[65ch] text-lg leading-8 text-[#44211f]">
            {t("landing.closingCta.description")}
          </p>
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
            <Button
              size="lg"
              className="h-14 rounded-xl bg-[#07111f] px-6 text-base font-bold text-white shadow-[8px_12px_28px_rgba(67,19,15,0.2)] transition-[background-color,transform] hover:bg-[#10233f] motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-0 focus-visible:ring-2 focus-visible:ring-[#c8f135] focus-visible:ring-offset-4 focus-visible:ring-offset-[#ff665b]"

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
              className="h-14 rounded-xl border-2 border-[#07111f] bg-transparent px-6 text-base font-bold text-[#07111f] transition-[background-color,color,transform] hover:bg-[#07111f] hover:text-white motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-0 focus-visible:ring-2 focus-visible:ring-[#c8f135] focus-visible:ring-offset-4 focus-visible:ring-offset-[#ff665b]"

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
