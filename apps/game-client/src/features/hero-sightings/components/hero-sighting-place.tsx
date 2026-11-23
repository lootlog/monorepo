import { cn } from "cn";
import { useTranslation } from "react-i18next";
import type { HeroSightingResponseDto } from "@lootlog/client/main";
import { isHeroSightingStale } from "@lootlog/domain/hero-sightings";

type HeroSightingPlaceProps = {
  sighting: Pick<
    HeroSightingResponseDto,
    "state" | "mapName" | "lastSeenAt" | "closeReason"
  >;
  isCurrent: boolean;
  now: number;
};

export function HeroSightingPlace({
  sighting,
  isCurrent,
  now,
}: HeroSightingPlaceProps) {
  const { t } = useTranslation("heroSightings");
  const isStale = isCurrent && isHeroSightingStale(sighting, now);

  const status = sighting.closeReason
    ? t(`status.${sighting.closeReason}`)
    : isStale
      ? t("status.unconfirmed")
      : null;

  return (
    <span className="ll:flex ll:min-w-0 ll:items-baseline ll:justify-between ll:gap-1">
      <span className="ll:min-w-0 ll:flex-1 ll:break-words">
        <span className="ll:font-normal ll:text-muted-foreground">
          {t(`state.${sighting.state}`)}{" "}
        </span>
        <span
          className={
            isCurrent && sighting.state === "SPAWNING"
              ? "ll:text-green-300"
              : "ll:text-foreground"
          }
        >
          {sighting.mapName}
        </span>
      </span>
      {status ? (
        <span
          className={cn(
            "ll:shrink-0",
            sighting.closeReason ? "ll:text-red-400" : "ll:text-orange-300",
          )}
        >
          {status}
        </span>
      ) : null}
    </span>
  );
}
