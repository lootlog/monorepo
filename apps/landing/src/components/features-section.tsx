import Image from "next/image";
import Bento, { type BentoCardProps } from "@lootlog/ui/components/bento";

const cardData: BentoCardProps[] = [
  {
    color: "var(--background)",
    title: "Timery respawnu",
    description: "Śledzenie czasów respawnu potworów w czasie rzeczywistym.",
    image: (
      <Image
        src="/screenshots/timers.png"
        alt="Screenshot - Interfejs Timera Respawnu"
        className="rounded-lg"
        width={800}
        height={600}
      />
    ),
  },
  {
    color: "var(--background)",
    title: "Wykrywacz NPC",
    description:
      "Automatyczne wykrywanie potworów na mapie z informacjami o typie i poziomie.",
    image: (
      <Image
        src="/screenshots/detector.png"
        alt="Screenshot - Interfejs Wykrywacza NPC"
        className="rounded-lg"
        width={800}
        height={600}
      />
    ),
  },
  {
    color: "var(--background)",
    title: "Panel Lootloga",
    description: "Wyświetlanie, wyszukiwanie i filtrowanie zebranych łupów.",
    image: (
      <Image
        src="/screenshots/dashboard.png"
        alt="Screenshot - Interfejs Panelu Lootloga"
        className="rounded-lg"
        width={800}
        height={600}
      />
    ),
  },
  {
    color: "var(--background)",
    title: "Zarządzanie rolami",
    description: "Rozbudowane zarządzanie rolami i uprawnieniami w klanie.",
    image: (
      <Image
        src="/screenshots/roles.png"
        alt="Screenshot - Interfejs Zarządzania Rolami"
        className="rounded-lg"
        width={800}
        height={600}
      />
    ),
  },
  {
    color: "var(--background)",
    title: "Chat",
    description:
      "Szybka komunikacja z członkami klanu dzięki wbudowanemu chatowi.",
    image: (
      <Image
        src="/screenshots/chat.png"
        alt="Screenshot - Interfejs Chatu"
        className="rounded-lg"
        width={800}
        height={600}
      />
    ),
  },
  {
    color: "var(--background)",
    title: "Powiadomienia",
    description: "Natychmiastowe powiadomienia o ważnych wydarzeniach w grze.",
    image: (
      <Image
        src="/screenshots/notifications.png"
        alt="Screenshot - Interfejs Powiadomień"
        className="w-full h-auto rounded-lg"
        width={800}
        height={600}
      />
    ),
  },
];

export function FeaturesSection() {
  return (
    <section className="pt-16 pb-16 flex flex-col items-center justify-center">
      <Bento
        textAutoHide={false}
        enableStars={false}
        enableSpotlight
        enableBorderGlow
        enableTilt={false}
        enableMagnetism={false}
        clickEffect={false}
        spotlightRadius={200}
        particleCount={2}
        glowColor="132, 0, 255"
        cardData={cardData}
      />
    </section>
  );
}
