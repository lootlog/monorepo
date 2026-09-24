import { Gem, Shield, Sword } from "lucide-react";
import { useTranslation } from "react-i18next";

const items = [
  { key: "sword", icon: Sword, color: "bg-[var(--broadcast-lime)]" },
  { key: "shield", icon: Shield, color: "bg-[var(--broadcast-cyan)]" },
  { key: "gem", icon: Gem, color: "bg-[var(--broadcast-amber)]" },
] as const;

export function LootIllustration() {
  const { t } = useTranslation();

  return (
    <figure className="relative pt-8">
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {items.map(({ key, icon: Icon, color }, index) => (
          <div
            key={key}
            className={`rounded-2xl border-2 border-[var(--broadcast-navy-line)] bg-[var(--broadcast-navy-deep)] p-2.5 text-[var(--broadcast-white)] sm:p-5 ${index === 1 ? "-translate-y-6" : ""}`}
          >
            <div
              className={`grid aspect-square place-items-center rounded-xl text-[var(--broadcast-ink)] ${color}`}
            >
              <Icon
                className="size-12 sm:size-16"
                strokeWidth={1.5}
                aria-hidden="true"
              />
            </div>
            <p className="mt-4 hyphens-auto text-xs font-bold sm:text-sm">
              {t(`landing.illustrations.items.${key}`)}
            </p>
            <div
              className="mt-3 h-1.5 w-2/3 rounded-full bg-[var(--broadcast-white)]/20"
              aria-hidden="true"
            />
          </div>
        ))}
      </div>
      <figcaption className="landing-caption text-[var(--broadcast-navy-muted)]">
        {t("landing.illustrations.example")}
      </figcaption>
    </figure>
  );
}
