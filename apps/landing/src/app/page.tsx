import type { Metadata } from "next";
import type { JSX } from "react";
import {
  LandingHeader,
  LandingFooter,
  HeroSection,
  FaqPanel,
  Testimonials,
} from "@/src/components/landing";

export const metadata: Metadata = {
  title: "Lootlog.pl - Dodatek do Margonem",
  description:
    "Zaawansowany dodatek do gry Margonem, który automatycznie śledzi łupy i timery respawnu potworów.",
};

export default function Home(): JSX.Element {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30 selection:text-white flex flex-col overflow-x-hidden">
      <div className="fixed inset-0 z-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] brightness-100 contrast-150 mix-blend-overlay" />

      <div className="fixed inset-0 z-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      <LandingHeader />

      <main className="flex-1 w-full relative z-10">
        <section className="px-4 md:px-6 lg:px-8 min-h-[calc(100vh-4rem)] flex flex-col justify-center max-w-7xl mx-auto">
          <HeroSection />
        </section>

        <section className="px-4 md:px-6 lg:px-8 py-24 max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tighter mb-4">
              Co mówią gracze?
            </h2>
            <p className="text-muted-foreground text-lg">
              Dołącz do tysięcy zadowolonych użytkowników.
            </p>
          </div>
          <Testimonials />
        </section>

        <section className="px-4 md:px-6 lg:px-8 py-24 max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tighter mb-4">
              Częste pytania
            </h2>
          </div>
          <FaqPanel />
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
