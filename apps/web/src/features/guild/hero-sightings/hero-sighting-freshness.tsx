import type { HeroSightingResponseDto } from "@lootlog/client/main";
import { HERO_SIGHTING_STALE_AFTER_MS } from "@lootlog/domain/hero-sightings";
import { Progress, ProgressLabel } from "@lootlog/ui/components/progress";
import { useTranslation } from "react-i18next";
import { getHeroSightingMinutesUntilStale } from "./hero-sighting-status";

const STALE_AFTER_MINUTES = HERO_SIGHTING_STALE_AFTER_MS / 60_000;

type HeroSightingFreshnessProps = {
  sighting: HeroSightingResponseDto;
  now: number;
};

/**
 * How long a roaming hero's last confirmation can still be trusted, draining
 * until the board calls it unconfirmed.
 */
export const HeroSightingFreshness = ({
  sighting,
  now,
}: HeroSightingFreshnessProps) => {
  const { t } = useTranslation();
  const minutes = getHeroSightingMinutesUntilStale(sighting, now);

  return (
    <Progress
      value={minutes}
      max={STALE_AFTER_MINUTES}
      variant="live"
      className="flex-nowrap items-center gap-3"
    >
      <ProgressLabel className="order-last shrink-0 text-xs font-normal text-muted-foreground tabular-nums">
        {t("heroSightings.staleIn", { minutes })}
      </ProgressLabel>
    </Progress>
  );
};
