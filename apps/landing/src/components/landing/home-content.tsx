import { ArrowUpRight } from "lucide-react";
import { useTranslation } from "react-i18next";

import { ClosingCta } from "@/src/components/landing/closing-cta";
import { FaqPanel } from "@/src/components/landing/faq-panel";
import { LandingFooter } from "@/src/components/landing/footer";
import { LandingHeader } from "@/src/components/landing/header";
import { HeroSection } from "@/src/components/landing/hero-section";
import { HowItWorks } from "@/src/components/landing/how-it-works";
import { ProductProof } from "@/src/components/landing/product-proof";
import { TrustRecord } from "@/src/components/landing/trust-record";
import { links } from "@/src/config/links";

export function HomeContent() {
  const { t } = useTranslation();

  return (
    <div className="relative min-h-screen overflow-x-clip bg-[var(--broadcast-ink)] text-[var(--broadcast-white)] selection:bg-[var(--broadcast-lime)] selection:text-[var(--broadcast-ink)]">
      <LandingHeader />

      <main>
        <HeroSection />
        <ProductProof />
        <HowItWorks />
        <TrustRecord />

        <section
          id="faq"
          aria-labelledby="faq-title"
          className="landing-section bg-[var(--broadcast-ink)]"
        >
          <div className="landing-container grid items-start gap-8 md:grid-cols-[0.75fr_1.25fr] md:gap-10 lg:gap-20">
            <div>
              <h2
                id="faq-title"
                className="landing-heading-section max-w-xl text-balance text-[var(--broadcast-white)]"
              >
                {t("landing.faq.title")}
              </h2>
              <p className="landing-lead mt-6 text-[var(--broadcast-text-muted)]">
                {t("landing.faq.description")}
              </p>
              <a
                href={links.discord}
                target="_blank"
                rel="noopener noreferrer"
                className="landing-footer-link mt-3 font-semibold text-[var(--broadcast-white)]"
              >
                {t("landing.faq.discord")}
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </a>
            </div>
            <FaqPanel />
          </div>
        </section>

        <ClosingCta />
      </main>

      <LandingFooter />
    </div>
  );
}
