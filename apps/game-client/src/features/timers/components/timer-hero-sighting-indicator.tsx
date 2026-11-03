import { cn } from "cn";
import { Radar } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { HeroSighting } from "@/api/hero-sightings.api";

/** Marks a hero timer whose hero a detector placed on a map. */
export function TimerHeroSightingIndicator({
  sighting,
  decorative = false,
}: {
  sighting: HeroSighting;
  decorative?: boolean;
}) {
  const { t } = useTranslation(["timers", "heroSightings"]);

  const label = decorative
    ? undefined
    : t("tooltip.heroSightingMap", {
        state: t(`state.${sighting.state}`, { ns: "heroSightings" }),
        map: sighting.mapName,
      });

  return (
    <Radar
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn(
        "ll:inline ll:size-[0.9em] ll:align-[-0.1em]",
        sighting.state === "ROAMING" ? "ll:text-amber-300" : "ll:text-sky-300",
      )}
    />
  );
}
