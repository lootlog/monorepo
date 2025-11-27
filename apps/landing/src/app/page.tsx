import type { Metadata } from "next";
import type { JSX } from "react";
import {
  LandingHeader,
  LandingFooter,
  HeroSection,
  QuickStartSection,
  FaqPanel,
  Testimonials,
} from "@/src/components/landing";
import { Separator } from "@lootlog/ui/components/separator";

export const metadata: Metadata = {
  title: "Lootlog.pl - Dodatek do Margonem",
  description:
    "Zaawansowany dodatek do gry Margonem, który automatycznie śledzi łupy i timery respawnu potworów.",
};

export default function Home(): JSX.Element {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30 selection:text-white flex flex-col">
      <LandingHeader />

      <main className="flex-1 w-full space-y-8">
        <section className="px-4 md:px-6 lg:px-8 py-16 max-w-7xl mx-auto">
          <HeroSection />
        </section>

        <Separator />

        <section className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
          <QuickStartSection />
        </section>

        <Separator />

        <section className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
          <Testimonials />
        </section>

        <Separator />

        <section className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
          <FaqPanel />
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
