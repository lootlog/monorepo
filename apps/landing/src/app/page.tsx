import { ADDON_URL } from "@/src/config/addon";
import { Metadata } from "next";
import { JSX } from "react";
import LiquidEther from "@lootlog/ui/components/liquid-ether-bg";
import Bento, { BentoCardProps } from "@lootlog/ui/components/bento";
import { Button } from "@lootlog/ui/components/button";
import { PageHeader } from "@/src/components/page-header";

export const metadata: Metadata = {
  title: "Lootlog.pl - Dodatek do Margonem",
  description:
    "Zaawansowany dodatek do gry Margonem, który automatycznie śledzi łupy i timery respawnu potworów.",
};

const cardData: BentoCardProps[] = [
  {
    color: "var(--background)",
    title: "Timery respawnu",
    description: "Śledzenie czasów respawnu potworów w czasie rzeczywistym.",
    image: (
      <img
        src="/screenshots/timers.png"
        alt="Screenshot - Interfejs Timera Respawnu"
        className="rounded-lg"
      />
    ),
  },
  {
    color: "var(--background)",
    title: "Wykrywacz NPC",
    description:
      "Automatyczne wykrywanie potworów na mapie z informacjami o typie i poziomie.",
    image: (
      <img
        src="/screenshots/detector.png"
        alt="Screenshot - Interfejs Wykrywacza NPC"
        className="rounded-lg"
      />
    ),
  },
  {
    color: "var(--background)",
    title: "Panel Lootloga",
    description: "Wyświetlanie, wyszukiwanie i filtrowanie zebranych łupów.",
    image: (
      <img
        src="/screenshots/dashboard.png"
        alt="Screenshot - Interfejs Panelu Lootloga"
        className="rounded-lg"
      />
    ),
  },
  {
    color: "var(--background)",
    title: "Zarządzanie rolami",
    description: "Rozbudowane zarządzanie rolami i uprawnieniami w klanie.",
    image: (
      <img
        src="/screenshots/roles.png"
        alt="Screenshot - Interfejs Zarządzania Rolami"
        className="rounded-lg"
      />
    ),
  },
  {
    color: "var(--background)",
    title: "Chat",
    description:
      "Szybka komunikacja z członkami klanu dzięki wbudowanemu chatowi.",
    image: (
      <img
        src="/screenshots/chat.png"
        alt="Screenshot - Interfejs Chatu"
        className="rounded-lg"
      />
    ),
  },
  {
    color: "var(--background)",
    title: "Powiadomienia",
    description: "Natychmiastowe powiadomienia o ważnych wydarzeniach w grze.",
    image: (
      <img
        src="/screenshots/notifications.png"
        alt="Screenshot - Interfejs Powiadomień"
        className="w-full h-auto rounded-lg"
      />
    ),
  },
];

export default function Home(): JSX.Element {
  return (
    <div>
      <section
        style={{
          width: "100%",
          height: "100dvh",
          position: "relative",
        }}
      >
        <LiquidEther
          colors={["#5227FF", "#C786EC", "#AB2FEE"]}
          mouseForce={20}
          cursorSize={100}
          isViscous={true}
          viscous={30}
          iterationsViscous={32}
          iterationsPoisson={32}
          resolution={0.5}
          isBounce={false}
          autoDemo={true}
          autoSpeed={0.5}
          autoIntensity={2.6}
          takeoverDuration={0.25}
          autoResumeDelay={3000}
          autoRampDuration={0.6}
          BFECC={true}
          // dt={0.001666}
        />
        <div className="absolute inset-0 px-4 pointer-events-auto lg:pointer-events-none">
          <PageHeader />
          <div className="max-w-6xl mx-auto text-center flex flex-col items-center justify-center h-[calc(100dvh-4rem)]">
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
              <span className="bg-white bg-clip-text text-transparent hover:bg-white">
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
                className="bg-white/80 text-background pointer-events-auto hover:bg-white/100"
                asChild
              >
                <a href="/docs">Dokumentacja</a>
              </Button>
            </div>
          </div>
        </div>
      </section>
      <section className="pt-16 pb-16 flex flex-col items-center justify-center">
        <Bento
          textAutoHide={false}
          enableStars={false}
          enableSpotlight={true}
          enableBorderGlow={true}
          enableTilt={false}
          enableMagnetism={false}
          clickEffect={false}
          spotlightRadius={200}
          particleCount={2}
          glowColor="132, 0, 255"
          cardData={cardData}
        />
      </section>
    </div>
  );
}
