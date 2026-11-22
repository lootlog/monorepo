import { cn } from "cn";
import { Radar } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { HeroSightingResponseDto } from "@lootlog/client/main";

export function TimerHeroSightingIndicator({
  sighting,
  unconfirmed,
  decorative = false,
}: {
  sighting: HeroSightingResponseDto;
  unconfirmed: boolean;
  decorative?: boolean;
}) {
  const { t } = useTranslation(["timers", "heroSightings"]);

  const label = decorative
    ? undefined
    : t(
        unconfirmed
          ? "tooltip.heroSightingMapUnconfirmed"
          : "tooltip.heroSightingMap",
        {
          state: t(`state.${sighting.state}`, { ns: "heroSightings" }),
          map: sighting.mapName,
          status: t("status.unconfirmed", { ns: "heroSightings" }),
        },
      );

  return (
    <Radar
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn(
        "ll:inline ll:size-[0.9em] ll:align-[-0.1em]",
        sighting.state === "ROAMING" ? "ll:text-amber-300" : "ll:text-sky-300",
        unconfirmed && "ll:opacity-50",
      )}
    />
  );
}
