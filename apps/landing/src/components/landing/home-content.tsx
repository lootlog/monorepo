import { ArrowUpRight, MessageCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

import { ClosingCta } from "@/components/landing/closing-cta";
import { EcosystemShowcase } from "@/components/landing/ecosystem-showcase";
import { FaqPanel } from "@/components/landing/faq-panel";
import { GuidesShowcase } from "@/components/landing/guides-showcase";
import { LandingFooter } from "@/components/landing/footer";
import { LandingHeader } from "@/components/landing/header";
import { SITE_CONTENT_ID } from "@/components/site-layout";
import { SkipLink } from "@lootlog/ui/components/skip-link";
import { HeroSection } from "@/components/landing/hero-section";
import { HowItWorks } from "@/components/landing/how-it-works";
import { ProductProof } from "@/components/landing/product-proof";
import { TrustRecord } from "@/components/landing/trust-record";
import { links } from "@/config/links";

export function HomeContent() {
  const { t } = useTranslation();

  return (
    <div className="relative min-h-screen overflow-x-clip bg-[var(--broadcast-ink)] text-[var(--broadcast-white)]">
      <SkipLink target={SITE_CONTENT_ID}>{t("landing.skipToContent")}</SkipLink>
      <LandingHeader />

      <main id={SITE_CONTENT_ID} tabIndex={-1} className="outline-none">
        <HeroSection />
        <ProductProof />
        <HowItWorks />
        <GuidesShowcase />
        <EcosystemShowcase />
        <TrustRecord />

        <section
          id="faq"
          aria-labelledby="faq-title"
          className="landing-section bg-[var(--broadcast-ink)]"
        >
          <div className="landing-container grid items-start gap-8 md:grid-cols-[0.75fr_1.25fr] md:gap-10 lg:gap-20">
            <div className="md:sticky md:top-28">
              <h2
                id="faq-title"
                className="landing-heading-section max-w-xl text-balance text-[var(--broadcast-white)]"
              >
                {t("landing.faq.title")}
              </h2>
              <div className="landing-callout mt-10">
                <span
                  aria-hidden="true"
                  className="landing-shape landing-ring"
                />
                <span className="landing-badge">
                  <MessageCircle className="size-5" aria-hidden="true" />
                </span>
                <p>{t("landing.faq.description")}</p>
                <a
                  href={links.discord}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="landing-action landing-action-light"
                >
                  {t("landing.faq.discord")}
                  <ArrowUpRight
                    className="landing-action-arrow size-4"
                    aria-hidden="true"
                  />
                </a>
              </div>
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
