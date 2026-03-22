"use client";

import Image from "next/image";
import { useTranslation } from "react-i18next";
import Bento, { type BentoCardProps } from "@lootlog/ui/components/bento";

export function FeaturesSection() {
  const { t } = useTranslation();

  const cardData: BentoCardProps[] = [
    {
      color: "var(--background)",
      title: t("landing.features.timers.title"),
      description: t("landing.features.timers.description"),
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
      title: t("landing.features.npcDetector.title"),
      description: t("landing.features.npcDetector.description"),
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
      title: t("landing.features.panel.title"),
      description: t("landing.features.panel.description"),
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
      title: t("landing.features.roles.title"),
      description: t("landing.features.roles.description"),
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
      title: t("landing.features.chat.title"),
      description: t("landing.features.chat.description"),
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
      title: t("landing.features.notifications.title"),
      description: t("landing.features.notifications.description"),
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
