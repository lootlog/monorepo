"use client";

import { ADDON_URL } from "@/src/config/addon";
import { Button } from "@lootlog/ui/components/button";
import Aurora from "@lootlog/ui/components/aurora";
import { PageHeader } from "./page-header";

export function HeroSection() {
  return (
    <section className="w-full h-screen relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background">
        <Aurora
          colorStops={["#5227FF", "#C786EC", "#AB2FEE"]}
          amplitude={1.2}
          blend={0.6}
          speed={0.8}
        />
      </div>

      <div className="absolute inset-0 px-4 pointer-events-auto lg:pointer-events-none">
        <PageHeader />
        <div className="max-w-6xl mx-auto text-center flex flex-col items-center justify-center h-[calc(100vh-4rem)]">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
            <span className="bg-gradient-to-r from-purple-400 via-violet-400 to-purple-500 bg-clip-text text-transparent">
              lootlog.pl
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
            Otwartoźródłowy, zaawansowany dodatek do gry Margonem, który
            automatycznie śledzi łupy i timery respawnu potworów, oraz ułatwia
            organizację w klanie.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href={ADDON_URL}>
              <Button className="pointer-events-auto">
                Zainstaluj dodatek
              </Button>
            </a>

            <Button
              className="bg-white/10 text-white backdrop-blur-sm pointer-events-auto hover:bg-white/20 border border-white/20"
              asChild
            >
              <a href="https://developer.lootlog.pl">Dokumentacja</a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
