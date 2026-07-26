"use client";

import Link from "next/link";
import { ArrowUpRight, Heart } from "lucide-react";
import { useTranslation } from "react-i18next";

import { links } from "@/src/config/links";
import { LootlogMark } from "./lootlog-mark";

export function LandingFooter() {
  const { t } = useTranslation();

  return (
    <footer className="bg-[#07111f] px-5 py-14 text-[#f7f8f2] sm:px-8 lg:py-20">
      <div className="mx-auto max-w-[90rem]">
        <div className="flex flex-col gap-10 border-b border-[#2b3b53] pb-12 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="flex items-center gap-2.5 text-3xl font-black tracking-[-0.035em]">
              <LootlogMark className="size-8 shrink-0 rounded-lg" />
              {t("landing.header.brand")}
            </p>
            <p className="mt-3 max-w-sm text-sm leading-6 text-[#91a4bf]">
              {t("landing.hero.trustLine")}
            </p>
          </div>

          <nav
            aria-label={t("landing.footer.navigationLabel")}
            className="grid grid-cols-2 gap-x-10 gap-y-2 text-sm font-semibold text-[#b9c8de] sm:grid-cols-3"
          >
            <a
              href={links.docs}
              className="inline-flex min-h-11 items-center gap-1 rounded-md transition-colors hover:text-[#c8f135] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c8f135] focus-visible:ring-offset-4 focus-visible:ring-offset-[#07111f]"
            >
              {t("landing.footer.docs")}
              <ArrowUpRight className="size-3.5" />
            </a>
            <a
              href={links.discord}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-1 rounded-md transition-colors hover:text-[#c8f135] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c8f135] focus-visible:ring-offset-4 focus-visible:ring-offset-[#07111f]"
            >
              {t("landing.footer.discord")}
              <ArrowUpRight className="size-3.5" />
            </a>
            <a
              href={links.github}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-1 rounded-md transition-colors hover:text-[#c8f135] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c8f135] focus-visible:ring-offset-4 focus-visible:ring-offset-[#07111f]"
            >
              {t("landing.footer.github")}
              <ArrowUpRight className="size-3.5" />
            </a>
            <Link
              href="/privacy-policy"
              className="inline-flex min-h-11 items-center rounded-md transition-colors hover:text-[#c8f135] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c8f135] focus-visible:ring-offset-4 focus-visible:ring-offset-[#07111f]"
            >
              {t("landing.footer.privacy")}
            </Link>
            <Link
              href="/terms-of-service"
              className="inline-flex min-h-11 items-center rounded-md transition-colors hover:text-[#c8f135] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c8f135] focus-visible:ring-offset-4 focus-visible:ring-offset-[#07111f]"
            >
              {t("landing.footer.terms")}
            </Link>
            <a
              href={links.support}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#ff665b]/10 px-3 font-bold text-[#ff9a92] transition-[background-color,color,transform] hover:bg-[#ff665b]/20 hover:text-[#ffc1bc] motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff665b] focus-visible:ring-offset-4 focus-visible:ring-offset-[#07111f]"
            >
              <Heart className="size-3.5 fill-current" />
              {t("landing.footer.support")}
            </a>
          </nav>
        </div>

        <div className="flex flex-col gap-4 pt-8 text-xs leading-5 text-[#7186a2] sm:flex-row sm:items-end sm:justify-between">
          <p className="max-w-3xl">{t("landing.footer.legalNotice")}</p>
          <p className="shrink-0">
            {t("landing.footer.copyright", {
              year: new Date().getFullYear(),
            })}
          </p>
        </div>
      </div>
    </footer>
  );
}
