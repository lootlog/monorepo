"use client";

import { useTranslation } from "react-i18next";
import {
  LandingHeader,
  LandingFooter,
  HeroSection,
  FaqPanel,
  Testimonials,
} from "@/src/components/landing";

export function HomeContent() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30 selection:text-white flex flex-col overflow-x-hidden">
      <div className="fixed inset-0 z-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] brightness-100 contrast-150 mix-blend-overlay" />

      <div className="fixed inset-0 z-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      <div className="fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_top,var(--color-primary)_0%,transparent_50%)] opacity-[0.08] pointer-events-none" />

      <LandingHeader />

      <main className="flex-1 w-full relative z-10">
        <section className="px-4 md:px-6 lg:px-8 min-h-[calc(100vh-4rem)] flex flex-col justify-center max-w-7xl mx-auto">
          <HeroSection />
        </section>

        <div className="h-px w-full max-w-md mx-auto bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

        <section className="px-4 md:px-6 lg:px-8 py-32 max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-xs font-medium text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-md inline-block mb-4 tracking-wider uppercase">
              {t("landing.page.opinionsLabel")}
            </span>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tighter mb-4">
              {t("landing.page.opinionsTitle")}
            </h2>
            <p className="text-muted-foreground text-lg">
              {t("landing.page.opinionsSubtitle")}
            </p>
          </div>
          <Testimonials />
        </section>

        <div className="h-px w-full max-w-md mx-auto bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

        <section className="px-4 md:px-6 lg:px-8 py-32 max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-xs font-medium text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-md inline-block mb-4 tracking-wider uppercase">
              {t("landing.page.faqLabel")}
            </span>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tighter mb-4">
              {t("landing.page.faqTitle")}
            </h2>
          </div>
          <FaqPanel />
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
