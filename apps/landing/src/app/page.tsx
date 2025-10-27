import type { Metadata } from "next";
import type { JSX } from "react";
import { HeroSection } from "@/src/components/hero-section";
import { FeaturesSection } from "@/src/components/features-section";

export const metadata: Metadata = {
  title: "Lootlog.pl - Dodatek do Margonem",
  description:
    "Zaawansowany dodatek do gry Margonem, który automatycznie śledzi łupy i timery respawnu potworów.",
};

export default function Home(): JSX.Element {
  return (
    <div>
      <HeroSection />
      <FeaturesSection />
    </div>
  );
}
