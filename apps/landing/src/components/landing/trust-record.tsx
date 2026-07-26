"use client";

import { ArrowUpRight, Check, Code2, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";

import { links } from "@/src/config/links";

const trustKeys = [
  "free",
  "openSource",
  "discordAccount",
  "multiWorld",
] as const;

export function TrustRecord() {
  const { t } = useTranslation();

  return (
    <section
      id="trust"
      aria-labelledby="trust-record-title"
      className="bg-[#ffbd3f] px-5 py-16 text-[#0a1830] sm:px-8 sm:py-20 lg:py-28"
    >
      <div className="mx-auto grid max-w-[90rem] gap-14 lg:grid-cols-[0.82fr_1.18fr] lg:gap-24">
        <div>
          <ShieldCheck className="size-12" strokeWidth={2.4} />
          <h2
            id="trust-record-title"
            className="broadcast-display mt-8 max-w-2xl text-balance text-4xl font-black leading-[0.98] tracking-[-0.035em] sm:text-6xl"
          >
            {t("landing.trust.title")}
          </h2>
          <p className="mt-6 max-w-[64ch] text-lg leading-8 text-[#394251]">
            {t("landing.trust.description")}
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <a
              href={links.github}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#0a1830] px-5 text-sm font-bold text-white shadow-[8px_12px_28px_rgba(92,57,0,0.18)] transition-[background-color,transform] hover:bg-[#142746] motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3157f6] focus-visible:ring-offset-4 focus-visible:ring-offset-[#ffbd3f]"
            >
              <Code2 className="size-4" />
              {t("landing.trust.github")}
            </a>
            <a
              href={links.docs}
              className="inline-flex min-h-12 items-center gap-2 rounded-xl border-2 border-[#0a1830] px-5 text-sm font-bold transition-[background-color,color,transform] hover:bg-[#0a1830] hover:text-white motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3157f6] focus-visible:ring-offset-4 focus-visible:ring-offset-[#ffbd3f]"
            >
              {t("landing.trust.docs")}
              <ArrowUpRight className="size-4" />
            </a>
          </div>
        </div>

        <ul className="border-t border-[#0a1830]">
          {trustKeys.map((key) => (
            <li
              key={key}
              className="grid gap-3 border-b border-[#0a1830] py-6 sm:grid-cols-[1fr_1.35fr] sm:gap-8"
            >
              <h3 className="flex items-center gap-3 text-xl font-black tracking-[-0.025em]">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#0a1830] text-[#ffbd3f]">
                  <Check className="size-4" strokeWidth={3} />
                </span>
                {t(`landing.trust.items.${key}.title`)}
              </h3>
              <p className="pl-10 text-base leading-7 text-[#394251] sm:pl-0">
                {t(`landing.trust.items.${key}.description`)}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
