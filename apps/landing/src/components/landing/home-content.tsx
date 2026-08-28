import { useTranslation } from "react-i18next";

import { BroadcastSpine } from "@/src/components/landing/broadcast-spine";
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
    <div className="relative min-h-screen overflow-x-clip bg-[#07111f] text-[#f7f8f2] selection:bg-[#c8f135] selection:text-[#07111f]">
      <BroadcastSpine />
      <LandingHeader />

      <main>
        <HeroSection />
        <ProductProof />
        <HowItWorks />
        <TrustRecord />

        <section
          id="faq"
          aria-labelledby="faq-title"
          className="bg-[#0d1a2c] px-5 py-16 sm:px-8 lg:py-28"
        >
          <div className="mx-auto grid max-w-[90rem] gap-12 lg:grid-cols-[0.7fr_1.3fr] lg:gap-20">
            <div>
              <h2
                id="faq-title"
                className="broadcast-display max-w-xl text-balance text-4xl font-black leading-[0.98] tracking-[-0.035em] text-[#f7f8f2] sm:text-6xl"
              >
                {t("landing.page.faqTitle")}
              </h2>
              <p className="mt-6 max-w-[58ch] text-lg leading-8 text-[#aebed4]">
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
