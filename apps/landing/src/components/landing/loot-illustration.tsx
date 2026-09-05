import { Gem, Shield, Sword } from "lucide-react";
import { useTranslation } from "react-i18next";

const items = [
  { key: "sword", icon: Sword, color: "bg-[#c8f135]" },
  { key: "shield", icon: Shield, color: "bg-[#35d3e4]" },
  { key: "gem", icon: Gem, color: "bg-[#ffbd3f]" },
] as const;

export function LootIllustration() {
  const { t } = useTranslation();

  return (
    <figure className="relative py-8">
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {items.map(({ key, icon: Icon, color }, index) => (
          <div
            key={key}
            className={`rounded-2xl border-2 border-[#27407c] bg-[#0a1734] p-3 text-[#f7f8f2] sm:p-5 ${index === 1 ? "-translate-y-6" : ""}`}
          >
            <div
              className={`grid aspect-square place-items-center rounded-xl text-[#07111f] ${color}`}
            >
              <Icon
                className="size-12 sm:size-16"
                strokeWidth={1.5}
                aria-hidden="true"
              />
            </div>
            <p className="mt-4 break-words text-xs font-bold sm:text-sm">
              {t(`landing.illustrations.items.${key}`)}
            </p>
            <div
              className="mt-3 h-1.5 w-2/3 rounded-full bg-[#f7f8f2]/20"
              aria-hidden="true"
            />
          </div>
        ))}
      </div>
      <figcaption className="mt-5 text-center text-xs font-medium text-[#b7c6ee]">
        {t("landing.illustrations.example")}
      </figcaption>
    </figure>
  );
}
