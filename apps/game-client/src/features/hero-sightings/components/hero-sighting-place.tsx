import { cn } from "cn";
import { useTranslation } from "react-i18next";
import type { HeroSightingResponseDto } from "@lootlog/client/main";
import { isHeroSightingStale } from "@lootlog/domain/hero-sightings";
import { TruncatedText } from "@/components/truncated-text";

type HeroSightingPlaceProps = {
  sighting: Pick<
    HeroSightingResponseDto,
    "state" | "mapName" | "lastSeenAt" | "closeReason"
  >;
  isCurrent: boolean;
  now: number;
};

/**
 * Where the hero roams or will spawn, and why the sighting no longer holds:
 * ended, or a roaming hero nobody has confirmed lately.
 */
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
    <span className="ll:flex ll:min-w-0 ll:items-baseline ll:gap-1">
      <span className="ll:shrink-0 ll:font-normal ll:text-muted-foreground">
        {t(`state.${sighting.state}`)}
      </span>
      <TruncatedText
        className={
          isCurrent && !isStale ? "ll:text-green-300" : "ll:text-white"
        }
      >
        {sighting.mapName}
      </TruncatedText>
      {status ? (
        <span
          className={cn(
            "ll:ml-auto ll:shrink-0",
            sighting.closeReason ? "ll:text-red-400" : "ll:text-orange-300",
          )}
        >
          {status}
        </span>
      ) : null}
    </span>
  );
}
