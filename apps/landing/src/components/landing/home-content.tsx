import { useTranslation } from "react-i18next";

import { ClosingCta } from "@/src/components/landing/closing-cta";
import { FaqPanel } from "@/src/components/landing/faq-panel";
import { LandingFooter } from "@/src/components/landing/footer";
import { LandingHeader } from "@/src/components/landing/header";
import { HeroSection } from "@/src/components/landing/hero-section";
import { HowItWorks } from "@/src/components/landing/how-it-works";
import { ProductProof } from "@/src/components/landing/product-proof";
import { TrustRecord } from "@/src/components/landing/trust-record";

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
          className="bg-[var(--broadcast-ink)] py-16 lg:py-28"
        >
          <div className="landing-container grid items-start gap-8 md:grid-cols-[0.75fr_1.25fr] md:gap-10 lg:gap-20">
            <div>
              <h2
                id="faq-title"
                className="landing-heading-section max-w-xl text-balance text-[var(--broadcast-white)]"
              >
                {t("landing.page.faqTitle")}
              </h2>
              <p className="mt-6 max-w-[58ch] text-base leading-7 sm:text-lg sm:leading-8 text-[var(--broadcast-text-muted)]">
                {t("landing.page.faqDescription")}
              </p>
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
